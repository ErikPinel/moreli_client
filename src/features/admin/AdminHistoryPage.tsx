import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiRequest } from '@/api/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WorkspaceState } from '@/features/account/AccountShell'
import type { ManualAccessPaymentDto, PaginatedDto } from '@/types/api'

type Identity = { id: string; first_name: string; last_name: string; contact_email: string | null }
type TeacherEvent = { id: string; teacher_id: string; actor_id: string | null; previous_status: string; next_status: string; reason: string | null; created_at: string; actor: Identity | null; teacher: { id: string; headline: string; profile: Omit<Identity, 'id'> } | null }
const states: Record<string, string> = { draft: 'טיוטה', pending: 'ממתין לבדיקה', published: 'מפורסם', suspended: 'מושהה' }
const date = (value: string) => new Date(value).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })
const name = (identity: { first_name: string; last_name: string } | null | undefined) => identity ? [identity.first_name, identity.last_name].filter(Boolean).join(' ') : 'לא תועד'

export function AdminHistoryPage() {
  const [params, setParams] = useSearchParams()
  const source = params.get('source') === 'teachers' ? 'teachers' : 'payments'
  const teacherId = params.get('teacher') ?? ''
  const [lookup, setLookup] = useState(teacherId)
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
  const status = params.get('status') ?? ''
  const filters = new URLSearchParams({ page: String(page), limit: '20' })
  if (teacherId) filters.set('teacherId', teacherId)
  if (status) filters.set('status', status)
  if (source === 'payments') filters.set('view', 'history')
  const payments = useQuery({ queryKey: ['admin', 'history', 'payments', filters.toString()], queryFn: () => apiRequest<PaginatedDto<ManualAccessPaymentDto>>(`/admin/access-payments?${filters}`), enabled: source === 'payments', refetchInterval: 30_000 })
  const teachers = useQuery({ queryKey: ['admin', 'history', 'teachers', filters.toString()], queryFn: () => apiRequest<PaginatedDto<TeacherEvent>>(`/admin/teacher-history?${filters}`), enabled: source === 'teachers', refetchInterval: 30_000 })
  const query = source === 'payments' ? payments : teachers
  const change = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); if (key !== 'page') next.delete('page'); if (key === 'source') next.delete('status'); setParams(next) }

  return <section className="admin-history-page space-y-5">
    <div><h2>החלטות שנשמרו במערכת</h2><p className="admin-muted">החלטות תשלום ושינויי מצב של פרופילי מורים. הודעות תמיכה ומסירת אימיילים מוצגות בעמודים הנפרדים שלהן; זה אינו רישום של כל עריכת פרטים באתר.</p></div>
    <fieldset className="admin-history-sources"><legend className="sr-only">סוג היסטוריה</legend><label><input type="radio" name="history-source" checked={source === 'payments'} onChange={() => change('source', 'payments')} /><span>החלטות תשלום</span></label><label><input type="radio" name="history-source" checked={source === 'teachers'} onChange={() => change('source', 'teachers')} /><span>פרופילי מורים</span></label></fieldset>
    <div className="admin-toolbar"><label className="admin-filter-label">החלטה<select value={status} onChange={event => change('status', event.target.value)}><option value="">כל ההחלטות</option>{source === 'payments' ? <><option value="approved">תשלום אושר</option><option value="rejected">דיווח נדחה</option></> : <><option value="draft">חזרה לטיוטה / תיקון</option><option value="pending">שליחה לבדיקה</option><option value="published">פרסום</option><option value="suspended">השהיה</option></>}</select></label><form className="admin-history-lookup" onSubmit={event => { event.preventDefault(); change('teacher', lookup.trim()) }}><label><span>מספר פרופיל מורה</span><Input dir="ltr" value={lookup} pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" onChange={event => setLookup(event.target.value)} /></label><Button type="submit" variant="outline" aria-label="סינון לפי מורה" title="סינון לפי מורה"><Search /></Button>{teacherId ? <Button variant="ghost" type="button" aria-label="ניקוי סינון מורה" title="ניקוי סינון מורה" onClick={() => { setLookup(''); change('teacher', '') }}><X /></Button> : null}</form></div>
    {query.isPending ? <WorkspaceState>טוען היסטוריה...</WorkspaceState> : null}
    {query.isError ? <WorkspaceState tone="error"><p>לא ניתן לטעון את ההיסטוריה. אין להסיק שאין החלטות קודמות.</p><Button onClick={() => void query.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {query.isSuccess && !query.data.items.length ? <WorkspaceState>אין החלטות שמורות התואמות לסינון.</WorkspaceState> : null}
    <ol className="admin-history-list">
      {source === 'payments' ? payments.data?.items.map(payment => <li key={payment.id}><article className="admin-history-entry"><header><h3>{payment.status === 'approved' ? 'תשלום אושר · חודש גישה' : 'דיווח תשלום נדחה'}</h3>{payment.reviewed_at ? <time dateTime={payment.reviewed_at}>{date(payment.reviewed_at)}</time> : <span>מועד ההחלטה לא תועד</span>}</header>
        {payment.reconsideration_of ? <p>החלטה בבדיקה מחדש של אותה העברה — לא תשלום נוסף. <Link className="underline" to={`/admin/payments?payment=${encodeURIComponent(payment.reconsideration_of)}#payments`}>ההחלטה הקודמת</Link></p> : null}
        <p><strong>{name(payment.teacher?.profile)}</strong> · {payment.amount_ils} ₪ · Bit</p><dl><div><dt>המנהל שבדק</dt><dd>{payment.reviewer ? name(payment.reviewer) : payment.reviewed_by ? 'השם אינו זמין' : 'לא תועד'}{payment.reviewer?.contact_email ? <span dir="ltr">{payment.reviewer.contact_email}</span> : null}{payment.reviewed_by ? <small dir="ltr">{payment.reviewed_by}</small> : null}</dd></div><div><dt>מצב הדיווח</dt><dd>ממתין לבדיקה ← {payment.status === 'approved' ? 'אושר' : 'נדחה'}</dd></div><div><dt>אסמכתא</dt><dd className="break-all">{payment.reference ?? 'לא תועדה'}</dd></div><div><dt>מספר דיווח</dt><dd dir="ltr" className="break-all">{payment.id}</dd></div></dl><p className="whitespace-pre-wrap break-words"><strong>נימוק ההחלטה: </strong>{payment.review_note || 'לא נרשם נימוק'}</p><p>{payment.status === 'approved' ? `תקופת הגישה: ${payment.period_start_at ? date(payment.period_start_at) : 'לא תועד'} עד ${payment.period_end_at ? date(payment.period_end_at) : 'לא תועד'}` : 'לא נוספה גישה חודשית. ההחלטה לא ביטלה קשרים קיימים ולא דחתה פניות תלמידים.'}</p><Link className="button-link" to={`/admin/payments?payment=${encodeURIComponent(payment.id)}#payments`}>פתיחת דיווח התשלום</Link></article></li>) : teachers.data?.items.map(event => <li key={event.id}><article className="admin-history-entry"><header><h3>{event.next_status === 'draft' && event.previous_status === 'pending' ? 'פרופיל הוחזר לתיקון' : event.next_status === 'published' ? 'פרופיל אושר ופורסם' : event.next_status === 'pending' ? 'פרופיל נשלח לבדיקה' : event.next_status === 'suspended' ? 'פרופיל הושהה' : 'מצב פרופיל עודכן'}</h3><time dateTime={event.created_at}>{date(event.created_at)}</time></header><p><strong>{name(event.teacher?.profile)}</strong> · {event.teacher?.headline ?? 'פרטי הפרופיל אינם זמינים'}</p><dl><div><dt>מבצע הפעולה</dt><dd>{event.actor ? name(event.actor) : event.actor_id ? 'השם אינו זמין' : 'לא תועד'}{event.actor?.contact_email ? <span dir="ltr">{event.actor.contact_email}</span> : null}{event.actor_id ? <small dir="ltr">{event.actor_id}</small> : null}</dd></div><div><dt>שינוי מצב</dt><dd>{states[event.previous_status] ?? event.previous_status} ← {states[event.next_status] ?? event.next_status}</dd></div><div><dt>מספר רשומת היסטוריה</dt><dd dir="ltr" className="break-all">{event.id}</dd></div></dl><p className="whitespace-pre-wrap break-words"><strong>נימוק שנשמר: </strong>{event.reason || 'לא נרשם נימוק'}</p>{event.next_status === 'draft' && event.previous_status === 'pending' ? <p>הפרופיל לא פורסם. המורה יכול לתקן ולשלוח שוב לבדיקה.</p> : null}<Link className="button-link" to={`/admin/onboarding?teacher=${encodeURIComponent(event.teacher_id)}#teachers`}>פתיחת מצב הפרופיל הנוכחי</Link></article></li>)}
    </ol>
    <nav className="admin-pagination" aria-label="עמודי היסטוריה"><Button variant="outline" size="icon" title="העמוד הקודם" aria-label="העמוד הקודם" disabled={page === 1 || query.isFetching} onClick={() => change('page', String(page - 1))}><ChevronRight /></Button><span>עמוד {page}</span><Button variant="outline" size="icon" title="העמוד הבא" aria-label="העמוד הבא" disabled={!query.data?.hasMore || query.isFetching} onClick={() => change('page', String(page + 1))}><ChevronLeft /></Button></nav>
  </section>
}