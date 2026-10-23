import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, ExternalLink, Receipt, Search, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { SupportThread } from '@/pages/SupportPage'
import { TeacherReview, ReviewModeration, type ReviewTeacher, type AdminReview } from '@/pages/AdminPage'
import { WorkspaceState } from './AccountShell'
import { supportStatuses } from './support-status'
import { inquiryLabels, lessonLabels } from './inquiry-status'
import { lessonLabels as scheduledLessonLabels, lessonTime } from './lesson-data'
import type { InquiryDto, LessonDto, ManualAccessPaymentDto, PaginatedDto, SupportTicketDto } from '@/types/api'

export function AdminPaymentsPage() {
  const [params, setParams] = useSearchParams()
  const paymentId = params.get('payment')
  const ticketId = params.get('ticket')
  const [paymentPage, setPaymentPage] = useState(1)
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [lastDecision, setLastDecision] = useState<{ id: string; approved: boolean; note: string; supportTicketId?: string | null } | null>(null)
  const payments = useQuery({ queryKey: ['admin', 'payments', paymentId, paymentStatus, paymentPage], queryFn: () => apiRequest<PaginatedDto<ManualAccessPaymentDto>>(`/admin/access-payments?page=${paymentPage}&limit=10${paymentId ? `&paymentId=${encodeURIComponent(paymentId)}` : paymentStatus ? `&status=${paymentStatus}` : ''}`), refetchInterval: 15000 })
  return <section id="payments" className="space-y-4 admin-event-section">
    <h2>גישה חודשית · דיווחי תשלום Bit</h2>
    {ticketId ? <Link className="button-link" to={`/admin/support?ticket=${encodeURIComponent(ticketId)}#support`}>חזרה לפניית התשלום</Link> : null}
    <Link className="button-link" to="/admin/history?source=payments">היסטוריית החלטות התשלום</Link>
    <p>יש לבדוק קבלת 60 ש״ח לפני הפעלת חודש גישה. אין סליקה או חידוש אוטומטי באתר.</p>
    {lastDecision ? <div role="status" className="admin-decision-result"><h3>{lastDecision.approved ? 'דיווח התשלום אושר' : 'דיווח התשלום נדחה'}</h3><p>{lastDecision.approved ? 'חודש הגישה אושר. פרטי התקופה נשמרו בדיווח.' : 'לא נוספה גישה חודשית. גישה קיימת וקשרים שכבר אושרו לא בוטלו. פניות תלמידים לא נדחו.'}</p>{lastDecision.note ? <p className="whitespace-pre-wrap break-words"><strong>הסיבה שנמסרה למורה: </strong>{lastDecision.note}</p> : null}<p>נוצרה התראה למורה והודעת אימייל נוספה לתור. ההחלטה נשמרה בדיווח גם לאחר הסרתו מרשימת הממתינים.</p><Link className="button-link" to={`/admin/payments?payment=${encodeURIComponent(lastDecision.id)}#payments`}>פתיחת ההחלטה שנשמרה</Link></div> : null}
    {lastDecision ? <p>{lastDecision.approved ? 'פניית בדיקת התשלום נסגרה אוטומטית.' : 'פניית בדיקת התשלום ממתינה לפרטים מהלקוח.'}{lastDecision.supportTicketId ? <> <Link className="underline" to={`/admin/support?ticket=${encodeURIComponent(lastDecision.supportTicketId)}#support`}>לשיחה ולהחלטה השמורה</Link></> : null}</p> : null}
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
  const [filter, setFilter] = useState('actionable')
  const tickets = useQuery({ queryKey: ['admin', 'support', 'queue', page, filter], queryFn: () => apiRequest<PaginatedDto<SupportTicketDto>>(`/admin/support-tickets?page=${page}&limit=10${filter === 'actionable' ? '&view=actionable' : filter ? `&status=${filter}` : ''}`), refetchInterval: 30_000 })
  const categories: Record<string, string> = { support: 'עזרה כללית', bug: 'תקלה', billing: 'תשלום וגישה', report: 'דיווח', onboarding: 'הצטרפות מורה' }
  return <section id="support" className="space-y-4 admin-event-section">
    <h2>תמיכה, תקלות ודיווחים</h2>
    {ticketId ? <><Link className="button-link" to="/admin/support">כל פניות התמיכה</Link><SupportThread key={ticketId} id={ticketId} admin adminAside={(ticket, suggestReply) => <TicketActions ticket={ticket} suggestReply={suggestReply} />} /></> : null}
    <label className="admin-filter-label">תור פניות<select value={filter} onChange={event => { setFilter(event.target.value); setPage(1) }}><option value="actionable">ממתינות לצוות</option><option value="waiting_customer">ממתינות ללקוח</option><option value="resolved">טופלו</option><option value="rejected">נסגרו ללא אישור</option><option value="">כל הפניות</option></select></label>
    {tickets.isPending ? <WorkspaceState>טוען פניות תמיכה...</WorkspaceState> : null}
    {tickets.isError ? <WorkspaceState tone="error"><p>לא ניתן לטעון פניות תמיכה.</p><Button onClick={() => void tickets.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {tickets.data?.items.length === 0 ? <WorkspaceState>אין פניות תמיכה.</WorkspaceState> : null}
    {tickets.data?.items.map(ticket => <Link className="admin-support-row" key={ticket.id} to={`/admin/support?ticket=${encodeURIComponent(ticket.id)}#support`}><strong>{ticket.subject}</strong><span>{ticket.category === 'billing' ? <Receipt aria-hidden="true" /> : null}{categories[ticket.category]} · {supportStatuses[ticket.status]}{ticket.category === 'billing' ? ' · כולל בדיקת תשלום' : ''}</span><time dateTime={ticket.updated_at}>{new Date(ticket.updated_at).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })}</time></Link>)}
    <AdminPagination label="עמודי תמיכה" page={page} onChange={setPage} hasMore={Boolean(tickets.data?.hasMore)} loading={tickets.isFetching} />
  </section>
}

export function AdminActivityPage() {
  const [params, setParams] = useSearchParams()
  const inquiryId = params.get('inquiry')
  const lessonId = params.get('lesson')
  const [lookup, setLookup] = useState(inquiryId ?? '')
  const activity = useQuery({ queryKey: ['admin', 'activity', inquiryId], queryFn: () => apiRequest<InquiryDto>(`/admin/inquiries/${encodeURIComponent(inquiryId!)}`), enabled: Boolean(inquiryId) })
  return <section id="activity" className="space-y-4 admin-event-section">
    <h2>{lessonId ? 'בירור שיעור' : 'חיפוש פנייה'}</h2>
    {lessonId ? <CanonicalTicketLesson lessonId={lessonId} /> : null}
    <form className="admin-toolbar" onSubmit={event => { event.preventDefault(); setParams({ inquiry: lookup.trim() }) }}><label className="grid min-w-0 flex-1 gap-2"><span>מספר פנייה</span><Input dir="ltr" required pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" value={lookup} onChange={event => setLookup(event.target.value)} /></label><Button type="submit"><Search aria-hidden="true" />חיפוש</Button></form>
    {!inquiryId ? !lessonId ? <WorkspaceState>אין פנייה פתוחה לבירור.</WorkspaceState> : null : activity.isPending ? <WorkspaceState>טוען פעילות...</WorkspaceState> : activity.isError ? <WorkspaceState tone="error"><p>הפעילות אינה זמינה. בדקו את מספר הפנייה.</p><Button onClick={() => void activity.refetch()}>ניסיון נוסף</Button></WorkspaceState> : activity.data ? <article className="inquiry-card space-y-3"><p>מצב פנייה: {activity.data.status} · מצב שיעור: {activity.data.lesson_status ?? 'ללא מועד'}</p><p className="whitespace-pre-wrap break-words">{activity.data.message}</p>{activity.data.requested_start_at ? <p>{new Date(activity.data.requested_start_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</p> : null}<p>תלמיד: {activity.data.student?.first_name} {activity.data.student?.last_name} · {activity.data.student?.contact_email}</p><p>מורה: {activity.data.teacher?.profile.first_name} {activity.data.teacher?.profile.last_name} · {activity.data.teacher?.profile.contact_email}</p><Link className="button-link" to="/admin/support">פתיחת תור התמיכה</Link><p>אישור קיום השיעור מתבצע על ידי המשתתפים; מענה לתלונה מנוהל בפניות התמיכה.</p></article> : null}
  </section>
}

export const AdminEngagementPanel = AdminPaymentsPage

function TicketActions({ ticket, suggestReply }: { ticket: SupportTicketDto; suggestReply: (body: string, status: SupportTicketDto['status']) => void }) {
  return <div className="space-y-4">
    {ticket.category === 'billing' ? <TicketPaymentPanel ticket={ticket} suggestReply={suggestReply} /> : null}
    {ticket.workflow === 'onboarding' && ticket.teacher_id ? <TicketOnboardingPanel teacherId={ticket.teacher_id} ticketId={ticket.id} /> : null}
    {ticket.lesson_id ? <CanonicalTicketLesson lessonId={ticket.lesson_id} /> : ticket.inquiry_id ? <TicketLessonPanel inquiryId={ticket.inquiry_id} /> : null}
    {ticket.review_id ? <TicketReviewPanel reviewId={ticket.review_id} /> : null}
    {ticket.category === 'report' && ticket.teacher_id && !ticket.review_id && !ticket.inquiry_id && !ticket.lesson_id ? <Link className="button-link" to={`/admin/onboarding?teacher=${encodeURIComponent(ticket.teacher_id)}`}>בדיקת פרופיל המורה המדווח</Link> : null}
  </div>
}

function TicketOnboardingPanel({ teacherId, ticketId }: { teacherId: string; ticketId: string }) {
  const client = useQueryClient()
  const teacher = useQuery({ queryKey: ['admin', 'teachers', 'case', teacherId], queryFn: () => apiRequest<PaginatedDto<ReviewTeacher>>(`/admin/teachers?teacherId=${encodeURIComponent(teacherId)}&limit=1`), refetchInterval: 15000 })
  return <section className="ticket-payment-panel" aria-label="בדיקת פרופיל המורה">
    <h3>בדיקת פרופיל המורה</h3><p>אישור יפרסם את הפרופיל ויסגור את הפנייה אוטומטית. החזרה לתיקון תשלח את הנימוק ותעביר את הפנייה להמתנה למורה.</p>
    {teacher.isPending ? <WorkspaceState>טוען פרופיל...</WorkspaceState> : null}
    {teacher.isError ? <WorkspaceState tone="error"><p>לא ניתן לטעון את פרטי הפרופיל.</p><Button onClick={() => void teacher.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {teacher.data?.items[0] ? <TeacherReview teacher={teacher.data.items[0]} currentTicketId={ticketId} onSaved={() => { void client.invalidateQueries({ queryKey: ['admin'] }); void client.invalidateQueries({ queryKey: ['teachers'] }) }} /> : teacher.isSuccess ? <p>פרופיל המורה אינו זמין. אין לאשר פרופיל אחר במקום.</p> : null}
    <Link className="button-link" to={`/admin/onboarding?teacher=${encodeURIComponent(teacherId)}`}>פתיחה בבדיקת המורים</Link>
  </section>
}

function CanonicalTicketLesson({ lessonId }: { lessonId: string }) {
  const { pathname } = useLocation()
  const query = useQuery({ queryKey: ['admin', 'lesson', lessonId], queryFn: () => apiRequest<LessonDto>(`/admin/lessons/${encodeURIComponent(lessonId)}`) })
  return <section className="ticket-payment-panel" aria-label="השיעור שאליו מתייחסת הפנייה"><h3>השיעור שאליו מתייחסת הפנייה</h3>
    {query.isPending ? <p>טוען שיעור...</p> : query.isError ? <WorkspaceState tone="error"><p>לא ניתן לטעון את השיעור.</p><Button variant="outline" onClick={() => void query.refetch()}>ניסיון נוסף</Button></WorkspaceState> : <><p>תלמיד: {query.data.student.first_name} {query.data.student.last_name} · מורה: {query.data.teacher.profile.first_name} {query.data.teacher.profile.last_name}</p><p>{scheduledLessonLabels[query.data.status]}</p><p>{query.data.starts_at ? lessonTime(query.data.starts_at) : 'לא נקבע מועד'} · שעון ישראל</p><p>אישור תלמיד: {query.data.student_completed_at ? 'נרשם' : 'לא נרשם'} · אישור מורה: {query.data.teacher_completed_at ? 'נרשם' : 'לא נרשם'}</p>{query.data.note ? <p className="whitespace-pre-wrap break-words">{query.data.note}</p> : null}<p dir="ltr">{query.data.id}</p><Link to={`/admin/activity?inquiry=${encodeURIComponent(query.data.connection_inquiry_id)}`}>הפנייה שחיברה בין המשתתפים</Link></>}
    {pathname !== '/admin/activity' ? <Link className="button-link" to={`/admin/activity?lesson=${encodeURIComponent(lessonId)}`}>פתיחת השיעור לבירור</Link> : null}<p>סגירת פנייה לתמיכה אינה קובעת נוכחות ואינה משנה את מצב השיעור.</p>
  </section>
}

function TicketLessonPanel({ inquiryId }: { inquiryId: string }) {
  const inquiry = useQuery({ queryKey: ['admin', 'activity', inquiryId], queryFn: () => apiRequest<InquiryDto>(`/admin/inquiries/${encodeURIComponent(inquiryId)}`) })
  return <section className="ticket-payment-panel" aria-label="הפנייה והשיעור הקשורים"><h3>הפנייה והשיעור הקשורים</h3>
    {inquiry.isPending ? <p>טוען פרטי שיעור...</p> : null}
    {inquiry.isError ? <WorkspaceState tone="error"><p>פרטי השיעור אינם זמינים.</p><Button onClick={() => void inquiry.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {inquiry.data ? <><p>תלמיד: {inquiry.data.student?.first_name} {inquiry.data.student?.last_name} · מורה: {inquiry.data.teacher?.profile.first_name} {inquiry.data.teacher?.profile.last_name}</p><p>{inquiryLabels[inquiry.data.status]} · {inquiry.data.lesson_status ? lessonLabels[inquiry.data.lesson_status] : 'ללא מעקב שיעור'}</p>{inquiry.data.requested_start_at ? <p>מועד מבוקש: {new Date(inquiry.data.requested_start_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })} · שעון ישראל</p> : null}</> : null}
    <Link className="button-link" to={`/admin/activity?inquiry=${encodeURIComponent(inquiryId)}`}>בירור הפנייה והשיעור</Link><p className="text-sm text-muted-foreground">פתיחת בירור או סגירת פנייה אינה משנה את אישורי המשתתפים או קובעת שהשיעור התקיים.</p>
  </section>
}

function TicketReviewPanel({ reviewId }: { reviewId: string }) {
  const client = useQueryClient()
  const reviews = useQuery({ queryKey: ['admin', 'reviews', 'case', reviewId], queryFn: () => apiRequest<PaginatedDto<AdminReview>>(`/admin/reviews?reviewId=${encodeURIComponent(reviewId)}&limit=1`) })
  return <section className="ticket-payment-panel" aria-label="התוכן שדווח"><h3>התוכן שדווח</h3>
    {reviews.isPending ? <p>טוען תוכן...</p> : null}
    {reviews.isError ? <WorkspaceState tone="error"><p>לא ניתן לטעון את התוכן שדווח.</p><Button onClick={() => void reviews.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {reviews.data?.items[0] ? <ReviewModeration review={reviews.data.items[0]} onSaved={() => { void client.invalidateQueries({ queryKey: ['admin'] }); void client.invalidateQueries({ queryKey: ['teachers'] }); void client.invalidateQueries({ queryKey: ['account', 'reviews'] }) }} /> : reviews.isSuccess ? <p>התוכן הוסר או אינו זמין. פרטי הדיווח והשיחה נשמרים בפנייה.</p> : null}
    <Link className="button-link" to={`/admin/reviews?review=${encodeURIComponent(reviewId)}`}>פתיחה בניהול הביקורות</Link><p>הסרת תוכן אינה סוגרת את התלונה. לאחר הטיפול יש להשיב לפונה ולבחור אם לסגור את הפנייה.</p>
  </section>
}

function TicketPaymentPanel({ ticket, suggestReply }: { ticket: SupportTicketDto; suggestReply: (body: string, status: SupportTicketDto['status']) => void }) {
  const client = useQueryClient()
  const teacherId = ticket.requester_teacher?.id
  const [lastDecision, setLastDecision] = useState<{ approved: boolean; note: string } | null>(null)
  const [reopenId, setReopenId] = useState<string | null>(null)
  const payments = useQuery({ queryKey: ['admin', 'payments', 'ticket', teacherId, ticket.payment_id], queryFn: () => apiRequest<PaginatedDto<ManualAccessPaymentDto>>(`/admin/access-payments?teacherId=${encodeURIComponent(teacherId!)}${ticket.payment_id ? `&paymentId=${encodeURIComponent(ticket.payment_id)}` : ''}&limit=5`), enabled: Boolean(teacherId), refetchInterval: 15000 })
  const reopen = useMutation({
    mutationFn: (id: string) => apiRequest<ManualAccessPaymentDto>(`/admin/support-tickets/${encodeURIComponent(ticket.id)}/payments/${encodeURIComponent(id)}/reopen`, { method: 'POST' }),
    onSuccess: async payment => {
      setReopenId(null)
      setLastDecision(null)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['admin', 'payments'] }),
        client.invalidateQueries({ queryKey: ['admin', 'support'] }),
      ])
      toast.success(payment.status === 'pending' ? 'הדיווח נפתח לבדיקה מחדש. עדיין לא אושרה גישה.' : 'הבדיקה הזו כבר הסתיימה. ההחלטה השמורה מוצגת בפנייה.')
    },
  })
  const related = payments.data?.items.filter(payment => !payment.support_ticket_id || payment.support_ticket_id === ticket.id) ?? []
  const pending = related.filter(payment => payment.status === 'pending')
  const latest = related[0]
  const otherCase = payments.data?.items.find(payment => payment.support_ticket_id && payment.support_ticket_id !== ticket.id)
  const unlinkedPending = pending.some(payment => !payment.support_ticket_id)
  if (ticket.category !== 'billing' && !pending.length) return null
  const askForReport = () => suggestReply('כדי שנוכל לאשר את הגישה, יש לשלוח את אסמכתת ה־Bit בטופס "דיווח תשלום" בעמוד "גישה ותשלום" בחשבון המורה. פנייה לתמיכה לבדה לא מפעילה גישה. מיד כשהדיווח יגיע נבדוק אותו ונעדכן כאן.', 'in_progress')
  const onReviewed = ({ approved, note }: { approved: boolean; note: string }) => {
    setLastDecision({ approved, note })
  }
  return <section className="ticket-payment-panel" aria-labelledby={`ticket-payment-${ticket.id}`}>
    <header><Receipt aria-hidden="true" /><div><h3 id={`ticket-payment-${ticket.id}`}>בדיקת התשלום של הפונה</h3><p>בדקו שההעברה התקבלה ב־Bit, ואז אשרו או דחו כאן. ההחלטה נשמרת בשיחה ונשלחת למורה. אישור סוגר את פניית התשלום; דחייה מעבירה אותה להמתנה ללקוח.</p></div></header>
    {ticket.requester_teacher === undefined ? <WorkspaceState tone="error"><p>פרטי המורה חסרים בתשובת השרת. לא ניתן לקבוע את מצב התשלום. יש לוודא שהשרת עודכן והופעל מחדש.</p><Button variant="outline" onClick={() => void client.invalidateQueries({ queryKey: ['admin', 'support', ticket.id] })}>טעינת פרטי הפונה מחדש</Button></WorkspaceState>
      : !teacherId ? <WorkspaceState>לא נמצא פרופיל מורה המקושר לחשבון ששלח את הפנייה. אין לשייך תשלום למורה אחר לפי נושא הפנייה.</WorkspaceState>
      : payments.isPending ? <WorkspaceState>טוען את דיווחי התשלום של המורה...</WorkspaceState>
      : payments.isError ? <WorkspaceState tone="error"><p>לא ניתן לטעון את דיווחי התשלום.</p><Button variant="outline" onClick={() => void payments.refetch()}>ניסיון נוסף</Button></WorkspaceState>
      : <>
        {lastDecision ? <div role="status" className="admin-decision-result"><h3>{lastDecision.approved ? 'התשלום אושר והגישה הופעלה' : 'דיווח התשלום נדחה'}</h3><p>{lastDecision.approved ? 'פניית התשלום נסגרה אוטומטית וההחלטה נשמרה בשיחה. אין צורך לשלוח מענה נוסף לסגירה.' : 'הנימוק נשמר בשיחה ונשלח למורה. הפנייה ממתינה לפרטים מהלקוח, ולא נסגרה.'}</p></div> : null}
        {unlinkedPending ? <WorkspaceState tone="error">דיווח ממתין אינו מקושר לפניית בדיקה. יש לוודא שהעדכון למסד הנתונים הוחל ולרענן לפני קבלת החלטה.</WorkspaceState> : pending.map(payment => <PaymentReview key={payment.id} payment={payment} onReviewed={onReviewed} />)}
        {!pending.length && latest ? <>
          <PaymentReview key={latest.id} payment={latest} onReviewed={onReviewed} />
          {latest.status === 'rejected' ? <div className="ticket-payment-empty"><strong>המורה מבקש לבדוק שוב תשלום שנדחה</strong><p>אפשר לפתוח בדיקה מחדש של אותה העברה, בלי לבקש מהמורה לשלם או לדווח שוב. הדחייה המקורית תישאר בהיסטוריה.</p><Button disabled={reopen.isPending} onClick={() => { reopen.reset(); setReopenId(latest.id) }}>פתיחת בדיקה מחדש</Button></div> : <p>התשלום כבר אושר. אין צורך לאשר שוב או לבקש תשלום נוסף עבור אותו דיווח.</p>}
        </> : null}
        {!pending.length && !latest ? otherCase ? <div className="ticket-payment-empty"><strong>דיווח התשלום מנוהל בפנייה המקושרת שלו</strong><p>כדי לשמור החלטה ושיחה במקום אחד, בדקו את התשלום שם. הפנייה הנוכחית לא תיסגר בטעות בעקבות החלטה בפנייה אחרת.</p><Link className="button-link" to={`/admin/support?ticket=${encodeURIComponent(otherCase.support_ticket_id!)}#support`}>מעבר לפניית בדיקת התשלום</Link></div> : <div className="ticket-payment-empty"><strong>לא נמצא דיווח תשלום בחשבון המורה</strong><p>אין אסמכתא שנשמרה לבדיקה. אפשר לבקש מהמורה לשלוח את פרטי ההעברה בטופס הדיווח, ללא תשלום נוסף.</p><Button size="sm" variant="outline" onClick={askForReport}><Send aria-hidden="true" />הכנסת בקשה לשליחת דיווח</Button></div> : null}
      </>}
    <Dialog open={reopenId !== null} onOpenChange={open => { if (!open && !reopen.isPending) setReopenId(null) }}><DialogContent dir="rtl" showCloseButton={!reopen.isPending}><DialogHeader><DialogTitle>לפתוח את התשלום לבדיקה מחדש?</DialogTitle><DialogDescription>תיפתח בדיקה חדשה המקושרת לדיווח שנדחה ולפנייה הזו. האסמכתא והסכמת המורה המקוריות נשמרות, וההחלטה הקודמת אינה משתנה. פעולה זו אינה מפעילה גישה; לאחריה יש לאשר או לדחות עם נימוק.</DialogDescription></DialogHeader>{reopen.isError ? <p role="alert" className="form-error">לא ניתן לפתוח בדיקה מחדש. ייתכן שכבר נפתח דיווח אחר או שמצב התשלום השתנה. רעננו את הפנייה ובדקו שוב.</p> : null}<DialogFooter><Button variant="outline" disabled={reopen.isPending} onClick={() => setReopenId(null)}>ביטול</Button><Button disabled={reopen.isPending} onClick={() => { if (reopenId) reopen.mutate(reopenId) }}>{reopen.isPending ? 'פותח בדיקה...' : 'פתיחת הדיווח לבדיקה'}</Button></DialogFooter></DialogContent></Dialog>
  </section>
}

function AdminPagination({ label, page, onChange, hasMore, loading }: { label: string; page: number; onChange: (page: number) => void; hasMore: boolean; loading: boolean }) {
  return <nav className="admin-pagination" aria-label={label}><Button variant="outline" size="icon" aria-label="העמוד הקודם" title="העמוד הקודם" disabled={page === 1 || loading} onClick={() => onChange(page - 1)}><ChevronRight /></Button><span>עמוד {page}</span><Button variant="outline" size="icon" aria-label="העמוד הבא" title="העמוד הבא" disabled={!hasMore || loading} onClick={() => onChange(page + 1)}><ChevronLeft /></Button></nav>
}

function PaymentReview({ payment, onReviewed }: { payment: ManualAccessPaymentDto; onReviewed: (outcome: { id: string; approved: boolean; note: string; supportTicketId?: string | null }) => void }) {
  const client = useQueryClient()
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const focused = params.get('payment') === payment.id
  const viewingPayment = pathname === '/admin/payments' && focused
  const ticketInContext = (pathname === '/admin/support' || pathname === '/admin/payments') && params.get('ticket') === payment.support_ticket_id
  const reviewRef = useRef<HTMLElement>(null)
  const [note, setNote] = useState('')
  const [checkedReceipt, setCheckedReceipt] = useState(false)
  const [decision, setDecision] = useState<boolean | null>(null)
  const update = useMutation({ mutationFn: (approve: boolean) => apiRequest(`/admin/access-payments/${payment.id}`, { method: 'PATCH', body: { approve, note: note.trim() } }), onSuccess: (_, approved) => { setDecision(null); onReviewed({ id: payment.id, approved, note: note.trim(), supportTicketId: payment.support_ticket_id }); void client.invalidateQueries({ queryKey: ['admin'] }); toast.success(approved ? 'התשלום אושר ופניית הבדיקה נסגרה' : 'הנימוק נשלח ופניית הבדיקה ממתינה ללקוח') } })
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
    {payment.reconsideration_of ? <p>בדיקה מחדש של אותה העברה — לא תשלום נוסף. <Link className="underline" to={`/admin/payments?payment=${encodeURIComponent(payment.reconsideration_of)}#payments`}>ההחלטה הקודמת</Link></p> : null}
    {payment.period_end_at ? <p>גישה עד {new Date(payment.period_end_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</p> : null}
    {payment.reviewed_at ? <p>נבדק ב-{new Date(payment.reviewed_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</p> : null}
    {payment.reviewer ? <p>נבדק על ידי: {payment.reviewer.first_name} {payment.reviewer.last_name} · <span dir="ltr">{payment.reviewer.contact_email}</span></p> : null}
    {payment.review_note ? <p className="whitespace-pre-wrap break-words"><strong>נימוק ההחלטה: </strong>{payment.review_note}</p> : null}
    <nav className="review-actions" aria-label="קישורים לבדיקת התשלום">
      {!viewingPayment ? <Link className="button-link" to={`/admin/payments?payment=${encodeURIComponent(payment.id)}#payments`}>פתיחה במסך התשלומים</Link> : null}
      {payment.support_ticket_id && !ticketInContext ? <Link className="button-link" to={`/admin/support?ticket=${encodeURIComponent(payment.support_ticket_id)}#support`}>צפייה בפניית התמיכה</Link> : null}
      <Link className="button-link" to={`/admin/history?source=payments${payment.teacher_id ? `&teacher=${encodeURIComponent(payment.teacher_id)}` : ''}`}>היסטוריית החלטות למורה</Link>
      {payment.teacher ? <Link className="inline-flex items-center gap-2 underline" to={`/teachers/${encodeURIComponent(payment.teacher.slug)}`}><ExternalLink size={16} />פרופיל המורה</Link> : null}
    </nav>
    {payment.status === 'pending' ? <>
      <label className="review-confirmation"><input type="checkbox" checked={checkedReceipt} onChange={(event) => setCheckedReceipt(event.target.checked)} /><span>בדקתי שהתקבל תשלום Bit של {payment.amount_ils} ש״ח עבור המורה הזה. אסמכתא לבדה אינה אישור.</span></label>
      <label className="block"><span>הערת בדיקה · חובה לנמק דחייה</span><Textarea maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <div className="review-actions"><Button disabled={!checkedReceipt || update.isPending} onClick={() => { update.reset(); setDecision(true) }}><Check />אישור חודש גישה</Button><Button variant="outline" disabled={note.trim().length < 5 || update.isPending} onClick={() => { update.reset(); setDecision(false) }}><X />דחיית הדיווח</Button></div>
    </> : null}
    <Dialog open={decision !== null} onOpenChange={(open) => { if (!open && !update.isPending) setDecision(null) }}><DialogContent dir="rtl" showCloseButton={!update.isPending}><DialogHeader><DialogTitle>{decision ? 'להפעיל חודש גישה?' : 'לדחות את דיווח התשלום?'}</DialogTitle><DialogDescription>{decision ? 'הגישה תופעל לחודש אחד ממועד האישור, או תוארך מסוף התקופה הפעילה. אין חיוב אוטומטי. יש לאשר רק לאחר בדיקת קבלת התשלום.' : 'לא יתווסף חודש גישה. גישה קיימת וקשרים מאושרים לא יבוטלו, ופניות תלמידים לא יידחו. המורה יראה את הסיבה בהתראה ובהיסטוריית התשלומים ויוכל לפנות לתמיכה. אין לבצע החזר כספי דרך פעולה זו.'}</DialogDescription></DialogHeader>{decision === false ? <div><strong>הסיבה שתוצג למורה</strong><p className="whitespace-pre-wrap break-words">{note.trim()}</p></div> : null}{update.isError ? <p role="alert" className="form-error">ההחלטה לא נשמרה. ייתכן שהדיווח כבר טופל.</p> : null}<DialogFooter><Button variant="outline" disabled={update.isPending} onClick={() => setDecision(null)}>ביטול</Button><Button disabled={update.isPending || (decision === true ? !checkedReceipt : note.trim().length < 5)} onClick={() => { if (decision !== null) update.mutate(decision) }}><Receipt />{update.isPending ? 'מעדכן...' : 'אישור ההחלטה'}</Button></DialogFooter></DialogContent></Dialog>
  </article>
}