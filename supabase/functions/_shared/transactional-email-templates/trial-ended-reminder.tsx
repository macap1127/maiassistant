import * as React from 'npm:react@18.3.1'
import {
  Body,
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

interface TrialEndedProps {
  firstName?: string
}

const TrialEndedReminderEmail = ({ firstName }: TrialEndedProps) => {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,'
  const url = `${APP_URL}/pricing`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your 7-day free trial has ended — choose a plan to continue</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={brand}>Mia</Heading>
            <Text style={brandTag}>Family Assistant</Text>
          </Section>

          <Section style={card}>
            <Heading style={h1}>Your free trial has ended</Heading>
            <Text style={text}>{greeting}</Text>
            <Text style={text}>
              Your 7-day free trial of {SITE_NAME} is over. To keep your family
              calendar, lists, receipts, and voice assistant, choose a plan.
              Payment begins immediately when you select a plan, there is no
              second trial, and your subscription renews automatically at the
              displayed interval until canceled.
            </Text>

            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <a style={button} href={url} target="_blank" rel="noopener noreferrer">
                Choose your plan
              </a>
            </Section>

            <Text style={text}>
              Or paste this link into your browser:
              <br />
              <Link href={url} style={link}>
                {url}
              </Link>
            </Text>
          </Section>

          <Hr style={hr} />

          <Section>
            <Heading style={h2}>Everything stays where you left it</Heading>
            <Text style={bodyText}>
              Your events, to-dos, grocery lists, and receipts are saved. Pick a
              plan and you're right back where you were.
            </Text>
          </Section>

          <Text style={footer}>
            You're receiving this because you created an account at
            miafamilyassistant.com. AI Blue Ribbon LLC, doing business as{' '}
            {SITE_NAME}.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TrialEndedReminderEmail,
  subject: 'Your Mia free trial has ended — pick a plan to continue',
  displayName: 'Trial ended reminder',
  previewData: { firstName: 'Alex' },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
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
const bodyText = {
  fontSize: '15px',
  lineHeight: 1.6,
  color: '#334155',
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
const link = { color: '#7c3aed', textDecoration: 'underline' }
const hr = { border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }
const footer = {
  fontSize: '12px',
  color: '#94a3b8',
  textAlign: 'center' as const,
  margin: '32px 0 0',
}
