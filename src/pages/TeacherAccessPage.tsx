import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Clock3, Copy, Mail, Phone, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AccountShell, WorkspaceState } from '@/features/account/AccountShell'
import { accessKey, useSupportContact, useTeacherAccess } from '@/features/account/useEngagementData'
import type { ManualAccessPaymentDto } from '@/types/api'

export function TeacherAccessPage() {
  const queryClient = useQueryClient()
  const access = useTeacherAccess()
  const contact = useSupportContact()
  const [params] = useSearchParams()
  const selectedId = params.get('payment')
  const [reference, setReference] = useState('')
  const [consent, setConsent] = useState(false)
  const claim = useMutation({ mutationFn: () => apiRequest(endpoints.accessPayments, { method: 'POST', body: { reference: reference.trim(), acceptTerms: consent } }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: accessKey }); setReference(''); setConsent(false); toast.success('דיווח התשלום נשמר. מצב הבדיקה מופיע כאן.') } })
  const pending = access.data?.payments.find((payment) => payment.status === 'pending')
  const latestPayment = access.data?.payments.slice().sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at))[0]
  const selectedPayment = selectedId ? access.data?.payments.find(payment => payment.id === selectedId) : latestPayment
  const { hash } = useLocation()
  const hasAccess = Boolean(access.data)
  useEffect(() => {
    if (!hasAccess || hash !== '#payment-report-form') return
    const form = document.getElementById('payment-report-form')
    form?.scrollIntoView({ block: 'start' })
    form?.querySelector('input')?.focus({ preventScroll: true })
  }, [hasAccess, hash])
  return <AccountShell title="גישה לפניות ותשלום" description="קבלת תלמיד חדש אחד ללא עלות, ואחריה גישה חודשית באישור ידני.">
    {access.isPending ? <WorkspaceState>טוען את מצב הגישה...</WorkspaceState> : null}
    {access.isError ? <WorkspaceState tone="error"><p>לא ניתן לטעון את מצב הגישה. אישורים ופרטי קשר קיימים לא נמחקו.</p><Button variant="outline" onClick={() => void access.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {access.data ? <>
      {selectedId && !selectedPayment ? <WorkspaceState><p>הדיווח המקושר אינו כלול בהיסטוריה שנטענה. ניתן לפנות לתמיכה עם מספר הדיווח לבירור.</p><p dir="ltr" className="break-all">{selectedId}</p><Link className="button-link" to="/support?category=billing">בירור התשלום</Link></WorkspaceState> : null}
      {selectedPayment?.status === 'rejected' ? <PaymentRejectionNotice payment={selectedPayment} active={access.data.active} freeContactUsed={access.data.freeContactUsed} /> : null}
      <section className="access-overview"><div><span className={`status-pill status-pill--${access.data.active ? 'accepted' : access.data.freeContactUsed ? 'pending' : 'open'}`}>{access.data.active ? 'גישה חודשית פעילה' : access.data.freeContactUsed ? 'הגישה החינמית נוצלה' : 'קבלת תלמיד ראשון ללא עלות'}</span><h2>{access.data.active ? `הגישה פעילה עד ${formatAccessDate(access.data.paidUntil)}` : access.data.freeContactUsed ? 'להמשך קבלת תלמידים חדשים' : 'התחילו עם תלמיד חדש אחד בחינם'}</h2><p>קשרים שכבר אושרו נשארים זמינים גם לאחר תום הגישה. קבלת פנייה חוזרת מאותו תלמיד אינה צורכת קשר חדש.</p></div><div className="access-price"><strong>60 ₪</strong><span>לחודש גישה · ללא חידוש אוטומטי</span></div></section>
      <section className="access-details"><h2>תשלום ידני ב־Bit</h2><p>הגישה מופעלת רק לאחר בדיקת התשלום ואישור מנהל. אין חיוב דרך האתר ואין הבטחה לכמות פניות. תשלום בכרטיס עדיין אינו זמין; האפשרות בפיתוח.</p>{contact.isPending ? <p role="status">טוען פרטי קשר מאומתים...</p> : contact.isError ? <p role="alert">לא ניתן לטעון את פרטי התשלום. נסו שוב לפני העברת כסף. <button onClick={() => void contact.refetch()}>ניסיון נוסף</button></p> : contact.data ? <div className="contact-actions"><a href={`tel:${contact.data.phone}`}><Phone aria-hidden="true" /><span dir="ltr">{contact.data.phone}</span></a><Button size="icon" variant="outline" aria-label="העתקת מספר הטלפון לתשלום" title="העתקת מספר הטלפון לתשלום" onClick={() => { void navigator.clipboard.writeText(contact.data!.phone).then(() => toast.success('המספר הועתק'), () => toast.error('לא ניתן להעתיק כרגע')) }}><Copy /></Button><a href={`mailto:${contact.data.email}`}><Mail aria-hidden="true" /><span dir="ltr">{contact.data.email}</span></a></div> : null}<Link to="/teacher-access-terms">תנאי הגישה למורים</Link></section>
      {pending ? <WorkspaceState><Clock3 /><h2>דיווח התשלום ממתין לבדיקה</h2><p>אין צורך לשלוח את אותה אסמכתא שוב. אפשר להוסיף פרטים בפניית הבדיקה שנפתחה עבור הדיווח.</p><Link className="button-link" to={pending.support_ticket_id ? `/support/${encodeURIComponent(pending.support_ticket_id)}` : '/support?category=billing'}>פנייה בנושא תשלום</Link></WorkspaceState> : <form id="payment-report-form" className="access-payment-form" onSubmit={(event) => { event.preventDefault(); if (!claim.isPending && consent) claim.mutate() }}>
        <h2>{latestPayment?.status === 'rejected' ? 'שליחת דיווח מתוקן לבדיקה' : 'כבר העברתם את התשלום?'}</h2>
        {latestPayment?.status === 'rejected' ? <p>אם הוזנה אסמכתא שגויה, ניתן לשלוח דיווח חדש עם האסמכתא הנכונה. לבירור לגבי אותה העברה שכבר דווחה, יש להשיב בפניית הבדיקה ולא לשלם שוב.</p> : null}
        <label><span>אסמכתא או פרטי זיהוי של העברת Bit</span><Input required minLength={3} maxLength={160} value={reference} disabled={claim.isPending} onChange={(event) => setReference(event.target.value)} autoComplete="off" /></label>
        <p>אין לשלוח מספר כרטיס, סיסמה או קוד אימות. דיווח אינו מפעיל את הגישה אוטומטית. לאחר השליחה תיפתח פנייה למעקב ולשיחה עם הצוות.</p>
        <label className="review-confirmation"><input type="checkbox" checked={consent} required disabled={claim.isPending} onChange={(event) => setConsent(event.target.checked)} /><span>קראתי את <Link to="/teacher-access-terms" target="_blank" rel="noreferrer">תנאי הגישה</Link>, ואני מבקש/ת בדיקה של תשלום 60 ש״ח עבור חודש גישה ללא חידוש אוטומטי.</span></label>
        {claim.isError ? <p className="form-error" role="alert">הדיווח לא נשמר. בדקו את ההיסטוריה לפני שליחה חוזרת.</p> : null}
        <Button type="submit" disabled={!consent || claim.isPending || !contact.data}><Send />{claim.isPending ? 'שומר...' : 'שליחת דיווח תשלום לבדיקה'}</Button>
      </form>}
      <section className="access-history"><h2>היסטוריית דיווחים</h2>{!access.data.payments.length ? <p>אין דיווחי תשלום קודמים.</p> : access.data.payments.map(payment => <TeacherPaymentRecord key={payment.id} payment={payment} selected={payment.id === selectedId} />)}</section>
    </> : null}
  </AccountShell>
}

function TeacherPaymentRecord({ payment, selected }: { payment: ManualAccessPaymentDto; selected: boolean }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => { if (selected) ref.current?.focus({ preventScroll: true }) }, [selected])
  return <article ref={ref} tabIndex={selected ? -1 : undefined} aria-label="דיווח תשלום" className={selected ? 'is-selected' : undefined}>
    <div><strong>{payment.amount_ils} ₪</strong><time dateTime={payment.created_at}>{formatAccessDate(payment.created_at)}</time></div>
    <span className={`status-pill status-pill--${payment.status === 'approved' ? 'accepted' : payment.status}`}>{payment.status === 'approved' ? 'אושר' : payment.status === 'pending' ? 'ממתין לבדיקה' : 'לא אושר'}</span>
    {payment.reconsideration_of ? <p>בדיקה מחדש של אותה העברה — לא תשלום נוסף. <Link className="underline" to={`/teacher/access?payment=${encodeURIComponent(payment.reconsideration_of)}`}>הדיווח הקודם</Link></p> : null}
    {payment.support_ticket_id ? <Link className="text-link" to={`/support/${encodeURIComponent(payment.support_ticket_id)}`}>הפנייה לבירור התשלום</Link> : null}
    <p className="break-all"><strong>אסמכתא: </strong>{payment.reference ?? 'לא תועדה'}</p><p dir="ltr" className="break-all">{payment.id}</p>
    {payment.reviewed_at ? <p>מועד ההחלטה: {formatAccessDate(payment.reviewed_at)}</p> : null}
    {payment.period_end_at ? <p>תקופת הגישה: {formatAccessDate(payment.period_start_at)} עד {formatAccessDate(payment.period_end_at)}</p> : null}
    {payment.review_note ? <p className="whitespace-pre-wrap break-words"><strong>נימוק ההחלטה: </strong>{payment.review_note}</p> : null}
  </article>
}

export function PaymentRejectionNotice({ payment, active, freeContactUsed }: { payment: ManualAccessPaymentDto; active: boolean; freeContactUsed: boolean }) {
  return <section className="payment-rejection-notice" aria-labelledby="payment-rejection-heading"><AlertCircle aria-hidden="true" /><div>
    <h2 id="payment-rejection-heading">דיווח התשלום לא אושר · מה קורה עכשיו?</h2>
    <p>הדיווח לא הפעיל או האריך גישה חודשית. {active ? 'הגישה שכבר אושרה נשארת בתוקף עד המועד שמופיע למטה.' : freeContactUsed ? 'לקבלת תלמיד חדש נוסף עדיין נדרש אישור גישה.' : 'האפשרות לקבל תלמיד ראשון ללא עלות נשארת זמינה.'}</p>
    <p><strong>סיבת ההחלטה: </strong><span className="whitespace-pre-wrap break-words">{payment.review_note || 'לא צורפה סיבה. יש לפנות לתמיכה לבירור.'}</span></p>
    <p>פניות תלמידים לא נדחות אוטומטית בעקבות ההחלטה, וקשרים שכבר אושרו נשארים זמינים.</p><p>כבר העברתם כסף? אין לשלם שוב רק בגלל דחיית הדיווח. פנו לתמיכה עם האסמכתא לבירור.</p>
    <p className="break-all"><strong>אסמכתא: </strong>{payment.reference} · <strong>מספר דיווח: </strong>{payment.id}</p>
    {payment.reviewed_at ? <p>מועד ההחלטה: {formatAccessDate(payment.reviewed_at)}</p> : null}
    <div className="review-actions"><Button asChild><Link to={payment.support_ticket_id ? `/support/${encodeURIComponent(payment.support_ticket_id)}` : '/support?category=billing'}>בירור התשלום עם התמיכה</Link></Button><Button asChild variant="outline"><Link to="/teacher/inquiries">לפניות התלמידים</Link></Button></div>
  </div></section>
}

export function TeacherAccessNotice({ actionOnly = false }: { actionOnly?: boolean }) {
  const access = useTeacherAccess()
  if (!access.data) return null
  if (actionOnly && access.data.canAcceptNewContact) return null
  return <aside className="teacher-access-notice"><CheckCircle2 aria-hidden="true" /><p>{access.data.active ? `גישה חודשית פעילה עד ${formatAccessDate(access.data.paidUntil)}.` : access.data.freeContactUsed ? 'לקבלת תלמיד חדש נוסף נדרשת גישה חודשית מאושרת: 60 ש״ח.' : 'קבלת תלמיד חדש אחד ללא עלות. לאחר מכן: גישה חודשית מאושרת ב־60 ש״ח.'}</p><Link to="/teacher/access">פרטי הגישה והתשלום</Link></aside>
}

function formatAccessDate(value: string | null) { return value ? new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeZone: 'Asia/Jerusalem' }).format(new Date(value)) : '—' }