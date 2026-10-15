import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const TEMPLATE = 'payment-failed'

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payload = parts[1]
      .replaceAll('-', '+')
      .replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')
    return JSON.parse(atob(payload)) as Record<string, unknown>
  } catch {
    return null
  }
}

// Scheduled job. Invoked by pg_cron with the project key.
Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing required environment variables')
    return json({ error: 'Server configuration error' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  const claims = parseJwtClaims(authHeader.slice('Bearer '.length).trim())
  const role = claims?.role
  if (role !== 'service_role' && role !== 'anon') {
    return json({ error: 'Forbidden' }, 403)
  }

  const admin = createClient(supabaseUrl, serviceKey)

  // Paid households whose latest renewal charge failed.
  const { data: households, error: hhError } = await admin
    .from('households')
    .select('id, owner_user_id, current_period_end')
    .eq('subscription_status', 'past_due')
    .not('stripe_subscription_id', 'is', null)

  if (hhError) {
    console.error('Failed to load households', { message: hhError.message })
    return json({ error: 'Failed to load households' }, 500)
  }

  if (!households || households.length === 0) {
    return json({ success: true, sent: 0, skipped: 0 })
  }

  const nudged = new Set<string>()

  const { data: testers } = await admin.from('internal_testers').select('email')
  const testerEmails = new Set(
    (testers ?? []).map((t) => String(t.email).toLowerCase()),
  )

  let sent = 0
  let skipped = 0

  for (const hh of households) {
    const { data: userRes } = await admin.auth.admin.getUserById(hh.owner_user_id)
    const user = userRes?.user
    const email = user?.email?.toLowerCase()
    if (!email) {
      skipped++
      continue
    }
    if (nudged.has(email) || testerEmails.has(email)) {
      skipped++
      continue
    }
    nudged.add(email)

    const firstName =
      (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
      (user.user_metadata?.name as string | undefined)?.split(' ')[0] ||
      undefined

    try {
      const result = await sendTemplateEmail(TEMPLATE, email, {
        idempotencyKey: `${TEMPLATE}-${hh.id}-${hh.current_period_end}`,
        templateData: { firstName },
      })
      await admin.from('email_send_log').insert({
        template_name: TEMPLATE,
        recipient_email: email,
        status: result.sent ? 'sent' : 'suppressed',
      })
      if (result.sent) sent++
      else skipped++
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('Payment failed notice failed', { message })
      await admin.from('email_send_log').insert({
        template_name: TEMPLATE,
        recipient_email: email,
        status: 'failed',
        error_message: message.slice(0, 1000),
      })
      skipped++
    }
  }

  return json({ success: true, sent, skipped })
})
