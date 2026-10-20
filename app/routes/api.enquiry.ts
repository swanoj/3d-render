import { data } from 'react-router'
import type { Route } from './+types/api.enquiry'
import { enquiries, isEnquiryKind } from '../content/enquiries'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LONG = 4000
const SHORT = 200

export interface EnquiryResult {
  ok: boolean
  message: string
  /** Field name → what's wrong with it. */
  errors?: Record<string, string>
}

/**
 * Birthday, booth, careers and contact enquiries. Checks the fields against content/enquiries.ts, then forwards the
 * enquiry as JSON to ENQUIRY_WEBHOOK_URL (a Zapier, Make or n8n webhook that emails the team, or any endpoint of
 * your own), the same way the newsletter sign-up works.
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

  const webhook = process.env.ENQUIRY_WEBHOOK_URL
  if (!webhook) {
    console.warn(`A ${kind} enquiry was received, but ENQUIRY_WEBHOOK_URL is not set.`)
    return data<EnquiryResult>(
      { ok: false, message: 'Enquiries aren’t connected yet. Please try again soon.' },
      { status: 503 },
    )
  }

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, form: enquiry.title, fields: values, source: 'website', submittedAt: new Date().toISOString() }),
    })
    if (!response.ok) throw new Error(`Enquiry webhook responded ${response.status}`)
  } catch (error) {
    console.error(error)
    return data<EnquiryResult>({ ok: false, message: 'Something went wrong. Please try again.' }, { status: 502 })
  }

  return { ok: true, message: enquiry.sent } satisfies EnquiryResult
}
