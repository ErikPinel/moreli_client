import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, MessageCircle, Send, Star, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
    {inquiriesQuery.hasNextPage ? <Button variant="outline" disabled={inquiriesQuery.isFetchingNextPage} onClick={() => void inquiriesQuery.fetchNextPage()}>פניות נוספות</Button> : null}
  </AccountShell>
}

export function StudentReviewsPage() {
  const queryClient = useQueryClient()
  const inquiriesQuery = useInquiries('student')
  const reviewsQuery = useMyReviews()
  const [reviewing, setReviewing] = useState<InquiryDto | null>(null)
  const reviewedIds = new Set(reviewsQuery.data?.map((review) => review.inquiry_id))
  const eligible = inquiriesQuery.data?.items.filter((item) => item.status === 'accepted' && !reviewedIds.has(item.id)) ?? []
  return <AccountShell title="הביקורות שלי" description="שתפו תלמידים אחרים בחוויית הלימוד שלכם.">
    {(inquiriesQuery.isPending || reviewsQuery.isPending) ? <WorkspaceState>טוען ביקורות...</WorkspaceState> : null}
    {eligible.map((inquiry) => <article className="review-invitation" key={inquiry.id}><div><Star /><h2>איך היה ללמוד עם {teacherName(inquiry)}?</h2><p>הפנייה התקבלה ואפשר עכשיו לפרסם ביקורת.</p></div><Button onClick={() => setReviewing(inquiry)}>כתיבת ביקורת</Button></article>)}
    <div className="review-list">{reviewsQuery.data?.map((review) => <article key={review.id}><div className="review-stars" aria-label={`${review.rating} מתוך 5`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={index < review.rating ? 'is-filled' : ''} />)}</div><p>{review.body || 'דירוג ללא טקסט'}</p><span className={`status-pill status-pill--${review.status}`}>{reviewStatus(review.status)}</span><time>{formatDate(review.created_at)}</time></article>)}</div>
    {!reviewsQuery.isPending && reviewsQuery.data?.length === 0 && eligible.length === 0 ? <WorkspaceState><Star /><h2>עדיין אין ביקורות</h2><p>לאחר שמורה יקבל את הפנייה שלכם תוכלו לכתוב עליו ביקורת.</p></WorkspaceState> : null}
    {reviewing ? <ReviewComposer inquiry={reviewing} onClose={() => setReviewing(null)} onSaved={() => { void queryClient.invalidateQueries({ queryKey: accountKeys.reviews }); setReviewing(null) }} /> : null}
  </AccountShell>
}

function InquiryCard({ inquiry }: { inquiry: InquiryDto }) {
  const profile = inquiry.teacher?.profile
  return <article className="inquiry-card"><header><div><span className={`status-pill status-pill--${inquiry.status}`}>{inquiryStatus(inquiry.status)}</span><h2>{inquiry.teacher?.slug ? <Link to={`/teachers/${inquiry.teacher.slug}`}>{teacherName(inquiry)}</Link> : teacherName(inquiry)}</h2></div><time>{formatDate(inquiry.created_at)}</time></header>{inquiry.requested_start_at ? <p>{new Intl.DateTimeFormat('he-IL', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jerusalem' }).format(new Date(inquiry.requested_start_at))} · {inquiry.lesson_mode === 'in_person' ? 'פרונטלי' : 'אונליין'} · שעון ישראל</p> : null}<blockquote>{inquiry.message}</blockquote><p>{inquiry.status === 'accepted' ? 'המורה קיבל/ה את הפנייה. צרו קשר כדי לסכם את מועד השיעור; השעה שביקשתם אינה הזמנה שמורה.' : inquiry.status === 'sent' ? 'ממתינים למענה מהמורה. פרטי הקשר יופיעו כאן לאחר קבלת הפנייה.' : inquiry.status === 'viewed' ? 'המורה קרא/ה את הפנייה. עדיין ממתינים להחלטה.' : inquiry.status === 'expired' ? 'לא התקבל מענה בזמן. אפשר לשלוח בקשה חדשה או לפנות למורה אחר.' : 'המורה לא קיבל/ה את הפנייה. אפשר להמשיך למורה אחר.'}</p>{inquiry.status === 'accepted' ? <div className="inquiry-contact"><strong>פרטי המורה</strong>{profile?.contact_email ? <a href={`mailto:${profile.contact_email}`}>{profile.contact_email}</a> : null}{profile?.phone ? <a href={`tel:${profile.phone}`}>{profile.phone}</a> : null}</div> : ['declined', 'expired'].includes(inquiry.status) ? <Link className="button-link" to="/teachers">מציאת מורה אחר</Link> : null}</article>
}

function ReviewComposer({ inquiry, onClose, onSaved }: { inquiry: InquiryDto; onClose: () => void; onSaved: () => void }) {
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')
  const mutation = useMutation({
    mutationFn: () => apiRequest<ReviewDto>(endpoints.reviews, { method: 'POST', body: { inquiryId: inquiry.id, rating, ...(body ? { body } : {}) } }),
    onSuccess: () => { toast.success('הביקורת נשלחה'); onSaved() },
    onError: () => toast.error('לא הצלחנו לשלוח את הביקורת'),
  })
  return <div className="workspace-dialog" role="dialog" aria-modal="true"><form onSubmit={(event: FormEvent) => { event.preventDefault(); mutation.mutate() }}><button className="workspace-dialog__close" type="button" onClick={onClose}>×</button><h2>ביקורת על {teacherName(inquiry)}</h2><fieldset className="rating-picker"><legend>דירוג</legend>{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} onClick={() => setRating(value)} aria-label={`${value} כוכבים`}><Star className={value <= rating ? 'is-filled' : ''} /></button>)}</fieldset><Textarea maxLength={3000} rows={5} value={body} onChange={(event) => setBody(event.target.value)} placeholder="ספרו בקצרה על חוויית הלימוד" /><Button type="submit" disabled={mutation.isPending}><Send />פרסום ביקורת</Button></form></div>
}

function teacherName(inquiry: InquiryDto) {
  const profile = inquiry.teacher?.profile
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'המורה'
}

function inquiryStatus(status: InquiryDto['status']) { return ({ sent: 'נשלחה', viewed: 'נצפתה', accepted: 'התקבלה', declined: 'נדחתה', expired: 'פגה' })[status] }
function reviewStatus(status: ReviewDto['status']) { return ({ pending: 'ממתינה לאישור', published: 'פורסמה', hidden: 'מוסתרת', rejected: 'נדחתה' })[status] }
function formatDate(value: string) { return new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium' }).format(new Date(value)) }