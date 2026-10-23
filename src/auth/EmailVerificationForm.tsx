import type { EmailAddressResource } from '@clerk/react/types'
import { ArrowDown, ArrowRight, LoaderCircle, MailCheck, Send } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Props = {
  email: EmailAddressResource
  onVerified: () => Promise<unknown>
}

export function EmailVerificationForm({ email, onVerified }: Props) {
  const [code, setCode] = useState('')
  const [sentAt, setSentAt] = useState(0)
  const [cooldown, setCooldown] = useState(false)
  const [busy, setBusy] = useState<'sending' | 'verifying' | null>(null)
  const [error, setError] = useState('')
  const codeInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (sentAt) codeInput.current?.focus()
  }, [sentAt])

  useEffect(() => {
    if (!sentAt) return
    const timer = setTimeout(() => setCooldown(false), 60_000)
    return () => clearTimeout(timer)
  }, [sentAt])

  async function sendCode() {
    setBusy('sending')
    setError('')
    try {
      await email.prepareVerification({ strategy: 'email_code' })
      setCode('')
      setCooldown(true)
      setSentAt(Date.now())
    } catch {
      setError('לא הצלחנו לשלוח קוד אימות. נסו שוב בעוד דקה או פתחו את ניהול החשבון.')
    } finally {
      setBusy(null)
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('verifying')
    setError('')
    let verified = false
    try {
      const result = await email.attemptVerification({ code: code.trim() })
      if (result.verification.status !== 'verified') {
        setError('הקוד אינו תקין או שפג תוקפו. נסו שוב או בקשו קוד חדש.')
        return
      }
      verified = true
      await onVerified()
    } catch {
      setError(verified
        ? 'כתובת המייל אומתה, אך טעינת החשבון נכשלה. לחצו על בדיקה מחדש.'
        : 'הקוד אינו תקין או שפג תוקפו. נסו שוב או בקשו קוד חדש.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section aria-label="אימות כתובת המייל" className="verification-flow">
      <p dir="ltr" className="verification-flow__email">{email.emailAddress}</p>
      <div className="verification-flow__send">
        <Button type="button" variant={sentAt ? 'link' : 'default'} className={sentAt ? 'verification-flow__resend' : 'verification-flow__action'} disabled={Boolean(busy) || cooldown} onClick={() => void sendCode()}>
          {busy === 'sending' ? <LoaderCircle aria-hidden="true" className="verification-flow__spinner" /> : <Send aria-hidden="true" />}
          {busy === 'sending' ? 'שולחים קוד...' : sentAt ? 'שליחת קוד חדש' : 'שליחת קוד אימות למייל'}
        </Button>
        {!sentAt && !busy ? <ArrowRight aria-hidden="true" className="verification-flow__cue" /> : null}
      </div>
      {sentAt ? <p role="status" className="verification-flow__status"><MailCheck aria-hidden="true" />בקשת שליחת הקוד התקבלה. בדקו את תיבת הדואר ואת תיקיית הספאם.</p> : null}
      {sentAt ? (
        <form className="verification-flow__code" onSubmit={event => void verifyCode(event)}>
          <label className="verification-flow__label">
            <span>קוד אימות <ArrowDown aria-hidden="true" className="verification-flow__code-cue" /></span>
            <Input ref={codeInput} className="verification-flow__input" dir="ltr" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={event => setCode(event.target.value)} disabled={Boolean(busy)} aria-invalid={error ? true : undefined} />
          </label>
          <Button type="submit" className="verification-flow__action" disabled={Boolean(busy) || !/^\d{6}$/.test(code.trim())}>
            {busy === 'verifying' ? <LoaderCircle aria-hidden="true" className="verification-flow__spinner" /> : <MailCheck aria-hidden="true" />}
            {busy === 'verifying' ? 'מאמתים...' : 'אימות והמשך'}
          </Button>
        </form>
      ) : null}
      {error ? <p role="alert" className="text-destructive">{error}</p> : null}
    </section>
  )
}