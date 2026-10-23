import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, MessageCircle, Pencil, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ReviewEditor } from '@/features/account/ReviewEditor'
import { AccountShell, InquiryStatusFilter, WorkspaceState } from '@/features/account/AccountShell'
import { accountKeys, useFavorites, useInquiries, useMyReviews } from '@/features/account/useAccountData'
import { TeacherCard } from '@/features/teachers/components/TeacherCard'
import type { InquiryDto, ReviewDto } from '@/types/api'

export function StudentFavoritesPage() {
  const queryClient = useQueryClient()
  const favoritesQuery = useFavorites()
  const remove = useMutation({
    mutationFn: (teacherId: string) => apiRequest(endpoints.favorite(teacherId), { method: 'DELETE' }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: accountKeys.favorites }); toast.success('המורה הוסר מהמועדפים') },
    onError: () => toast.error('לא הצלחנו להסיר את המורה'),
  })

  return <AccountShell title="מורים שמורים" description="רשימת המורים שתרצו לחזור אליהם בהמשך.">
    {favoritesQuery.isPending ? <WorkspaceState>טוען מורים שמורים...</WorkspaceState> : null}
    {favoritesQuery.isError ? <WorkspaceState tone="error">לא הצלחנו לטעון את המועדפים.</WorkspaceState> : null}
    {favoritesQuery.data?.length === 0 ? <WorkspaceState><Heart /><h2>עוד לא שמרתם מורים</h2><p>לחצו על הלב בכרטיס של מורה כדי לשמור אותו כאן.</p></WorkspaceState> : null}
    <div className="teacher-grid">
      {favoritesQuery.data?.map((teacher) => <div className="saved-teacher" key={teacher.id}>
        <TeacherCard teacher={teacher} />
        <div><Link className="button-link" to={`/teachers/${teacher.slug}?schedule=1`}><MessageCircle />בקשת שיעור</Link><Button variant="outline" onClick={() => remove.mutate(teacher.id)}><Trash2 />הסרה</Button></div>
      </div>)}
    </div>
  </AccountShell>
}

export function StudentInquiriesPage() {
  const [status, setStatus] = useState<InquiryDto['status'] | ''>('')
  const inquiriesQuery = useInquiries('student', status || undefined)
  return <AccountShell title="הפניות שלי" description="עקבו אחרי הפניות ששלחתם והמענה שקיבלתם מהמורים.">
    <InquiryStatusFilter value={status} onChange={setStatus} />
    {inquiriesQuery.isPending ? <WorkspaceState>טוען פניות...</WorkspaceState> : null}
    {inquiriesQuery.isError ? <WorkspaceState tone="error"><p>לא הצלחנו לטעון את הפניות.</p><Button onClick={() => void inquiriesQuery.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {inquiriesQuery.data?.items.length === 0 ? <WorkspaceState><MessageCircle /><h2>{status ? 'אין פניות במצב הזה' : 'עוד לא שלחתם פניות'}</h2>{status ? <Button variant="outline" onClick={() => setStatus('')}>כל הפניות</Button> : <Link className="button-link" to="/teachers">מציאת מורה</Link>}</WorkspaceState> : null}
    <div className="inquiry-list">{inquiriesQuery.data?.items.map((inquiry) => <InquiryCard inquiry={inquiry} key={inquiry.id} />)}</div>
    {inquiriesQuery.data?.items.length ? <nav className="inquiry-detail-links" aria-label="פרטי שיעורים">{inquiriesQuery.data.items.map((inquiry) => <Link className="text-link" to={`/student/inquiries/${inquiry.id}`} key={inquiry.id}>פרטי השיעור עם {teacherName(inquiry)}</Link>)}</nav> : null}
    {inquiriesQuery.hasNextPage ? <Button variant="outline" disabled={inquiriesQuery.isFetchingNextPage} onClick={() => void inquiriesQuery.fetchNextPage()}>פניות נוספות</Button> : null}
  </AccountShell>
}

export function StudentReviewsPage() {
  const queryClient = useQueryClient()
  const reviewsQuery = useMyReviews()
  const [editing, setEditing] = useState<ReviewDto | null>(null)
  const [deleting, setDeleting] = useState<ReviewDto | null>(null)
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: accountKeys.reviews }); void queryClient.invalidateQueries({ queryKey: ['teachers'] }); void queryClient.invalidateQueries({ queryKey: accountKeys.favorites }) }
  const remove = useMutation({ mutationFn: (id: string) => apiRequest(endpoints.review(id), { method: 'DELETE' }), onSuccess: () => { refresh(); setDeleting(null); toast.success('הביקורת נמחקה') } })
  return <AccountShell title="הביקורות שלי" description="דירוג של 1–5 הוא חובה; תגובה היא לבחירתכם. אין צורך בהזמנת שיעור באתר." actions={<Button asChild><Link to="/teachers"><Star />דירוג מורה</Link></Button>}>
    {reviewsQuery.isPending ? <WorkspaceState>טוען ביקורות...</WorkspaceState> : null}
    {reviewsQuery.isError ? <WorkspaceState tone="error"><p>לא הצלחנו לטעון את הביקורות.</p><Button variant="outline" onClick={() => void reviewsQuery.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    <div className="review-list">{reviewsQuery.data?.map((review) => <article key={review.id}><div className="review-stars" aria-label={`${review.rating} מתוך 5`}>{Array.from({ length: 5 }, (_, index) => <Star aria-hidden="true" key={index} className={index < review.rating ? 'is-filled' : ''} />)}<span>{review.rating} מתוך 5</span></div><p className="whitespace-pre-wrap break-words">{review.body}</p><span className={`status-pill status-pill--${review.status}`}>{reviewStatus(review.status)}</span><time dateTime={review.created_at}>{formatDate(review.created_at)}</time>{review.teacher_reply && review.teacher_reply_status === 'published' ? <blockquote className="review-teacher-reply"><strong>תגובת המורה</strong><p>{review.teacher_reply}</p></blockquote> : null}<div className="review-actions"><Button variant="outline" onClick={() => setEditing(review)}><Pencil />עריכה</Button><Button variant="ghost" onClick={() => { remove.reset(); setDeleting(review) }}><Trash2 />מחיקה</Button></div></article>)}</div>
    {reviewsQuery.isSuccess && reviewsQuery.data.length === 0 ? <WorkspaceState><Star /><h2>עדיין אין דירוגים שלכם</h2><p>פתחו פרופיל של מורה ולחצו על הוספת דירוג. אפשר לפרסם גם בלי תגובה.</p><Link className="button-link" to="/teachers">בחירת מורה לדירוג</Link></WorkspaceState> : null}
    {editing ? <ReviewEditor review={editing} name="המורה" onClose={() => setEditing(null)} onSaved={() => { refresh(); setEditing(null) }} /> : null}
    <Dialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open && !remove.isPending) setDeleting(null) }}><DialogContent dir="rtl" showCloseButton={!remove.isPending}><DialogHeader><DialogTitle>למחוק את הביקורת?</DialogTitle><DialogDescription>הביקורת ותגובת המורה יימחקו. לא ניתן לבטל את הפעולה.</DialogDescription></DialogHeader>{remove.isError ? <p role="alert" className="form-error">המחיקה לא הושלמה. רעננו ובדקו לפני ניסיון נוסף.</p> : null}<DialogFooter><Button variant="outline" disabled={remove.isPending} onClick={() => setDeleting(null)}>ביטול</Button><Button variant="destructive" disabled={remove.isPending} onClick={() => { if (deleting) remove.mutate(deleting.id) }}><Trash2 />{remove.isPending ? 'מוחק...' : 'מחיקת הביקורת'}</Button></DialogFooter></DialogContent></Dialog>
  </AccountShell>
}

function InquiryCard({ inquiry }: { inquiry: InquiryDto }) {
  const profile = inquiry.teacher?.profile
  return <article className="inquiry-card">
    <header><div><span className={`status-pill status-pill--${inquiry.status}`}>{inquiryStatus(inquiry.status)}</span><h2>{inquiry.teacher?.slug ? <Link to={`/teachers/${inquiry.teacher.slug}`}>{teacherName(inquiry)}</Link> : teacherName(inquiry)}</h2></div><time>{formatDate(inquiry.created_at)}</time></header>
    {inquiry.requested_start_at ? <p>{new Intl.DateTimeFormat('he-IL', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jerusalem' }).format(new Date(inquiry.requested_start_at))} · {inquiry.lesson_mode === 'in_person' ? 'פרונטלי' : 'אונליין'} · שעון ישראל</p> : null}
    <blockquote>{inquiry.message}</blockquote>
    <p>{inquiry.status === 'accepted' ? 'הפנייה התקבלה. השיעור והמועד המעודכן מופיעים בלוח השיעורים. אפשר לתאם ישירות את פרטי המפגש.' : inquiry.status === 'sent' ? 'ממתינים למענה מהמורה. פרטי הקשר יופיעו כאן לאחר קבלת הפנייה.' : inquiry.status === 'viewed' ? 'המורה קרא/ה את הפנייה. עדיין ממתינים להחלטה.' : inquiry.status === 'expired' ? 'לא התקבל מענה בזמן. אפשר לשלוח בקשה חדשה או לפנות למורה אחר.' : 'המורה לא קיבל/ה את הפנייה. אפשר להמשיך למורה אחר.'}</p>
    <Link className="text-link" to={`/student/inquiries/${inquiry.id}`}>פרטי הפנייה והמשך הטיפול</Link>
    {inquiry.status === 'accepted' ? <div className="inquiry-contact"><strong>פרטי המורה</strong>{profile?.contact_email ? <a href={`mailto:${profile.contact_email}`}>{profile.contact_email}</a> : null}{profile?.phone ? <a href={`tel:${profile.phone}`}>{profile.phone}</a> : null}<Link to="/student/lessons">לוח השיעורים שלי</Link></div> : ['declined', 'expired'].includes(inquiry.status) ? <Link className="button-link" to="/teachers">מציאת מורה אחר</Link> : null}
  </article>
}

function teacherName(inquiry?: InquiryDto) {
  const profile = inquiry?.teacher?.profile
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'המורה'
}

function inquiryStatus(status: InquiryDto['status']) { return ({ sent: 'נשלחה', viewed: 'נצפתה', accepted: 'התקבלה', declined: 'נדחתה', expired: 'פגה' })[status] }
function reviewStatus(status: ReviewDto['status']) { return ({ pending: 'ממתינה לאישור', published: 'פורסמה', hidden: 'מוסתרת', rejected: 'נדחתה' })[status] }
function formatDate(value: string) { return new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium' }).format(new Date(value)) }