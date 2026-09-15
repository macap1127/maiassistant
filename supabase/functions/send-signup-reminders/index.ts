import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const TEMPLATE = 'finish-signup-reminder'
// Only nudge people who signed up at least this long ago, and stop nudging
// after this many days so we never email stale accounts.
const MIN_AGE_HOURS = 24
const MAX_AGE_DAYS = 30

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

// Scheduled job. Invoked by pg_cron with the service-role key.
Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing required environment variables')
    return json({ error: 'Server configuration error' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  const bearer = authHeader.slice('Bearer '.length).trim()
  const claims = parseJwtClaims(bearer)
  // pg_cron calls with the project key; end-user tokens are rejected.
  const role = claims?.role
  if (role !== 'service_role' && role !== 'anon') {
    return json({ error: 'Forbidden' }, 403)
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const now = Date.now()
  const cutoffNew = new Date(now - MIN_AGE_HOURS * 3600_000).toISOString()
  const cutoffOld = new Date(now - MAX_AGE_DAYS * 86_400_000).toISOString()

  const { data: households, error: hhError } = await admin
    .from('households')
    .select('id, owner_user_id, subscription_status, created_at')
    .eq('subscription_status', 'incomplete')
    .lt('created_at', cutoffNew)
    .gt('created_at', cutoffOld)

  if (hhError) {
    console.error('Failed to load households', { message: hhError.message })
    return json({ error: 'Failed to load households' }, 500)
  }

  if (!households || households.length === 0) {
    return json({ success: true, sent: 0, skipped: 0 })
  }

  // Already-nudged recipients (one reminder per address, ever).
  const { data: alreadySent } = await admin
    .from('email_send_log')
    .select('recipient_email')
    .eq('template_name', TEMPLATE)
  const nudged = new Set(
    (alreadySent ?? []).map((r) => String(r.recipient_email).toLowerCase()),
  )

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
    // Unconfirmed addresses get the confirmation email instead; don't pile on.
    if (!user?.email_confirmed_at) {
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
        idempotencyKey: `${TEMPLATE}-${hh.id}`,
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
      console.error('Signup reminder failed', { message })
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
