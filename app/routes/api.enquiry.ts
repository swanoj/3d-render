import { data } from 'react-router'
import type { Route } from './+types/api.enquiry'
import { enquiries, isEnquiryKind, type Enquiry, type EnquiryKind } from '../content/enquiries'
import { emailEnabled, escapeHtml, sendEmail, type Email } from '../lib/email.server'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LONG = 4000
const SHORT = 200

export interface EnquiryResult {
  ok: boolean
  message: string
  /** Field name → what's wrong with it. */
  errors?: Record<string, string>
}

/** The inbox line, so the team can see what it is before opening it. */
function subjectFor(kind: EnquiryKind, values: Record<string, string>) {
  const name = values.name || 'the website'
  const extra = {
    birthday: [values.date, values.guests && `${values.guests} guests`],
    booth: [values.date, values.group && `group of ${values.group}`],
    careers: [values.role],
    contact: [],
  }[kind].filter(Boolean)
  const what = kind === 'careers' ? 'Job application' : kind === 'contact' ? values.topic || 'Message' : enquiries[kind].title
  return [`${what} from ${name}`, ...extra].join(' · ')
}

/** The email to the team: every field that was filled in, with Reply going straight to the person who sent it. */
function enquiryEmail(kind: EnquiryKind, enquiry: Enquiry, values: Record<string, string>, to: string[]): Email {
  const rows = enquiry.fields.flatMap((field) => (values[field.name] ? [[field.label, values[field.name]]] : []))
  const name = values.name || 'them'
  return {
    from: process.env.ENQUIRY_EMAIL_FROM?.trim() || 'Club Casa website <onboarding@resend.dev>',
    to,
    subject: subjectFor(kind, values),
    replyTo: EMAIL.test(values.email ?? '') ? values.email : undefined,
    text: [`${enquiry.title}, from the website`, '', ...rows.map(([label, value]) => `${label}: ${value}`), '', `Reply to this email to answer ${name}.`].join('\n'),
    html: [
      `<p style="font:600 15px/1.4 Helvetica,Arial,sans-serif;color:#212121">${escapeHtml(enquiry.title)}, from the website</p>`,
      '<table style="border-collapse:collapse;font:14px/1.5 Helvetica,Arial,sans-serif;color:#212121">',
      ...rows.map(
        ([label, value]) =>
          `<tr><td style="padding:4px 16px 4px 0;vertical-align:top;color:#6b665e">${escapeHtml(label)}</td><td style="padding:4px 0;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
      ),
      '</table>',
      `<p style="font:13px/1.4 Helvetica,Arial,sans-serif;color:#6b665e">Reply to this email to answer ${escapeHtml(name)}.</p>`,
    ].join(''),
  }
}

/**
 * Where an enquiry goes: an email to the team through Resend (RESEND_API_KEY and ENQUIRY_EMAIL_TO), a webhook
 * (ENQUIRY_WEBHOOK_URL: Zapier, Make, n8n or your own), or both. It's sent if any of them took it.
 */
async function deliver(kind: EnquiryKind, enquiry: Enquiry, values: Record<string, string>) {
  const sends: Promise<unknown>[] = []
  const to = (process.env.ENQUIRY_EMAIL_TO ?? '').split(',').map((address) => address.trim()).filter(Boolean)
  if (emailEnabled() && to.length) sends.push(sendEmail(enquiryEmail(kind, enquiry, values, to)))
  const webhook = process.env.ENQUIRY_WEBHOOK_URL
  if (webhook) {
    sends.push(
      fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, form: enquiry.title, fields: values, source: 'website', submittedAt: new Date().toISOString() }),
      }).then((response) => {
        if (!response.ok) throw new Error(`Enquiry webhook responded ${response.status}`)
      }),
    )
  }
  if (!sends.length) return 'off'
  const results = await Promise.allSettled(sends)
  for (const result of results) if (result.status === 'rejected') console.error(result.reason)
  return results.some((result) => result.status === 'fulfilled') ? 'sent' : 'failed'
}

/**
 * Birthday, booth, careers and contact enquiries. Checks the fields against content/enquiries.ts, then sends the
 * enquiry to the team (see deliver).
 */
export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData()
  const kind = form.get('kind')
  if (!isEnquiryKind(kind)) return data<EnquiryResult>({ ok: false, message: 'Unknown form.' }, { status: 400 })
  const enquiry = enquiries[kind]

  // A field people can't see: anything in it came from a bot. Look like it worked and drop it.
  if (String(form.get('website') ?? '').trim()) return { ok: true, message: enquiry.sent } satisfies EnquiryResult

  const values: Record<string, string> = {}
  const errors: Record<string, string> = {}
  for (const field of enquiry.fields) {
    const value = String(form.get(field.name) ?? '').trim()
    values[field.name] = value
    if (!value) {
      if (field.required) errors[field.name] = `Add your ${field.label.toLowerCase()}.`
      continue
    }
    const limit = field.type === 'textarea' ? LONG : SHORT
    if (value.length > limit) errors[field.name] = `Keep it under ${limit} characters.`
    else if (field.type === 'email' && !EMAIL.test(value)) errors[field.name] = 'Enter a valid email address.'
    else if (field.type === 'tel' && !/^[\d\s()+-]{6,20}$/.test(value)) errors[field.name] = 'Enter a valid phone number.'
    else if (field.type === 'number') {
      const number = Number(value)
      if (!Number.isInteger(number) || (field.min !== undefined && number < field.min) || (field.max !== undefined && number > field.max)) {
        errors[field.name] = `Enter a number from ${field.min ?? 1} to ${field.max ?? 999}.`
      }
    } else if (field.type === 'select' && field.options && !field.options.includes(value)) {
      errors[field.name] = 'Choose one of the options.'
    }
  }
  if (Object.keys(errors).length) {
    return data<EnquiryResult>({ ok: false, message: 'Check the highlighted fields.', errors }, { status: 400 })
  }

  const outcome = await deliver(kind, enquiry, values)
  if (outcome === 'off') {
    console.warn(`A ${kind} enquiry was received, but neither Resend (RESEND_API_KEY, ENQUIRY_EMAIL_TO) nor ENQUIRY_WEBHOOK_URL is set.`)
    return data<EnquiryResult>(
      { ok: false, message: 'Enquiries aren’t connected yet. Please try again soon.' },
      { status: 503 },
    )
  }
  if (outcome === 'failed') {
    return data<EnquiryResult>({ ok: false, message: 'Something went wrong. Please try again.' }, { status: 502 })
  }

  return { ok: true, message: enquiry.sent } satisfies EnquiryResult
}
