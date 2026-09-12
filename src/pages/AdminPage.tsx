import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, RefreshCw, Send, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { WorkspaceState } from '@/features/account/AccountShell'
import type { PaginatedDto } from '@/types/api'

type ReviewTeacher = {
  id: string; headline: string; bio: string; profile_status: string; review_reason: string | null; avatarUrl: string | null
  profile: { first_name: string; last_name: string; contact_email: string | null; phone: string | null }
  subjects: { subject: { name_he: string } }[]; levels: { level: { name_he: string } }[]
}
type Delivery = { id: string; event_type: string; status: string; attempts: number; created_at: string; last_error: string | null }

export function AdminPage() {
  const client = useQueryClient()
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(1)
  const teachers = useQuery({ queryKey: ['admin', 'teachers', status, page], queryFn: () => apiRequest<PaginatedDto<ReviewTeacher>>(`/admin/teachers?status=${status}&page=${page}&limit=10`) })
  const delivery = useQuery({ queryKey: ['admin', 'delivery'], queryFn: () => apiRequest<Delivery[]>('/admin/email-delivery') })
  const refresh = () => { void client.invalidateQueries({ queryKey: ['admin'] }) }
  const process = useMutation({ mutationFn: () => apiRequest('/admin/email-delivery/process', { method: 'POST' }), onSuccess: refresh, onError: () => toast.error('עיבוד האימיילים נכשל') })
  const retry = useMutation({ mutationFn: (id: string) => apiRequest(`/admin/email-delivery/${id}/retry`, { method: 'POST' }), onSuccess: refresh, onError: () => toast.error('הניסיון החוזר נכשל') })
  return <div dir="rtl"><Header /><main className="page-shell py-8 space-y-8">
    <header className="flex items-center justify-between gap-4"><h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck />ניהול מורהלי</h1><Button variant="outline" onClick={refresh}><RefreshCw />רענון</Button></header>
    <section className="space-y-4"><h2 className="text-xl font-semibold">בדיקת מורים</h2>
      <label className="flex gap-3 items-center">סטטוס<select className="border p-2" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="pending">ממתינים לבדיקה</option><option value="draft">טיוטות</option><option value="published">מפורסמים</option><option value="suspended">מושהים</option></select></label>
      {teachers.isPending ? <WorkspaceState>טוען מורים...</WorkspaceState> : null}
      {teachers.isError ? <WorkspaceState tone="error">טעינת המורים נכשלה.</WorkspaceState> : null}
      {teachers.data?.items.length === 0 ? <WorkspaceState>אין מורים בסטטוס זה.</WorkspaceState> : null}
      <div className="inquiry-list">{teachers.data?.items.map((teacher) => <TeacherReview key={teacher.id} teacher={teacher} onSaved={refresh} />)}</div>
      <nav className="flex gap-3" aria-label="עמודי מורים"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>הקודם</Button><span>{page}</span><Button variant="outline" disabled={!teachers.data?.hasMore} onClick={() => setPage(page + 1)}>הבא</Button></nav>
    </section>
    <section className="space-y-4"><header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">מסירת אימיילים</h2><Button disabled={process.isPending} onClick={() => process.mutate()}><Send />עיבוד תור</Button></header>
      {delivery.isPending ? <WorkspaceState>טוען מסירות...</WorkspaceState> : null}
      {delivery.isError ? <WorkspaceState tone="error">תור האימיילים אינו זמין. יש לבדוק את פריסת מסד הנתונים.</WorkspaceState> : null}
      {delivery.data?.length === 0 ? <p>אין אימיילים ממתינים או שנכשלו.</p> : null}
      <div className="divide-y">{delivery.data?.map((job) => <div className="flex flex-wrap justify-between gap-3 py-3" key={job.id}><div><strong dir="ltr">{job.event_type}</strong><p>{job.status} · {job.attempts} ניסיונות</p><time>{new Date(job.created_at).toLocaleString('he-IL')}</time></div>{job.status === 'dead' ? <Button variant="outline" disabled={retry.isPending} onClick={() => retry.mutate(job.id)}><RefreshCw />ניסיון נוסף</Button> : null}</div>)}</div>
    </section>
  </main><Footer /></div>
}

function TeacherReview({ teacher, onSaved }: { teacher: ReviewTeacher; onSaved: () => void }) {
  const [reason, setReason] = useState('')
  const decision = useMutation({
    mutationFn: (action: 'approve' | 'reject') => apiRequest(`/admin/teachers/${teacher.id}/${action}`, { method: 'POST', ...(action === 'reject' ? { body: { reason: reason.trim() } } : {}) }),
    onSuccess: () => { onSaved(); toast.success('ההחלטה נשמרה והודעות נוספו לתור') },
    onError: () => toast.error('ההחלטה לא נשמרה. ייתכן שהפרופיל כבר עודכן.'),
  })
  return <article className="inquiry-card space-y-3">
    <header className="flex flex-wrap gap-4"><h3 className="text-lg font-semibold">{teacher.profile.first_name} {teacher.profile.last_name}</h3>{teacher.avatarUrl ? <img className="w-24 h-24 object-contain" src={teacher.avatarUrl} alt="תמונת המורה לבדיקה" /> : null}</header>
    <strong>{teacher.headline}</strong><p className="whitespace-pre-wrap break-words">{teacher.bio}</p>
    <p>{teacher.subjects.map((item) => item.subject.name_he).join(' · ')}</p><p>{teacher.levels.map((item) => item.level.name_he).join(' · ')}</p>
    <p className="break-all">{teacher.profile.contact_email} · {teacher.profile.phone}</p>
    {teacher.review_reason ? <p>{teacher.review_reason}</p> : null}
    {teacher.profile_status === 'pending' ? <><label className="block space-y-2"><span>סיבת החזרה לתיקון</span><Textarea maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="flex flex-wrap gap-3"><Button disabled={decision.isPending} onClick={() => decision.mutate('approve')}><Check />אישור ופרסום</Button><Button variant="outline" disabled={decision.isPending || reason.trim().length < 5} onClick={() => decision.mutate('reject')}><X />החזרה לתיקון</Button></div></> : null}
  </article>
}