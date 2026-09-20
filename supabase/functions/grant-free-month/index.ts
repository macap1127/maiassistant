import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const TEMPLATE = 'free-month-access'
const FREE_DAYS = 30
const FREE_TIER = 'basic'
// Only auto-grant to accounts that have been stuck at plan selection this long,
// and never to accounts older than the upper bound (stale signups).
const MIN_AGE_DAYS = 5
const MAX_AGE_DAYS = 60

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

// Scheduled daily job (also admin-triggerable): grants a free month to every household that signed
// up but never chose a plan, then emails them about it.
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
  if (role !== 'service_role' && role !== 'anon') return json({ error: 'Forbidden' }, 403)

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: households, error: hhError } = await admin
    .from('households')
    .select('id, owner_user_id, subscription_status, created_at')
    .in('subscription_status', ['incomplete', 'incomplete_expired'])
    .lt('created_at', new Date(Date.now() - MIN_AGE_DAYS * 86_400_000).toISOString())
    .gt('created_at', new Date(Date.now() - MAX_AGE_DAYS * 86_400_000).toISOString())

  if (hhError) {
    console.error('Failed to load households', { message: hhError.message })
    return json({ error: 'Failed to load households' }, 500)
  }
  if (!households?.length) return json({ success: true, granted: 0, sent: 0, skipped: 0 })

  const { data: testers } = await admin.from('internal_testers').select('email')
  const testerEmails = new Set((testers ?? []).map((t) => String(t.email).toLowerCase()))

  const { data: alreadySent } = await admin
    .from('email_send_log')
    .select('recipient_email')
    .eq('template_name', TEMPLATE)
  const already = new Set(
    (alreadySent ?? []).map((r) => String(r.recipient_email).toLowerCase()),
  )

  const periodEnd = new Date(Date.now() + FREE_DAYS * 86_400_000)
  const endsOn = periodEnd.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })

  let granted = 0
  let sent = 0
  let skipped = 0

  for (const hh of households) {
    const { data: userRes } = await admin.auth.admin.getUserById(hh.owner_user_id)
    const user = userRes?.user
    const email = user?.email?.toLowerCase()
    if (!email || !user?.email_confirmed_at || testerEmails.has(email) || already.has(email)) {
      skipped++
      continue
    }

    const { error: updateError } = await admin
      .from('households')
      .update({
        subscription_tier: FREE_TIER,
        subscription_status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: true,
        access_locked: false,
      })
      .eq('id', hh.id)

    if (updateError) {
      console.error('Failed to grant free month', { message: updateError.message })
      skipped++
      continue
    }
    granted++
    already.add(email)

    const firstName =
      (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
      (user.user_metadata?.name as string | undefined)?.split(' ')[0] ||
      undefined

    try {
      const result = await sendTemplateEmail(TEMPLATE, email, {
        idempotencyKey: `${TEMPLATE}-${hh.id}`,
        templateData: { firstName, endsOn },
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
      console.error('Free month email failed', { message })
      await admin.from('email_send_log').insert({
        template_name: TEMPLATE,
        recipient_email: email,
        status: 'failed',
        error_message: message.slice(0, 1000),
      })
      skipped++
    }
  }

  return json({ success: true, granted, sent, skipped })
})
