import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const ADMIN_EMAIL = 'michaeldmacri@gmail.com'

interface AdminSignupAlertProps {
  eventType?: string
  userEmail?: string
  householdName?: string
  tier?: string
  status?: string
  occurredAt?: string
}

const TIER_LABELS: Record<string, string> = {
  basic: 'Basic',
  family: 'Family',
  family_plus: 'Family Plus',
}

const AdminSignupAlert = ({
  eventType = 'signup',
  userEmail = 'unknown@example.com',
  householdName,
  tier,
  status,
  occurredAt,
}: AdminSignupAlertProps) => {
  const isPlan = eventType === 'plan'
  const tierLabel = tier ? TIER_LABELS[tier] ?? tier : 'None yet'
  const title = isPlan ? 'Plan selected' : 'New user signed up'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {title}: {userEmail}
        {isPlan ? ` — ${tierLabel}` : ''}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={brand}>Mia</Heading>
            <Text style={brandTag}>Admin activity alert</Text>
          </Section>

          <Section style={card}>
            <Heading style={h1}>{title}</Heading>

            <Hr style={hr} />

            <Text style={row}>
              <span style={label}>User</span>
              <span style={value}>{userEmail}</span>
            </Text>
            {householdName ? (
              <Text style={row}>
                <span style={label}>Household</span>
                <span style={value}>{householdName}</span>
              </Text>
            ) : null}
            <Text style={row}>
              <span style={label}>Plan</span>
              <span style={value}>{tierLabel}</span>
            </Text>
            {status ? (
              <Text style={row}>
                <span style={label}>Status</span>
                <span style={value}>{status}</span>
              </Text>
            ) : null}
            {occurredAt ? (
              <Text style={row}>
                <span style={label}>When</span>
                <span style={value}>{occurredAt}</span>
              </Text>
            ) : null}

            <Hr style={hr} />

            <Text style={muted}>
              See the full list of users and plans on your admin activity page
              at miafamilyassistant.com/admin/signups
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminSignupAlert,
  to: ADMIN_EMAIL,
  subject: (data: Record<string, any>) =>
    data?.eventType === 'plan'
      ? `Mia: plan selected — ${TIER_LABELS[data?.tier] ?? data?.tier ?? 'unknown'} (${data?.userEmail ?? 'user'})`
      : `Mia: new signup — ${data?.userEmail ?? 'user'}`,
  displayName: 'Admin signup / plan alert',
  previewData: {
    eventType: 'plan',
    userEmail: 'jane@example.com',
    householdName: 'The Smiths',
    tier: 'family',
    status: 'trialing',
    occurredAt: '2026-08-22 15:30 ET',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 20px', maxWidth: '560px' }
const header = { marginBottom: '16px' }
const brand = { fontSize: '26px', margin: '0', color: '#0b0b1a', letterSpacing: '-0.5px' }
const brandTag = { fontSize: '12px', margin: '2px 0 0', color: '#7a7a8c', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const card = { border: '1px solid #e6e6ef', borderRadius: '12px', padding: '24px' }
const h1 = { fontSize: '20px', margin: '0 0 4px', color: '#0b0b1a' }
const hr = { borderColor: '#eeeef5', margin: '16px 0' }
const row = { fontSize: '14px', margin: '0 0 10px', color: '#0b0b1a' }
const label = { display: 'inline-block', width: '110px', color: '#7a7a8c' }
const value = { fontWeight: 'bold' as const }
const muted = { fontSize: '12px', color: '#8b8b9c', margin: '0' }
