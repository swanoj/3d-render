/*
 * Email through Resend (resend.com). RESEND_API_KEY turns it on; it's a secret, so it lives only in the Vercel
 * project's environment variables. Mail goes out from a domain verified in Resend; until one is, Resend's test
 * sender (onboarding@resend.dev) can only reach the Resend account's own address.
 */

export interface Email {
  from: string
  to: string[]
  subject: string
  text: string
  html: string
  replyTo?: string
}

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

export async function sendEmail({ replyTo, ...message }: Email) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY?.trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...message, ...(replyTo ? { reply_to: replyTo } : {}) }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`Resend responded ${response.status}: ${await response.text()}`)
}

export const escapeHtml = (text: string) =>
  text.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[char] ?? char)
