import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const TEMPLATE = 'admin-signup-alert'

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

// Called only by database triggers using the service-role key.
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
  if (claims?.role !== 'service_role') return json({ error: 'Forbidden' }, 403)

  let templateData: Record<string, unknown> = {}
  let idempotencyKey: string | undefined
  try {
    const body = await req.json()
    idempotencyKey = body.idempotencyKey
    if (body.templateData && typeof body.templateData === 'object') {
      templateData = body.templateData
    }
  } catch {
    return json({ error: 'Invalid JSON in request body' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey)

  // The template defines its own fixed admin recipient.
  const logSend = async (
    status: 'sent' | 'suppressed' | 'failed',
    recipient: string,
    errorMessage?: string,
  ) => {
    const { error } = await admin.from('email_send_log').insert({
      template_name: TEMPLATE,
      recipient_email: recipient,
      status,
      error_message: errorMessage ?? null,
    })
    if (error) console.error('Failed to write email_send_log', { code: error.code, message: error.message })
  }

  const recipient = 'admin'

  try {
    const result = await sendTemplateEmail(TEMPLATE, '', {
      idempotencyKey: idempotencyKey || `${TEMPLATE}-${crypto.randomUUID()}`,
      templateData,
    })

    if (!result.sent) {
      await logSend('suppressed', recipient)
      return json({ success: false, reason: 'recipient_suppressed' })
    }

    await logSend('sent', recipient)
    return json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Admin alert email failed', { message })
    await logSend('failed', recipient, message.slice(0, 1000))
    return json({ error: 'Failed to send admin alert' }, 500)
  }
})
