import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, RefreshCw, Search, Send } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { WorkspaceState } from '@/features/account/AccountShell'

type Delivery = { id: string; event_type: string; status: string; attempts: number; created_at: string; last_error: string | null; provider?: string; provider_status?: string | null; provider_message_id?: string | null }
type Configuration = { provider: string; configured: boolean; testMode: boolean; webhookConfigured: boolean }
const deliveryStates: Record<string, string> = { pending: 'ממתין לשליחה', processing: 'בשליחה', sent: 'התקבל אצל הספק', dead: 'נכשל' }
const receiptStates: Record<string, string> = { accepted: 'הספק קיבל', delivered: 'נמסר לתיבה', bounced: 'חזר מהנמען', complained: 'דווח כספאם', recipient_missing: 'אין כתובת נמען' }
const events: Record<string, string> = { 'account.created': 'חשבון חדש', 'teacher.created': 'פרופיל מורה חדש', 'teacher.pending': 'פרופיל לבדיקה', 'teacher.published': 'מורה אושר', 'teacher.rejected': 'פרופיל הוחזר לתיקון', 'teacher.suspended': 'פרופיל הושהה', 'billing.requested': 'דיווח תשלום', 'billing.approved': 'תשלום אושר', 'billing.rejected': 'תשלום נדחה', 'inquiry.sent': 'פנייה חדשה', 'inquiry.accepted': 'פנייה אושרה', 'inquiry.declined': 'פנייה נדחתה', 'lesson.updated': 'עדכון שיעור', 'support.created': 'פניית תמיכה חדשה', 'support.updated': 'מענה לתמיכה' }

export function AdminEmailPage() {
  const client = useQueryClient()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [action, setAction] = useState<'process' | Delivery | null>(null)
  const delivery = useQuery({ queryKey: ['admin', 'delivery'], queryFn: () => apiRequest<Delivery[]>('/admin/email-delivery'), refetchInterval: 15_000 })
  const configuration = useQuery({ queryKey: ['admin', 'delivery-configuration'], queryFn: () => apiRequest<Configuration>('/admin/email-delivery/configuration') })
  const canSend = Boolean(configuration.data?.configured && !configuration.data.testMode)
  const update = useMutation({
    mutationFn: (selection: 'process' | Delivery) => apiRequest(selection === 'process' ? '/admin/email-delivery/process' : `/admin/email-delivery/${selection.id}/retry`, { method: 'POST' }),
    onSuccess: () => { setAction(null); void client.invalidateQueries({ queryKey: ['admin'] }); toast.success('הפעולה הושלמה. מצב המסירה יתעדכן בתור.') },
  })
  const rows = delivery.data ?? []
  const filtered = rows.filter(job => (!status || job.status === status) && `${events[job.event_type] ?? ''} ${job.event_type} ${job.id} ${job.last_error ?? ''} ${job.provider_status ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
  const pages = Math.max(1, Math.ceil(filtered.length / 15))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * 15, currentPage * 15)
  const beginAction = (selection: 'process' | Delivery) => { update.reset(); setAction(selection) }

  return <section className="admin-email-page space-y-5">
    <div className="admin-section-heading"><h2>מצב שירות האימיילים</h2><Button disabled={!canSend || update.isPending} onClick={() => beginAction('process')}><Send aria-hidden="true" />עיבוד תור ידני</Button></div>
    {configuration.isPending ? <WorkspaceState>טוען הגדרות מסירה...</WorkspaceState> : null}
    {configuration.isError ? <WorkspaceState tone="error"><p>לא ניתן לטעון את הגדרות האימיילים.</p><Button onClick={() => void configuration.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {configuration.data ? <div className={`admin-email-readiness ${canSend ? 'is-ready' : ''}`}>{canSend ? <CheckCircle2 aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}<div><strong>{configuration.data.testMode ? 'מצב בדיקה · הודעות רגילות ממתינות' : configuration.data.configured ? 'Resend מוגדר לשליחה' : 'שליחת אימיילים אינה מוגדרת'}</strong><p>{configuration.data.webhookConfigured ? 'אימות אירועי מסירה מוגדר. מצב הספק מופיע ליד כל הודעה.' : 'Webhook אינו מוגדר. אין אישור מסירה לתיבה.'}</p></div></div> : null}
    <dl className="admin-email-counts" aria-label="סיכום ההודעות האחרונות">{[['pending', 'ממתינים'], ['processing', 'בשליחה'], ['dead', 'נכשלו'], ['sent', 'התקבלו אצל הספק']].map(([value, label]) => <div key={value}><dt>{label}</dt><dd>{delivery.isError ? 'לא זמין' : delivery.isPending ? '…' : rows.filter(job => job.status === value).length}</dd></div>)}</dl>
    <div className="admin-section-heading"><div><h2>היסטוריית מסירה</h2><p className="admin-muted">עד 100 הודעות אחרונות. קבלה אצל הספק אינה אישור הגעה לתיבת הדואר.</p></div></div>
    <div className="admin-toolbar"><label className="admin-filter-label">מצב<select value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}><option value="">כל המצבים</option>{Object.entries(deliveryStates).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="admin-search"><Search aria-hidden="true" /><Input aria-label="חיפוש במסירות אימייל" placeholder="אירוע, מזהה או שגיאה" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} /></label></div>
    {delivery.isPending ? <WorkspaceState>טוען מסירות...</WorkspaceState> : null}
    {delivery.isError ? <WorkspaceState tone="error"><p>היסטוריית האימיילים אינה זמינה.</p><Button onClick={() => void delivery.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {delivery.isSuccess && !filtered.length ? <WorkspaceState>אין הודעות התואמות לסינון.</WorkspaceState> : null}
    {visible.length ? <div className="admin-table-scroll"><table className="admin-email-table"><caption className="sr-only">היסטוריית מסירת אימיילים</caption><thead><tr><th scope="col">אירוע</th><th scope="col">מצב</th><th scope="col">קבלת מסירה</th><th scope="col">זמן וניסיונות</th><th scope="col">פעולות</th></tr></thead><tbody>{visible.map(job => <tr key={job.id}><td><strong>{events[job.event_type] ?? job.event_type}</strong><small dir="ltr">{job.event_type}</small><small dir="ltr" className="admin-delivery-id">{job.id}</small></td><td><span className={`admin-delivery-state is-${job.status}`}>{deliveryStates[job.status] ?? job.status}</span>{job.last_error ? <small className="form-error" dir="ltr">{job.last_error}</small> : null}</td><td>{job.provider_status ? receiptStates[job.provider_status] ?? job.provider_status : 'טרם התקבל עדכון'}</td><td><time dateTime={job.created_at}>{new Date(job.created_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</time><small>{job.attempts} ניסיונות · {job.provider ?? 'ללא ספק'}</small></td><td>{job.status === 'dead' ? <Button size="sm" variant="outline" disabled={!canSend || update.isPending} onClick={() => beginAction(job)}><RefreshCw aria-hidden="true" />ניסיון נוסף</Button> : <span className="admin-muted">ללא פעולה</span>}</td></tr>)}</tbody></table></div> : null}
    <nav className="admin-pagination" aria-label="עמודי מסירת אימייל"><Button variant="outline" size="icon" title="העמוד הקודם" aria-label="העמוד הקודם" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronRight /></Button><span>עמוד {currentPage} מתוך {pages}</span><Button variant="outline" size="icon" title="העמוד הבא" aria-label="העמוד הבא" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ChevronLeft /></Button></nav>
    <Dialog open={action !== null} onOpenChange={open => { if (!open && !update.isPending) setAction(null) }}><DialogContent dir="rtl" showCloseButton={!update.isPending}><DialogHeader><DialogTitle>{action === 'process' ? 'לעבד את תור האימיילים?' : 'להחזיר את ההודעה לתור?'}</DialogTitle><DialogDescription>{action === 'process' ? 'הפעולה תנסה לשלוח הודעות שממתינות בתור, כולל הודעות קודמות. אין צורך להפעיל אותה לשם צפייה בהיסטוריה.' : 'ההודעה תישלח מחדש דרך מנגנון התור, תוך שמירה על הנמען והתוכן המקוריים. אין לאשר אם פרטי הנמען חסרים.'}</DialogDescription></DialogHeader>{action && action !== 'process' ? <p dir="ltr" className="break-all">{action.id}</p> : null}{update.isError ? <p role="alert" className="form-error">הפעולה נכשלה. לא ניתן לאשר שהשליחה הושלמה.</p> : null}<DialogFooter><Button variant="outline" disabled={update.isPending} onClick={() => setAction(null)}>ביטול</Button><Button disabled={!canSend || update.isPending} onClick={() => { if (action) update.mutate(action) }}><Send aria-hidden="true" />{update.isPending ? 'מעדכן...' : 'אישור הפעולה'}</Button></DialogFooter></DialogContent></Dialog>
  </section>
}