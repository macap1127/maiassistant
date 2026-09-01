import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const PUBLIC_ORIGIN = 'https://miafamilyassistant.com'
const TEMPLATE = 'household-invite'

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing required environment variables')
    return json({ error: 'Server configuration error' }, 500)
  }

  let inviteId: string | undefined
  let inviterName: string | undefined
  try {
    const body = await req.json()
    inviteId = body.inviteId
    inviterName = typeof body.inviterName === 'string' ? body.inviterName.slice(0, 120) : undefined
  } catch {
    return json({ error: 'Invalid JSON in request body' }, 400)
  }

  if (!inviteId) return json({ error: 'inviteId is required' }, 400)

  const admin = createClient(supabaseUrl, serviceKey)

  // Identify the caller — the invite must belong to a household they are in.
  const authHeader = req.headers.get('Authorization') ?? ''
  const { data: userData } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  const user = userData?.user
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { data: invite, error: inviteError } = await admin
    .from('household_invites')
    .select('id, email, invite_code, expires_at, household_id')
    .eq('id', inviteId)
    .maybeSingle()

  if (inviteError || !invite) return json({ error: 'Invite not found' }, 404)
  if (!invite.email) return json({ error: 'Invite has no recipient' }, 400)

  const { data: membership } = await admin
    .from('household_members')
    .select('id')
    .eq('household_id', invite.household_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return json({ error: 'Forbidden' }, 403)

  const { data: household } = await admin
    .from('households')
    .select('name')
    .eq('id', invite.household_id)
    .maybeSingle()

  const recipient = String(invite.email)
  const expiresAt = invite.expires_at
    ? new Date(invite.expires_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : undefined

  const logSend = async (
    status: 'sent' | 'suppressed' | 'failed',
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

  try {
    const result = await sendTemplateEmail(TEMPLATE, recipient, {
      idempotencyKey: `${TEMPLATE}-${invite.id}`,
      templateData: {
        inviterName,
        householdName: household?.name,
        inviteCode: invite.invite_code,
        inviteUrl: `${PUBLIC_ORIGIN}/invite/${invite.invite_code}`,
        expiresAt,
      },
    })

    if (!result.sent) {
      await logSend('suppressed')
      return json({ success: false, reason: 'recipient_suppressed' })
    }

    await logSend('sent')
    return json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Household invite email failed', { message })
    await logSend('failed', message.slice(0, 1000))
    return json({ error: 'Failed to send invite email' }, 500)
  }
})
