import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, LifeBuoy, Mail, MessageCircle, Phone, Receipt, Send } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { useAuth } from '@/auth/useAuth'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { WorkspaceState } from '@/features/account/AccountShell'
import { useTeacherAccess } from '@/features/account/useEngagementData'
import { site } from '@/lib/site'
import { supportStatuses as statuses } from '@/features/account/support-status'
import type { PaginatedDto, SupportTicketDto } from '@/types/api'

const categories = { support: 'עזרה כללית', bug: 'דיווח תקלה', billing: 'תשלום וגישה', report: 'דיווח על תוכן או התנהגות', onboarding: 'הצטרפות כמורה' }

export function SupportPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const access = useTeacherAccess()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID())
  const initialCategory = params.has('review') ? 'report' : params.has('lesson') && !['support', 'bug', 'report'].includes(params.get('category') ?? '') ? 'support' : params.get('category')
  const [category, setCategory] = useState<SupportTicketDto['category']>(initialCategory && initialCategory in categories ? initialCategory as SupportTicketDto['category'] : 'support')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const tickets = useQuery({ queryKey: ['account', 'support', 'list', page], queryFn: () => apiRequest<PaginatedDto<SupportTicketDto>>(`${endpoints.supportTickets}?page=${page}&limit=20`), enabled: Boolean(profile) && !id })
  const linkedPayment = access.data?.payments.find(payment => payment.status === 'pending') ?? access.data?.payments[0]
  const supportPath = `/support${id ? `/${id}` : params.size ? `?${params.toString()}` : ''}`
  const create = useMutation({ mutationFn: () => apiRequest<SupportTicketDto>(endpoints.supportTickets, { method: 'POST', body: { requestKey, category, subject: subject.trim(), message: message.trim(), ...(params.get('lesson') ? { lessonId: params.get('lesson') } : {}), ...(params.get('inquiry') ? { inquiryId: params.get('inquiry') } : {}), ...(params.get('teacher') ? { teacherId: params.get('teacher') } : {}), ...(params.get('review') ? { reviewId: params.get('review') } : {}) } }), onSuccess: ticket => { setSubject(''); setMessage(''); setRequestKey(crypto.randomUUID()); void queryClient.invalidateQueries({ queryKey: ['account', 'support'] }); toast.success('הפנייה נשמרה ונשלחה לתמיכה'); navigate(`/support/${ticket.id}`) } })
  return <div dir="rtl"><Header /><main id="main-content" tabIndex={-1} className="page-shell support-page"><header className="service-heading"><LifeBuoy aria-hidden="true" /><div><p>מורהלי כאן בשבילכם</p><h1>{id ? 'פרטי הפנייה לתמיכה' : 'עזרה, תמיכה ודיווח תקלות'}</h1></div></header>
    <section className="support-contact"><h2>יצירת קשר</h2><p>יש שאלה, תקלה או מידע שדורש תיקון? פנו אלינו בהקדם בטלפון, בדוא״ל או בוואטסאפ. פרטי הקשר זמינים גם ללא חשבון.</p><div className="contact-actions"><a href={`tel:${site.internationalPhone}`}><Phone aria-hidden="true" /><span dir="ltr">{site.phone}</span></a><a href={`mailto:${site.email}`}><Mail aria-hidden="true" /><span dir="ltr">{site.email}</span></a><a href={site.whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" />וואטסאפ (בחלון חדש)</a></div><p>אין לשלוח סיסמאות, מפתחות API, פרטי כרטיס או קוד אימות. במקרה של סכנה מיידית פנו לגורמי החירום המתאימים, ולא לטופס באתר.</p></section>
    {!profile ? <WorkspaceState><MessageCircle /><h2>למעקב אחר פנייה אישית</h2><Button asChild><Link to={`/login?redirect=${encodeURIComponent(supportPath)}`}>כניסה לחשבון</Link></Button></WorkspaceState> : id ? <SupportThread id={id} /> : <>
      <form className="support-form" onSubmit={(event) => { event.preventDefault(); if (!create.isPending) create.mutate() }}>
        <h2>פנייה חדשה</h2>
        {params.has('lesson') || params.has('review') || params.has('inquiry') || params.has('teacher') ? <p role="note">הפנייה תקושר אוטומטית ל{params.has('lesson') ? 'שיעור המדויק שממנו הגעתם, כולל המועד ומצב האישורים' : params.has('review') ? 'ביקורת או לתגובה שמהן הגעתם' : params.has('inquiry') ? 'פנייה ולשיעור שמהם הגעתם' : 'פרופיל המורה שממנו הגעתם'}. כתבו מה דורש בדיקה. <Link className="underline" to="/support">פתיחת פנייה ללא הקישור הזה</Link></p> : null}
        <label><span>נושא הפנייה</span><select value={category} disabled={create.isPending || params.has('review')} onChange={(event) => setCategory(event.target.value as SupportTicketDto['category'])}>{Object.entries(categories).filter(([value]) => !params.has('lesson') || ['support', 'bug', 'report'].includes(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {category === 'billing' && profile.role === 'teacher' ? linkedPayment?.support_ticket_id ? <aside className="support-billing-hint"><Receipt aria-hidden="true" /><div><strong>כבר קיימת פנייה לבדיקת התשלום שלכם</strong><p>הוסיפו פרטים באותה שיחה כדי שההחלטה וההיסטוריה יישארו יחד. אין צורך לשלוח שוב או לשלם שוב.</p><Link className="button-link" to={`/support/${encodeURIComponent(linkedPayment.support_ticket_id)}`}>המשך בפניית בדיקת התשלום</Link></div></aside> : <BillingReportHint pending={Boolean(linkedPayment?.status === 'pending')} /> : null}
        <label><span>כותרת קצרה</span><Input required minLength={5} maxLength={160} value={subject} disabled={create.isPending} onChange={(event) => setSubject(event.target.value)} /></label>
        <label><span>מה קרה ואיך אפשר לעזור?</span><Textarea required minLength={10} maxLength={4000} rows={6} value={message} disabled={create.isPending} onChange={(event) => setMessage(event.target.value)} /></label>
        <p>פרטי הפנייה נגישים לכם ולצוות הניהול המורשה. אפשר לשלוח עד חמש פניות חדשות ביום.</p>
        {create.isError ? <p className="form-error" role="alert">הפנייה לא נשמרה. בדקו שלא הגעתם למכסה ושהתוכן המקושר עדיין זמין לכם; הפרטים נשארו כאן לניסיון נוסף.</p> : null}
        <Button type="submit" disabled={create.isPending}><Send />{create.isPending ? 'שולח...' : 'שליחת הפנייה'}</Button>
      </form>
      <section className="support-history"><h2>הפניות שלי</h2>{tickets.isPending ? <WorkspaceState>טוען פניות...</WorkspaceState> : null}{tickets.isError ? <WorkspaceState tone="error"><p>לא ניתן לטעון את הפניות.</p><Button variant="outline" onClick={() => void tickets.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}{tickets.data?.items.length === 0 ? <p>אין פניות קודמות.</p> : null}{tickets.data?.items.map((ticket) => <Link className="support-ticket-row" to={`/support/${ticket.id}`} key={ticket.id}><div><span>{categories[ticket.category]}</span><h3>{ticket.subject}</h3><time dateTime={ticket.created_at}>{new Date(ticket.created_at).toLocaleDateString('he-IL')}</time></div><span>{statuses[ticket.status]}</span><ArrowLeft aria-hidden="true" /></Link>)}{page > 1 || tickets.data?.hasMore ? <nav className="review-actions" aria-label="עמודי תמיכה"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>הקודם</Button><span>{page}</span><Button variant="outline" disabled={!tickets.data?.hasMore} onClick={() => setPage(page + 1)}>הבא</Button></nav> : null}</section>
    </>}
    <Link className="text-link" to="/">חזרה לדף הבית</Link>
  </main><Footer /></div>
}

export function SupportThread({ id, admin = false, adminAside }: { id: string; admin?: boolean; adminAside?: (ticket: SupportTicketDto, suggestReply: (body: string, status: SupportTicketDto['status']) => void) => ReactNode }) {
  const [body, setBody] = useState('')
  const [selectedStatus, setStatus] = useState<SupportTicketDto['status'] | null>(null)
  const replyId = useId()
  const suggestReply = (text: string, nextStatus: SupportTicketDto['status']) => { setBody(text); setStatus(nextStatus); const field = document.getElementById(replyId); field?.scrollIntoView({ block: 'center' }); field?.focus({ preventScroll: true }) }
  const queryClient = useQueryClient()
  const path = admin ? `/admin/support-tickets/${encodeURIComponent(id)}` : endpoints.supportTicket(id)
  const ticket = useQuery({ queryKey: [admin ? 'admin' : 'account', 'support', id], queryFn: () => apiRequest<SupportTicketDto>(path), refetchInterval: 15000 })
  const status = selectedStatus ?? (ticket.data?.status === 'open' ? 'in_progress' : ticket.data?.status) ?? 'in_progress'
  const reply = useMutation({ mutationFn: () => apiRequest(`${path}/messages`, { method: 'POST', body: { body: body.trim(), ...(admin ? { status } : {}) } }), onSuccess: () => { setBody(''); setStatus(null); void queryClient.invalidateQueries({ queryKey: [admin ? 'admin' : 'account', 'support'] }); toast.success('המענה נשמר') } })
  return <section className="support-thread">
    {ticket.isPending ? <WorkspaceState>טוען שיחה...</WorkspaceState> : null}
    {ticket.isError ? <WorkspaceState tone="error"><p>הפנייה לא נמצאה או שאין הרשאה לצפות בה.</p><Button variant="outline" onClick={() => void ticket.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {ticket.data ? <>
      <header><span>{categories[ticket.data.category]} · {statuses[ticket.data.status]}</span><h2>{ticket.data.subject}</h2></header>
      {ticket.data.status === 'waiting_customer' ? <p role="status">{admin ? 'ממתינים לפרטים מהלקוח. תשובה שלו או שליחת פרופיל מתוקן תחזיר את הפנייה לתור הצוות.' : 'הצוות ממתין לפרטים מכם. אפשר להשיב כאן; אם התבקש תיקון בפרופיל, יש לתקן ולשלוח אותו מחדש לבדיקה.'}</p> : null}
      {!admin && ticket.data.workflow === 'onboarding' ? <Link className="button-link" to="/teacher/onboarding">לפרופיל המורה ולשליחה מחדש</Link> : null}
      {!admin && ticket.data.payment_id ? <Link className="button-link" to={`/teacher/access?payment=${encodeURIComponent(ticket.data.payment_id)}`}>פרטי דיווח התשלום</Link> : null}
      {admin && adminAside ? adminAside(ticket.data, suggestReply) : null}
      <article className="support-message"><strong>רקע הפנייה</strong><p>{ticket.data.message}</p><time dateTime={ticket.data.created_at}>{new Date(ticket.data.created_at).toLocaleString('he-IL')}</time></article>
      {ticket.data.messages?.map((message) => <article className={`support-message ${message.author_role !== 'user' ? 'is-admin' : ''}`} key={message.id}><strong>{message.author_role === 'system' ? 'עדכון אוטומטי של מורהלי' : message.author_role === 'admin' ? 'צוות מורהלי' : 'הודעת המשתמש'}</strong><p>{message.body}</p><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString('he-IL')}</time></article>)}
      {admin || ticket.data.status !== 'rejected' ? <form onSubmit={(event) => { event.preventDefault(); if (!reply.isPending) reply.mutate() }}>
        <label><span>{admin ? 'מענה למשתמש' : 'הוספת פרטים'}</span><Textarea id={replyId} required minLength={5} maxLength={3000} rows={4} value={body} disabled={reply.isPending} onChange={(event) => setBody(event.target.value)} /></label>
        {admin ? <><label><span>מצב לאחר שליחת המענה</span><select value={status} disabled={reply.isPending} onChange={(event) => setStatus(event.target.value as SupportTicketDto['status'])}>{Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><p className="text-sm text-muted-foreground">שינוי מצב הפנייה אינו מאשר תשלום ואינו מפרסם פרופיל. יש לבצע את ההחלטה בכרטיס הבדיקה שמעל השיחה.</p></> : null}
        {!admin && ticket.data.status === 'resolved' ? <p>שליחת פרטים נוספים תפתח את אותה פנייה מחדש לצוות.</p> : null}
        {reply.isError ? <p role="alert" className="form-error">לא ניתן לשלוח כרגע. התוכן נשאר כאן; בדקו את הסטטוס והמכסה היומית.</p> : null}
        <Button type="submit" disabled={reply.isPending || body.trim().length < 5}><Send />{reply.isPending ? 'שולח...' : admin && status === 'resolved' ? 'שליחת מענה וסגירת הפנייה' : 'שליחת מענה'}</Button>
      </form> : <p>הפנייה נסגרה. לבירור נוסף אפשר לפנות לתמיכה עם מספר הפנייה.</p>}
    </> : null}
  </section>
}

  function BillingReportHint({ pending }: { pending: boolean }) {
    return <aside className="support-billing-hint" role="note"><Receipt aria-hidden="true" /><div>{pending ? <><strong>דיווח התשלום שלכם כבר ממתין לבדיקה</strong><p>אין צורך לשלוח אותו שוב. הפרטים שתכתבו כאן יוצגו למנהל לצד הדיווח, באותו מסך שבו הוא מאשר או דוחה.</p></> : <><strong>שילמתם ב־Bit? שלחו קודם דיווח תשלום</strong><p>פנייה לתמיכה לא מפעילה גישה. כדי שמנהל יוכל לבדוק ולאשר, יש לשלוח את האסמכתא בטופס דיווח התשלום.</p><Button asChild size="sm"><Link to="/teacher/access#payment-report-form">לשליחת דיווח תשלום</Link></Button></>}</div></aside>
  }
