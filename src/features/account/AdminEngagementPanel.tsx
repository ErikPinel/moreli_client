import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, ExternalLink, Receipt, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { SupportThread } from '@/pages/SupportPage'
import { WorkspaceState } from './AccountShell'
import type { InquiryDto, ManualAccessPaymentDto, PaginatedDto, SupportTicketDto } from '@/types/api'

export function AdminPaymentsPage() {
  const [params, setParams] = useSearchParams()
  const paymentId = params.get('payment')
  const [paymentPage, setPaymentPage] = useState(1)
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [lastDecision, setLastDecision] = useState<{ id: string; approved: boolean; note: string } | null>(null)
  const payments = useQuery({ queryKey: ['admin', 'payments', paymentId, paymentStatus, paymentPage], queryFn: () => apiRequest<PaginatedDto<ManualAccessPaymentDto>>(`/admin/access-payments?page=${paymentPage}&limit=10${paymentId ? `&paymentId=${encodeURIComponent(paymentId)}` : paymentStatus ? `&status=${paymentStatus}` : ''}`), refetchInterval: 15000 })
  return <section id="payments" className="space-y-4 admin-event-section">
    <h2>גישה חודשית · דיווחי תשלום Bit</h2>
    <Link className="button-link" to="/admin/history?source=payments">היסטוריית החלטות התשלום</Link>
    <p>יש לבדוק קבלת 60 ש״ח לפני הפעלת חודש גישה. אין סליקה או חידוש אוטומטי באתר.</p>
    {lastDecision ? <div role="status" className="admin-decision-result"><h3>{lastDecision.approved ? 'דיווח התשלום אושר' : 'דיווח התשלום נדחה'}</h3><p>{lastDecision.approved ? 'חודש הגישה אושר. פרטי התקופה נשמרו בדיווח.' : 'לא נוספה גישה חודשית. גישה קיימת וקשרים שכבר אושרו לא בוטלו. פניות תלמידים לא נדחו.'}</p>{lastDecision.note ? <p className="whitespace-pre-wrap break-words"><strong>הסיבה שנמסרה למורה: </strong>{lastDecision.note}</p> : null}<p>נוצרה התראה למורה והודעת אימייל נוספה לתור. ההחלטה נשמרה בדיווח גם לאחר הסרתו מרשימת הממתינים.</p><Link className="button-link" to={`/admin/payments?payment=${encodeURIComponent(lastDecision.id)}#payments`}>פתיחת ההחלטה שנשמרה</Link></div> : null}
    {paymentId ? <Button variant="outline" onClick={() => { const next = new URLSearchParams(params); next.delete('payment'); next.delete('decision'); setPaymentPage(1); setParams(next) }}>כל דיווחי התשלום</Button> : <label className="admin-filter-label">מצב<select value={paymentStatus} onChange={event => { setPaymentStatus(event.target.value); setPaymentPage(1) }}><option value="pending">ממתינים לבדיקה</option><option value="approved">אושרו</option><option value="rejected">נדחו</option><option value="">הכל</option></select></label>}
    {payments.isPending ? <WorkspaceState>טוען דיווחי תשלום...</WorkspaceState> : null}
    {payments.isError ? <WorkspaceState tone="error"><p>לא ניתן לטעון דיווחי תשלום.</p><Button onClick={() => void payments.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {payments.data?.items.length === 0 ? <WorkspaceState>{paymentId ? 'דיווח התשלום לא נמצא.' : 'אין דיווחים במצב הזה.'}</WorkspaceState> : null}
    <div className="inquiry-list">{payments.data?.items.map(payment => <PaymentReview key={payment.id} payment={payment} onReviewed={setLastDecision} />)}</div>
    <AdminPagination label="עמודי תשלומים" page={paymentPage} onChange={setPaymentPage} hasMore={Boolean(payments.data?.hasMore)} loading={payments.isFetching} />
  </section>
}

export function AdminSupportPage() {
  const [params] = useSearchParams()
  const ticketId = params.get('ticket')
  const [page, setPage] = useState(1)
  const tickets = useQuery({ queryKey: ['admin', 'support', 'queue', page], queryFn: () => apiRequest<PaginatedDto<SupportTicketDto>>(`/admin/support-tickets?page=${page}&limit=10`), refetchInterval: 30_000 })
  const statuses: Record<string, string> = { open: 'פתוחה', in_progress: 'בטיפול', resolved: 'טופלה', rejected: 'נסגרה ללא אישור' }
  const categories: Record<string, string> = { support: 'עזרה כללית', bug: 'תקלה', billing: 'תשלום וגישה', report: 'דיווח', onboarding: 'הצטרפות מורה' }
  return <section id="support" className="space-y-4 admin-event-section">
    <h2>תמיכה, תקלות ודיווחים</h2>
    {ticketId ? <><Link className="button-link" to="/admin/support">כל פניות התמיכה</Link><SupportThread key={ticketId} id={ticketId} admin /></> : null}
    {tickets.isPending ? <WorkspaceState>טוען פניות תמיכה...</WorkspaceState> : null}
    {tickets.isError ? <WorkspaceState tone="error"><p>לא ניתן לטעון פניות תמיכה.</p><Button onClick={() => void tickets.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {tickets.data?.items.length === 0 ? <WorkspaceState>אין פניות תמיכה.</WorkspaceState> : null}
    {tickets.data?.items.map(ticket => <Link className="admin-support-row" key={ticket.id} to={`/admin/support?ticket=${encodeURIComponent(ticket.id)}#support`}><strong>{ticket.subject}</strong><span>{categories[ticket.category]} · {statuses[ticket.status]}</span><time dateTime={ticket.updated_at}>{new Date(ticket.updated_at).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })}</time></Link>)}
    <AdminPagination label="עמודי תמיכה" page={page} onChange={setPage} hasMore={Boolean(tickets.data?.hasMore)} loading={tickets.isFetching} />
  </section>
}

export function AdminActivityPage() {
  const [params, setParams] = useSearchParams()
  const inquiryId = params.get('inquiry')
  const [lookup, setLookup] = useState(inquiryId ?? '')
  const activity = useQuery({ queryKey: ['admin', 'activity', inquiryId], queryFn: () => apiRequest<InquiryDto>(`/admin/inquiries/${encodeURIComponent(inquiryId!)}`), enabled: Boolean(inquiryId) })
  return <section id="activity" className="space-y-4 admin-event-section">
    <h2>חיפוש פנייה</h2>
    <form className="admin-toolbar" onSubmit={event => { event.preventDefault(); setParams({ inquiry: lookup.trim() }) }}><label className="grid min-w-0 flex-1 gap-2"><span>מספר פנייה</span><Input dir="ltr" required pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" value={lookup} onChange={event => setLookup(event.target.value)} /></label><Button type="submit"><Search aria-hidden="true" />חיפוש</Button></form>
    {!inquiryId ? <WorkspaceState>אין פנייה פתוחה לבירור.</WorkspaceState> : activity.isPending ? <WorkspaceState>טוען פעילות...</WorkspaceState> : activity.isError ? <WorkspaceState tone="error"><p>הפעילות אינה זמינה. בדקו את מספר הפנייה.</p><Button onClick={() => void activity.refetch()}>ניסיון נוסף</Button></WorkspaceState> : activity.data ? <article className="inquiry-card space-y-3"><p>מצב פנייה: {activity.data.status} · מצב שיעור: {activity.data.lesson_status ?? 'ללא מועד'}</p><p className="whitespace-pre-wrap break-words">{activity.data.message}</p>{activity.data.requested_start_at ? <p>{new Date(activity.data.requested_start_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</p> : null}<p>תלמיד: {activity.data.student?.first_name} {activity.data.student?.last_name} · {activity.data.student?.contact_email}</p><p>מורה: {activity.data.teacher?.profile.first_name} {activity.data.teacher?.profile.last_name} · {activity.data.teacher?.profile.contact_email}</p><Link className="button-link" to="/admin/support">פתיחת תור התמיכה</Link><p>אישור קיום השיעור מתבצע על ידי המשתתפים; מענה לתלונה מנוהל בפניות התמיכה.</p></article> : null}
  </section>
}

export const AdminEngagementPanel = AdminPaymentsPage

function AdminPagination({ label, page, onChange, hasMore, loading }: { label: string; page: number; onChange: (page: number) => void; hasMore: boolean; loading: boolean }) {
  return <nav className="admin-pagination" aria-label={label}><Button variant="outline" size="icon" aria-label="העמוד הקודם" title="העמוד הקודם" disabled={page === 1 || loading} onClick={() => onChange(page - 1)}><ChevronRight /></Button><span>עמוד {page}</span><Button variant="outline" size="icon" aria-label="העמוד הבא" title="העמוד הבא" disabled={!hasMore || loading} onClick={() => onChange(page + 1)}><ChevronLeft /></Button></nav>
}

function PaymentReview({ payment, onReviewed }: { payment: ManualAccessPaymentDto; onReviewed: (outcome: { id: string; approved: boolean; note: string }) => void }) {
  const client = useQueryClient()
  const [params] = useSearchParams()
  const focused = params.get('payment') === payment.id
  const reviewRef = useRef<HTMLElement>(null)
  const [note, setNote] = useState('')
  const [checkedReceipt, setCheckedReceipt] = useState(false)
  const [decision, setDecision] = useState<boolean | null>(null)
  const update = useMutation({ mutationFn: (approve: boolean) => apiRequest(`/admin/access-payments/${payment.id}`, { method: 'PATCH', body: { approve, note: note.trim() } }), onSuccess: (_, approved) => { setDecision(null); onReviewed({ id: payment.id, approved, note: note.trim() }); void client.invalidateQueries({ queryKey: ['admin'] }); toast.success('החלטת התשלום נשמרה והודעה נוספה לתור') } })
  useEffect(() => {
    if (focused) {
      reviewRef.current?.scrollIntoView({ block: 'start' })
      reviewRef.current?.focus({ preventScroll: true })
    }
  }, [focused])
  return <article ref={reviewRef} tabIndex={-1} aria-label="בדיקת דיווח תשלום" className="inquiry-card space-y-4 scroll-mt-24">
    <header className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{payment.teacher?.profile.first_name} {payment.teacher?.profile.last_name}</h3><strong>{payment.amount_ils} ₪ · Bit</strong></header>
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div><dt>אימייל המורה</dt><dd dir="ltr" className="break-all">{payment.teacher?.profile.contact_email || 'לא הוזן אימייל'}</dd></div>
      <div><dt>טלפון המורה</dt><dd dir="ltr">{payment.teacher?.profile.phone || 'לא הוזן טלפון'}</dd></div>
      <div><dt>אסמכתא</dt><dd className="break-all">{payment.reference}</dd></div>
      <div><dt>נשלח לבדיקה · שעון ישראל</dt><dd><time dateTime={payment.created_at}>{new Date(payment.created_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</time></dd></div>
      <div><dt>מספר דיווח</dt><dd dir="ltr" className="break-all">{payment.id}</dd></div>
      <div><dt>מצב</dt><dd>{payment.status === 'approved' ? 'אושר' : payment.status === 'rejected' ? 'נדחה' : 'ממתין לבדיקה'}</dd></div>
    </dl>
    {payment.teacher ? <Link className="inline-flex items-center gap-2 underline" to={`/teachers/${encodeURIComponent(payment.teacher.slug)}`}><ExternalLink size={16} />פרופיל המורה</Link> : null}
    {payment.period_end_at ? <p>גישה עד {new Date(payment.period_end_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</p> : null}
    {payment.reviewed_at ? <p>נבדק ב-{new Date(payment.reviewed_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</p> : null}
    {payment.reviewer ? <p>נבדק על ידי: {payment.reviewer.first_name} {payment.reviewer.last_name} · <span dir="ltr">{payment.reviewer.contact_email}</span></p> : null}
    {payment.review_note ? <p className="whitespace-pre-wrap break-words"><strong>נימוק ההחלטה: </strong>{payment.review_note}</p> : null}
    <Link className="button-link" to={`/admin/history?source=payments${payment.teacher_id ? `&teacher=${encodeURIComponent(payment.teacher_id)}` : ''}`}>היסטוריית החלטות למורה</Link>
    {payment.status === 'pending' ? <>
      <label className="review-confirmation"><input type="checkbox" checked={checkedReceipt} onChange={(event) => setCheckedReceipt(event.target.checked)} /><span>בדקתי שהתקבל תשלום Bit של {payment.amount_ils} ש״ח עבור המורה הזה. אסמכתא לבדה אינה אישור.</span></label>
      <label className="block"><span>הערת בדיקה · חובה לנמק דחייה</span><Textarea maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <div className="review-actions"><Button disabled={!checkedReceipt || update.isPending} onClick={() => { update.reset(); setDecision(true) }}><Check />אישור חודש גישה</Button><Button variant="outline" disabled={note.trim().length < 5 || update.isPending} onClick={() => { update.reset(); setDecision(false) }}><X />דחיית הדיווח</Button></div>
    </> : null}
    <Dialog open={decision !== null} onOpenChange={(open) => { if (!open && !update.isPending) setDecision(null) }}><DialogContent dir="rtl" showCloseButton={!update.isPending}><DialogHeader><DialogTitle>{decision ? 'להפעיל חודש גישה?' : 'לדחות את דיווח התשלום?'}</DialogTitle><DialogDescription>{decision ? 'הגישה תופעל לחודש אחד ממועד האישור, או תוארך מסוף התקופה הפעילה. אין חיוב אוטומטי. יש לאשר רק לאחר בדיקת קבלת התשלום.' : 'לא יתווסף חודש גישה. גישה קיימת וקשרים מאושרים לא יבוטלו, ופניות תלמידים לא יידחו. המורה יראה את הסיבה בהתראה ובהיסטוריית התשלומים ויוכל לפנות לתמיכה. אין לבצע החזר כספי דרך פעולה זו.'}</DialogDescription></DialogHeader>{decision === false ? <div><strong>הסיבה שתוצג למורה</strong><p className="whitespace-pre-wrap break-words">{note.trim()}</p></div> : null}{update.isError ? <p role="alert" className="form-error">ההחלטה לא נשמרה. ייתכן שהדיווח כבר טופל.</p> : null}<DialogFooter><Button variant="outline" disabled={update.isPending} onClick={() => setDecision(null)}>ביטול</Button><Button disabled={update.isPending || (decision === true ? !checkedReceipt : note.trim().length < 5)} onClick={() => { if (decision !== null) update.mutate(decision) }}><Receipt />{update.isPending ? 'מעדכן...' : 'אישור ההחלטה'}</Button></DialogFooter></DialogContent></Dialog>
  </article>
}