/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl?: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl = 'https://miafamilyassistant.com',
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You've been invited</Heading>
        <Text style={text}>
          Someone in your household invited you to join them on {siteName}, a
          shared calendar, to-do and grocery assistant for families.
        </Text>
        <a style={button} href={confirmationUrl} target="_blank" rel="noopener noreferrer">
          Accept Invitation
        </a>
        <Text style={helpText}>
          If the button does not open, copy and paste this link into your browser:
        </Text>
        <Text style={linkText}>
          <a href={confirmationUrl} style={link}>{confirmationUrl}</a>
        </Text>
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this
          email.
        </Text>
        <Hr style={hr} />
        <Text style={identity}>
          {siteName} · <a href={siteUrl} style={link}>miafamilyassistant.com</a>
          <br />
          You received this email because someone invited this address to a
          household at miafamilyassistant.com.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  display: 'inline-block',
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
  fontWeight: 'bold',
}
const helpText = {
  fontSize: '13px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '24px 0 6px',
}
const linkText = {
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0',
  wordBreak: 'break-all' as const,
}
const link = { color: '#2563eb', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
const hr = { borderColor: '#eaeaea', margin: '24px 0 12px' }
const identity = { fontSize: '11px', color: '#999999', lineHeight: '1.6', margin: '0' }
