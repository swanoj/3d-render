import { useFetcher } from 'react-router'
import { ANOTHER_DATE, enquiries, type EnquiryField, type EnquiryKind } from '../content/enquiries'
import type { EnquiryResult } from '../routes/api.enquiry'
import { Mark } from './Mark'

interface EnquiryFormProps {
  kind: EnquiryKind
  /** Upcoming Saturdays for the date field, as [value, label]: ["2026-10-24", "Saturday 24th Oct"]. */
  saturdays?: [string, string][]
}

function Field({ field, error, saturdays }: { field: EnquiryField; error?: string; saturdays: [string, string][] }) {
  const id = `enquiry-${field.name}`
  const describedBy = error ? `${id}-error` : undefined
  const common = {
    id,
    name: field.name,
    required: field.required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  }
  let control
  if (field.type === 'textarea') {
    control = <textarea {...common} rows={5} placeholder={field.placeholder} maxLength={4000} />
  } else if (field.type === 'select' || field.type === 'saturday') {
    const options: [string, string][] =
      field.type === 'saturday' ? [...saturdays, [ANOTHER_DATE, ANOTHER_DATE]] : (field.options ?? []).map((option) => [option, option])
    control = (
      <select {...common} defaultValue="">
        <option value="" disabled>
          Choose…
        </option>
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    )
  } else {
    control = (
      <input
        {...common}
        type={field.type}
        inputMode={field.type === 'number' ? 'numeric' : undefined}
        autoComplete={field.autoComplete}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
        maxLength={field.type === 'number' ? undefined : 200}
      />
    )
  }
  return (
    <div className="field" data-wide={field.wide || undefined}>
      <label htmlFor={id} className="field-label">
        {field.label}
        {field.required && (
          <span className="field-required" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      {control}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}

/** A birthday, booth, careers or contact enquiry. Posts to /api/enquiry without leaving the page. */
export function EnquiryForm({ kind, saturdays = [] }: EnquiryFormProps) {
  const fetcher = useFetcher<EnquiryResult>()
  const enquiry = enquiries[kind]
  const busy = fetcher.state !== 'idle'
  const result = fetcher.data
  const sent = result?.ok

  if (sent) {
    return (
      <div className="enquiry-sent" role="status">
        <Mark name="check" className="enquiry-sent-check" />
        <p className="hand enquiry-sent-title">Sent</p>
        <p className="mono">{result.message}</p>
      </div>
    )
  }

  return (
    <fetcher.Form method="post" action="/api/enquiry" className="enquiry" noValidate={false}>
      <input type="hidden" name="kind" value={kind} />
      {/* A trap for bots, out of sight and out of the tab order. */}
      <div className="visually-hidden" aria-hidden>
        <label htmlFor={`${kind}-website`}>Website</label>
        <input id={`${kind}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="enquiry-fields">
        {enquiry.fields.map((field) => (
          <Field key={field.name} field={field} error={result?.errors?.[field.name]} saturdays={saturdays} />
        ))}
      </div>
      <div className="enquiry-foot">
        <button type="submit" className="button button--solid" disabled={busy}>
          {busy ? 'Sending…' : enquiry.submit}
        </button>
        <p className="form-status" role="status" data-ok={result?.ok || undefined}>
          {result?.message}
        </p>
      </div>
    </fetcher.Form>
  )
}
