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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password for {siteName}. Click
          the button below to choose a new password.
        </Text>
        <a style={button} href={confirmationUrl} target="_blank" rel="noopener noreferrer">
          Reset Password
        </a>
        <Text style={helpText}>
          If the button does not open, copy and paste this link into your browser:
        </Text>
        <Text style={linkText}>
          <a href={confirmationUrl} style={link}>{confirmationUrl}</a>
        </Text>
        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this
          email. Your password will not be changed.
        </Text>
        <Hr style={hr} />
        <Text style={identity}>
          {siteName} · <a href="https://miafamilyassistant.com" style={link}>miafamilyassistant.com</a>
          <br />
          You received this email because a password reset was requested for
          this address at miafamilyassistant.com.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
