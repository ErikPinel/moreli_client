import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { WorkspaceState } from '@/features/account/AccountShell'
import type { PaginatedDto, ReviewDto } from '@/types/api'

export type ReviewTeacher = {
  id: string; headline: string; bio: string; profile_status: string; review_reason: string | null; avatarUrl: string | null
  profile: { first_name: string; last_name: string; contact_email: string | null; phone: string | null }
  subjects: { subject: { name_he: string } }[]; levels: { level: { name_he: string } }[]
}
type AdminReview = ReviewDto & { teacher: { headline: string; slug: string } | null }

export function AdminOnboardingPage() {
  const client = useQueryClient()
  const [params] = useSearchParams()
  const teacherId = params.get('teacher')
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(1)
  const teachers = useQuery({ queryKey: ['admin', 'teachers', status, page, teacherId], queryFn: () => apiRequest<PaginatedDto<ReviewTeacher>>(`/admin/teachers?status=${status}&page=${page}&limit=10${teacherId ? `&teacherId=${encodeURIComponent(teacherId)}` : ''}`) })
  const refresh = () => { void client.invalidateQueries({ queryKey: ['admin'] }); void client.invalidateQueries({ queryKey: ['teachers'] }); void client.invalidateQueries({ queryKey: ['account', 'reviews'] }) }
  return <section id="teachers" className="space-y-4 admin-event-section"><h2 className="text-xl font-semibold">בדיקת מורים</h2>
      <Link className="button-link" to="/admin/history?source=teachers">היסטוריית החלטות פרופילים</Link>
      {teacherId ? <Link className="button-link" to="/admin/onboarding">כל פרופילי המורים</Link> : null}
      <label className="admin-filter-label">סטטוס<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="pending">ממתינים לבדיקה</option><option value="draft">טיוטות</option><option value="published">מפורסמים</option><option value="suspended">מושהים</option></select></label>
      {teachers.isPending ? <WorkspaceState>טוען מורים...</WorkspaceState> : null}
      {teachers.isError ? <WorkspaceState tone="error"><p>טעינת המורים נכשלה.</p><Button onClick={() => void teachers.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
      {teachers.data?.items.length === 0 ? <WorkspaceState>אין מורים בסטטוס זה.</WorkspaceState> : null}
      <div className="inquiry-list">{teachers.data?.items.map((teacher) => <TeacherReview key={teacher.id} teacher={teacher} onSaved={refresh} />)}</div>
      <nav className="flex gap-3" aria-label="עמודי מורים"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>הקודם</Button><span>{page}</span><Button variant="outline" disabled={!teachers.data?.hasMore} onClick={() => setPage(page + 1)}>הבא</Button></nav>
    </section>
}

export function AdminReviewsPage() {
  const client = useQueryClient()
  const [reviewPage, setReviewPage] = useState(1)
  const [reviewFilter, setReviewFilter] = useState('')
  const reviews = useQuery({ queryKey: ['admin', 'reviews', reviewFilter, reviewPage], queryFn: () => apiRequest<PaginatedDto<AdminReview>>(`/admin/reviews?page=${reviewPage}&limit=10${reviewFilter ? `&status=${reviewFilter}` : ''}`) })
  const refresh = () => { void client.invalidateQueries({ queryKey: ['admin'] }); void client.invalidateQueries({ queryKey: ['account', 'reviews'] }) }
  return <section className="space-y-4"><h2 className="text-xl font-semibold">ביקורות ותגובות מורים</h2><label className="admin-filter-label">מצב הביקורת<select value={reviewFilter} onChange={(event) => { setReviewFilter(event.target.value); setReviewPage(1) }}><option value="">כל הביקורות</option><option value="pending">ממתינות לבדיקה</option><option value="published">פורסמו</option><option value="rejected">לא אושרו</option></select></label>{reviews.isPending ? <WorkspaceState>טוען ביקורות...</WorkspaceState> : null}{reviews.isError ? <WorkspaceState tone="error"><p>לא ניתן לטעון ביקורות.</p><Button onClick={() => void reviews.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}{reviews.isSuccess && !reviews.data.items.length ? <WorkspaceState>אין ביקורות במצב הזה.</WorkspaceState> : null}<div className="inquiry-list">{reviews.data?.items.map((review) => <ReviewModeration review={review} key={review.id} onSaved={refresh} />)}</div><nav className="review-actions" aria-label="עמודי ביקורות לניהול"><Button variant="outline" disabled={reviewPage === 1 || reviews.isFetching} onClick={() => setReviewPage(reviewPage - 1)}>הקודם</Button><span>עמוד {reviewPage}</span><Button variant="outline" disabled={!reviews.data?.hasMore || reviews.isFetching} onClick={() => setReviewPage(reviewPage + 1)}>הבא</Button></nav></section>
}

function TeacherReview({ teacher, onSaved }: { teacher: ReviewTeacher; onSaved: () => void }) {
  const [reason, setReason] = useState('')
  const [params] = useSearchParams()
  const ref = useRef<HTMLElement>(null)
  const focused = params.get('teacher') === teacher.id
  useEffect(() => { if (focused) ref.current?.focus() }, [focused])
  const decision = useMutation({
    mutationFn: (action: 'approve' | 'reject') => apiRequest(`/admin/teachers/${teacher.id}/${action}`, { method: 'POST', ...(action === 'reject' ? { body: { reason: reason.trim() } } : {}) }),
    onSuccess: () => { onSaved(); toast.success('ההחלטה נשמרה והודעות נוספו לתור') },
    onError: () => toast.error('ההחלטה לא נשמרה. ייתכן שהפרופיל כבר עודכן.'),
  })
  return <article ref={ref} tabIndex={-1} className="inquiry-card space-y-3">
    <header className="flex flex-wrap gap-4"><h3 className="text-lg font-semibold">{teacher.profile.first_name} {teacher.profile.last_name}</h3>{teacher.avatarUrl ? <img className="w-24 h-24 object-contain" src={teacher.avatarUrl} alt="תמונת המורה לבדיקה" /> : null}</header>
    <strong>{teacher.headline}</strong><p className="whitespace-pre-wrap break-words">{teacher.bio}</p>
    <p>{teacher.subjects.map((item) => item.subject.name_he).join(' · ')}</p><p>{teacher.levels.map((item) => item.level.name_he).join(' · ')}</p>
    <p className="break-all">{teacher.profile.contact_email} · {teacher.profile.phone}</p>
    <Link className="button-link" to={`/admin/history?source=teachers&teacher=${encodeURIComponent(teacher.id)}`}>היסטוריית הפרופיל</Link>
    {teacher.profile_status === 'draft' && teacher.review_reason ? <p><strong>הוחזר לתיקון · ממתין למורה.</strong> הפרופיל לא פורסם. המורה יכול לתקן ולשלוח שוב לבדיקה.</p> : null}
    {teacher.review_reason ? <p className="whitespace-pre-wrap break-words"><strong>הסיבה שנמסרה למורה: </strong>{teacher.review_reason}</p> : null}
    {teacher.profile_status === 'pending' ? <><label className="block space-y-2"><span>סיבת החזרה לתיקון</span><Textarea maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="flex flex-wrap gap-3"><Button disabled={decision.isPending} onClick={() => decision.mutate('approve')}><Check />אישור ופרסום</Button><Button variant="outline" disabled={decision.isPending || reason.trim().length < 5} onClick={() => decision.mutate('reject')}><X />החזרה לתיקון</Button></div></> : null}
  </article>
}

function ReviewModeration({ review, onSaved }: { review: AdminReview; onSaved: () => void }) {
  const mutation = useMutation({ mutationFn: ({ reply, status }: { reply: boolean; status: 'published' | 'rejected' }) => apiRequest(`/admin/reviews/${review.id}${reply ? '/reply' : ''}`, { method: 'PATCH', body: { status } }), onSuccess: () => { onSaved(); toast.success('מצב הפרסום עודכן') } })
  return <article className="inquiry-card space-y-4"><header><h3>{review.teacher?.headline || 'ביקורת מורה'}</h3><span>{review.rating} מתוך 5</span></header><p className="whitespace-pre-wrap break-words">{review.body || 'דירוג ללא טקסט'}</p><p>מצב הביקורת: {review.status === 'published' ? 'פורסמה' : review.status === 'pending' ? 'ממתינה לבדיקה' : 'לא אושרה'}</p><div className="review-actions"><Button variant="outline" disabled={mutation.isPending || review.status === 'published'} onClick={() => mutation.mutate({ reply: false, status: 'published' })}><Check />פרסום הביקורת</Button><Button variant="outline" disabled={mutation.isPending || review.status === 'rejected'} onClick={() => mutation.mutate({ reply: false, status: 'rejected' })}><X />הסרה מפרסום</Button></div>{review.teacher_reply ? <div className="review-teacher-reply"><strong>תגובת המורה</strong><p>{review.teacher_reply}</p><p>מצב: {review.teacher_reply_status === 'published' ? 'פורסמה' : review.teacher_reply_status === 'pending' ? 'ממתינה לבדיקה' : 'לא אושרה'}</p><div className="review-actions"><Button variant="outline" disabled={mutation.isPending || review.teacher_reply_status === 'published'} onClick={() => mutation.mutate({ reply: true, status: 'published' })}><Check />אישור התגובה</Button><Button variant="outline" disabled={mutation.isPending || review.teacher_reply_status === 'rejected'} onClick={() => mutation.mutate({ reply: true, status: 'rejected' })}><X />דחיית התגובה</Button></div></div> : null}{mutation.isError ? <p role="alert" className="form-error">העדכון לא הושלם. ייתכן שהתוכן השתנה.</p> : null}</article>
}