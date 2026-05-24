import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Mia Family Assistant'
const APP_URL = 'https://miafamilyassistant.com'

interface HouseholdInviteProps {
  inviterName?: string
  householdName?: string
  inviteCode?: string
  inviteUrl?: string
  expiresAt?: string
}

const HouseholdInviteEmail = ({
  inviterName,
  householdName,
  inviteCode = 'XXXXXXXX',
  inviteUrl = `${APP_URL}/invite/${'XXXXXXXX'}`,
  expiresAt,
}: HouseholdInviteProps) => {
  const inviterLabel = inviterName ? inviterName : 'Someone'
  const householdLabel = householdName ? `"${householdName}"` : 'their household'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {inviterLabel} invited you to join {householdLabel} on {SITE_NAME}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={brand}>Mia</Heading>
            <Text style={brandTag}>Family Assistant</Text>
          </Section>

          <Section style={card}>
            <Heading style={h1}>You're invited to join {householdLabel}</Heading>
            <Text style={text}>
              {inviterLabel} added you to their household on {SITE_NAME} — a
              shared family assistant for calendars, groceries, tasks, and
              voice-powered reminders.
            </Text>

            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button style={button} href={inviteUrl}>
                Accept invite
              </Button>
            </Section>

            <Text style={smallLabel}>Your invite code</Text>
            <Section style={codeBox}>
              <Text style={codeText}>{inviteCode}</Text>
            </Section>

            <Text style={text}>
              Or paste this link into your browser:
              <br />
              <Link href={inviteUrl} style={link}>
                {inviteUrl}
              </Link>
            </Text>

            {expiresAt && (
              <Text style={muted}>This invite expires on {expiresAt}.</Text>
            )}
          </Section>

          <Hr style={hr} />

          <Section>
            <Heading style={h2}>How to get started</Heading>
            <Text style={text}>
              <strong>1.</strong> Click <em>Accept invite</em> above (or visit
              the link).
              <br />
              <strong>2.</strong> Create your account or sign in.
              <br />
              <strong>3.</strong> You'll be added to the household automatically.
            </Text>
            <Text style={muted}>
              You can use Mia from any browser at{' '}
              <Link href={APP_URL} style={link}>
                miafamilyassistant.com
              </Link>
              . Mobile apps are coming soon.
            </Text>
          </Section>

          <Text style={footer}>
            If you weren't expecting this invite, you can safely ignore this
            email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: HouseholdInviteEmail,
  subject: (data: Record<string, any>) => {
    const inviter = data?.inviterName ? data.inviterName : 'Someone'
    return `${inviter} invited you to ${SITE_NAME}`
  },
  displayName: 'Household invite',
  previewData: {
    inviterName: 'Alex',
    householdName: 'The Rivera Family',
    inviteCode: 'A1B2C3D4',
    inviteUrl: `${APP_URL}/invite/A1B2C3D4`,
    expiresAt: 'June 7, 2026',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 24px',
}
const header = { textAlign: 'center' as const, marginBottom: '24px' }
const brand = {
  fontSize: '32px',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  margin: 0,
  background: 'linear-gradient(90deg, #22d3ee 0%, #a78bfa 50%, #f0abfc 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  color: '#7c3aed',
}
const brandTag = {
  fontSize: '11px',
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
  color: '#64748b',
  margin: '4px 0 0',
}
const card = {
  backgroundColor: '#0f172a',
  borderRadius: '16px',
  padding: '32px 28px',
  color: '#e2e8f0',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#ffffff',
  margin: '0 0 16px',
  lineHeight: 1.3,
}
const h2 = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#0f172a',
  margin: '24px 0 12px',
}
const text = {
  fontSize: '15px',
  lineHeight: 1.6,
  color: '#cbd5e1',
  margin: '0 0 16px',
}
const button = {
  backgroundColor: '#7c3aed',
  backgroundImage: 'linear-gradient(90deg, #06b6d4 0%, #7c3aed 100%)',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '12px',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
}
const smallLabel = {
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.15em',
  color: '#94a3b8',
  margin: '20px 0 8px',
}
const codeBox = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  padding: '14px',
  textAlign: 'center' as const,
  margin: '0 0 16px',
}
const codeText = {
  fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '0.3em',
  color: '#22d3ee',
  margin: 0,
}
const link = { color: '#7c3aed', textDecoration: 'underline' }
const muted = { fontSize: '13px', color: '#94a3b8', margin: '12px 0 0' }
const hr = {
  border: 'none',
  borderTop: '1px solid #e2e8f0',
  margin: '32px 0',
}
const footer = {
  fontSize: '12px',
  color: '#94a3b8',
  textAlign: 'center' as const,
  margin: '32px 0 0',
}
