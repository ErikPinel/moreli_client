import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, LifeBuoy, Mail, MessageCircle, Phone, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
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
import { useSupportContact } from '@/features/account/useEngagementData'
import type { PaginatedDto, SupportTicketDto } from '@/types/api'

const statuses = { open: 'פתוחה', in_progress: 'בטיפול', resolved: 'טופלה', rejected: 'נסגרה ללא אישור' }
const categories = { support: 'עזרה כללית', bug: 'דיווח תקלה', billing: 'תשלום וגישה', report: 'דיווח על תוכן או התנהגות', onboarding: 'הצטרפות כמורה' }

export function SupportPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const contact = useSupportContact()
  const [params] = useSearchParams()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID())
  const initialCategory = params.get('category')
  const [category, setCategory] = useState<SupportTicketDto['category']>(initialCategory && initialCategory in categories ? initialCategory as SupportTicketDto['category'] : 'support')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const tickets = useQuery({ queryKey: ['account', 'support', 'list', page], queryFn: () => apiRequest<PaginatedDto<SupportTicketDto>>(`${endpoints.supportTickets}?page=${page}&limit=20`), enabled: Boolean(profile) && !id })
  const create = useMutation({ mutationFn: () => apiRequest<SupportTicketDto>(endpoints.supportTickets, { method: 'POST', body: { requestKey, category, subject: subject.trim(), message: message.trim(), ...(params.get('inquiry') ? { inquiryId: params.get('inquiry') } : {}), ...(params.get('teacher') ? { teacherId: params.get('teacher') } : {}) } }), onSuccess: () => { setSubject(''); setMessage(''); setRequestKey(crypto.randomUUID()); void queryClient.invalidateQueries({ queryKey: ['account', 'support'] }); toast.success('הפנייה נשמרה ונשלחה לתמיכה') } })
  return <div dir="rtl"><Header /><main id="main-content" tabIndex={-1} className="page-shell support-page"><header className="service-heading"><LifeBuoy aria-hidden="true" /><div><p>מורהלי כאן בשבילכם</p><h1>{id ? 'פרטי הפנייה לתמיכה' : 'עזרה, תמיכה ודיווח תקלות'}</h1></div></header>
    <section className="support-contact"><h2>יצירת קשר</h2>{contact.data ? <div className="contact-actions"><a href={`tel:${contact.data.phone}`}><Phone aria-hidden="true" /><span dir="ltr">{contact.data.phone}</span></a><a href={`mailto:${contact.data.email}`}><Mail aria-hidden="true" /><span dir="ltr">{contact.data.email}</span></a></div> : <p>{contact.isError ? 'פרטי הקשר לא נטענו.' : 'טוען פרטי קשר...'}</p>}<p>אין לשלוח סיסמאות, מפתחות API, פרטי כרטיס או קוד אימות. במקרה של סכנה מיידית פנו לגורמי החירום המתאימים, ולא לטופס באתר.</p></section>
    {!profile ? <WorkspaceState><MessageCircle /><h2>למעקב אחר פנייה אישית</h2><Button asChild><Link to={`/login?redirect=${encodeURIComponent('/support'+(id ? '/'+id : ''))}`}>כניסה לחשבון</Link></Button></WorkspaceState> : id ? <SupportThread id={id} /> : <>
      <form className="support-form" onSubmit={(event) => { event.preventDefault(); if (!create.isPending) create.mutate() }}><h2>פנייה חדשה</h2><label><span>נושא הפנייה</span><select value={category} disabled={create.isPending} onChange={(event) => setCategory(event.target.value as SupportTicketDto['category'])}>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>כותרת קצרה</span><Input required minLength={5} maxLength={160} value={subject} disabled={create.isPending} onChange={(event) => setSubject(event.target.value)} /></label><label><span>מה קרה ואיך אפשר לעזור?</span><Textarea required minLength={10} maxLength={4000} rows={6} value={message} disabled={create.isPending} onChange={(event) => setMessage(event.target.value)} /></label><p>פרטי הפנייה נגישים לכם ולצוות הניהול המורשה. אפשר לשלוח עד חמש פניות חדשות ביום.</p>{create.isError ? <p className="form-error" role="alert">הפנייה לא נשמרה. בדקו שלא הגעתם למכסה ושפרטי הפנייה תקינים; התוכן נשאר כאן לניסיון נוסף.</p> : null}<Button type="submit" disabled={create.isPending}><Send />{create.isPending ? 'שולח...' : 'שליחת הפנייה'}</Button></form>
      <section className="support-history"><h2>הפניות שלי</h2>{tickets.isPending ? <WorkspaceState>טוען פניות...</WorkspaceState> : null}{tickets.isError ? <WorkspaceState tone="error"><p>לא ניתן לטעון את הפניות.</p><Button variant="outline" onClick={() => void tickets.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}{tickets.data?.items.length === 0 ? <p>אין פניות קודמות.</p> : null}{tickets.data?.items.map((ticket) => <Link className="support-ticket-row" to={`/support/${ticket.id}`} key={ticket.id}><div><span>{categories[ticket.category]}</span><h3>{ticket.subject}</h3><time dateTime={ticket.created_at}>{new Date(ticket.created_at).toLocaleDateString('he-IL')}</time></div><span>{statuses[ticket.status]}</span><ArrowLeft aria-hidden="true" /></Link>)}{page > 1 || tickets.data?.hasMore ? <nav className="review-actions" aria-label="עמודי תמיכה"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>הקודם</Button><span>{page}</span><Button variant="outline" disabled={!tickets.data?.hasMore} onClick={() => setPage(page + 1)}>הבא</Button></nav> : null}</section>
    </>}
    <Link className="text-link" to="/">חזרה לדף הבית</Link>
  </main><Footer /></div>
}

export function SupportThread({ id, admin = false }: { id: string; admin?: boolean }) {
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<SupportTicketDto['status']>('in_progress')
  const queryClient = useQueryClient()
  const path = admin ? `/admin/support-tickets/${encodeURIComponent(id)}` : endpoints.supportTicket(id)
  const ticket = useQuery({ queryKey: [admin ? 'admin' : 'account', 'support', id], queryFn: () => apiRequest<SupportTicketDto>(path) })
  const reply = useMutation({ mutationFn: () => apiRequest(`${path}/messages`, { method: 'POST', body: { body: body.trim(), ...(admin ? { status } : {}) } }), onSuccess: () => { setBody(''); void queryClient.invalidateQueries({ queryKey: [admin ? 'admin' : 'account', 'support'] }); toast.success('המענה נשמר') } })
  return <section className="support-thread">{ticket.isPending ? <WorkspaceState>טוען שיחה...</WorkspaceState> : null}{ticket.isError ? <WorkspaceState tone="error"><p>הפנייה לא נמצאה או שאין הרשאה לצפות בה.</p><Button variant="outline" onClick={() => void ticket.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}{ticket.data ? <><header><span>{categories[ticket.data.category]} · {statuses[ticket.data.status]}</span><h2>{ticket.data.subject}</h2></header><article className="support-message"><strong>הפנייה המקורית</strong><p>{ticket.data.message}</p><time dateTime={ticket.data.created_at}>{new Date(ticket.data.created_at).toLocaleString('he-IL')}</time></article>{ticket.data.messages?.map((message) => <article className={`support-message ${message.author_role === 'admin' ? 'is-admin' : ''}`} key={message.id}><strong>{message.author_role === 'admin' ? 'צוות מורהלי' : 'הודעת המשתמש'}</strong><p>{message.body}</p><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString('he-IL')}</time></article>)}{admin || ticket.data.status !== 'rejected' ? <form onSubmit={(event) => { event.preventDefault(); if (!reply.isPending) reply.mutate() }}><label><span>{admin ? 'מענה למשתמש' : 'הוספת פרטים'}</span><Textarea required minLength={5} maxLength={3000} rows={4} value={body} disabled={reply.isPending} onChange={(event) => setBody(event.target.value)} /></label>{admin ? <label><span>מצב לאחר שליחת המענה</span><select value={status} disabled={reply.isPending} onChange={(event) => setStatus(event.target.value as SupportTicketDto['status'])}>{Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label> : null}{reply.isError ? <p role="alert" className="form-error">לא ניתן לשלוח כרגע. התוכן נשאר כאן; בדקו את הסטטוס והמכסה היומית.</p> : null}<Button type="submit" disabled={reply.isPending || body.trim().length < 5}><Send />{reply.isPending ? 'שולח...' : 'שליחת מענה'}</Button></form> : <p>הפנייה נסגרה. לבירור נוסף אפשר לפנות לתמיכה עם מספר הפנייה.</p>}</> : null}</section>
}

