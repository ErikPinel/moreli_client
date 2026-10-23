import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquareReply, Pencil, Star, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { AccountShell, WorkspaceState } from '@/features/account/AccountShell'
import { accountKeys } from '@/features/account/useAccountData'
import type { PaginatedDto, ReceivedReviewDto } from '@/types/api'

export function TeacherReviewsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [replying, setReplying] = useState<ReceivedReviewDto | null>(null)
  const [removing, setRemoving] = useState<ReceivedReviewDto | null>(null)
  const reviews = useQuery({ queryKey: [...accountKeys.reviews, 'teacher', page], queryFn: () => apiRequest<PaginatedDto<ReceivedReviewDto>>(`${endpoints.receivedReviews}?page=${page}&limit=20`) })
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: accountKeys.reviews }); void queryClient.invalidateQueries({ queryKey: ['teachers'] }) }
  const remove = useMutation({ mutationFn: (id: string) => apiRequest(endpoints.reviewReply(id), { method: 'DELETE' }), onSuccess: () => { refresh(); setRemoving(null); toast.success('התגובה נמחקה') } })
  return <AccountShell title="ביקורות ותגובות" description="ביקורות שפורסמו על ההוראה שלכם, והתגובות שלכם אליהן.">
    {reviews.isPending ? <WorkspaceState>טוען ביקורות...</WorkspaceState> : null}
    {reviews.isError ? <WorkspaceState tone="error"><p>לא הצלחנו לטעון את הביקורות.</p><Button variant="outline" onClick={() => void reviews.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {reviews.isSuccess && !reviews.data.items.length ? <WorkspaceState><Star /><h2>עדיין אין ביקורות</h2><p>ביקורות תלמידים שיפורסמו עליכם יופיעו כאן.</p></WorkspaceState> : null}
    <div className="inquiry-list">{reviews.data?.items.map((review) => <article className="inquiry-card space-y-4" key={review.id}><header><div className="review-stars" aria-label={`${review.rating} מתוך 5`}>{[1, 2, 3, 4, 5].map((rating) => <Star aria-hidden="true" key={rating} className={rating <= review.rating ? 'is-filled' : ''} />)}</div><time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString('he-IL')}</time></header><p className="whitespace-pre-wrap break-words">{review.body || 'דירוג ללא טקסט'}</p>{review.teacher_reply ? <div className="review-teacher-reply"><strong>התגובה שלכם</strong><p>{review.teacher_reply}</p><span className={`status-pill status-pill--${review.teacher_reply_status}`}>{review.teacher_reply_status === 'published' ? 'פורסמה' : review.teacher_reply_status === 'pending' ? 'ממתינה לבדיקה' : 'לא אושרה'}</span></div> : null}<div className="review-actions"><Button variant="outline" onClick={() => setReplying(review)}>{review.teacher_reply ? <Pencil /> : <MessageSquareReply />}{review.teacher_reply ? 'עריכת תגובה' : 'תגובה לביקורת'}</Button>{review.teacher_reply ? <Button variant="ghost" onClick={() => { remove.reset(); setRemoving(review) }}><Trash2 />מחיקת התגובה</Button> : null}</div></article>)}</div>
    {page > 1 || reviews.data?.hasMore ? <nav className="review-actions" aria-label="עמודי ביקורות"><Button variant="outline" disabled={page === 1 || reviews.isFetching} onClick={() => setPage(page - 1)}>הקודם</Button><span>עמוד {page}</span><Button variant="outline" disabled={!reviews.data?.hasMore || reviews.isFetching} onClick={() => setPage(page + 1)}>הבא</Button></nav> : null}
    {replying ? <ReplyEditor review={replying} onClose={() => setReplying(null)} onSaved={() => { refresh(); setReplying(null) }} /> : null}
    <Dialog open={Boolean(removing)} onOpenChange={(open) => { if (!open && !remove.isPending) setRemoving(null) }}><DialogContent dir="rtl" showCloseButton={!remove.isPending}><DialogHeader><DialogTitle>למחוק את התגובה?</DialogTitle><DialogDescription>התגובה שלכם תוסר. ביקורת התלמיד והדירוג לא ישתנו.</DialogDescription></DialogHeader>{remove.isError ? <p role="alert" className="form-error">לא ניתן למחוק את התגובה כרגע.</p> : null}<DialogFooter><Button variant="outline" disabled={remove.isPending} onClick={() => setRemoving(null)}>ביטול</Button><Button variant="destructive" disabled={remove.isPending} onClick={() => { if (removing) remove.mutate(removing.id) }}><Trash2 />מחיקת התגובה</Button></DialogFooter></DialogContent></Dialog>
  </AccountShell>
}

function ReplyEditor({ review, onClose, onSaved }: { review: ReceivedReviewDto; onClose: () => void; onSaved: () => void }) {
  const [body, setBody] = useState(review.teacher_reply ?? '')
  const fieldId = useId()
  const mutation = useMutation({ mutationFn: () => apiRequest(endpoints.reviewReply(review.id), { method: 'POST', body: { body: body.trim() } }), onSuccess: () => { toast.success('התגובה נשמרה ונשלחה לבדיקה'); onSaved() } })
  return <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose() }}><DialogContent className="sm:max-w-lg" dir="rtl" showCloseButton={!mutation.isPending}><DialogHeader><DialogTitle>תגובה לביקורת</DialogTitle><DialogDescription>התגובה תופיע בפרופיל רק לאחר בדיקה. אין לפרסם פרטי קשר, פרטים אישיים של התלמיד או תוכן פוגעני.</DialogDescription></DialogHeader><form className="review-editor" onSubmit={(event) => { event.preventDefault(); if (!mutation.isPending) mutation.mutate() }}><label htmlFor={fieldId}>התגובה שלכם</label><Textarea id={fieldId} required minLength={5} maxLength={2000} rows={5} value={body} disabled={mutation.isPending} onChange={(event) => setBody(event.target.value)} /><p className="text-xs text-muted-foreground" dir="ltr">{body.length} / 2000</p>{mutation.isError ? <p role="alert" className="form-error">התגובה לא נשמרה. ייתכן שהביקורת השתנתה או הוסרה.</p> : null}<div className="review-actions"><Button variant="outline" type="button" disabled={mutation.isPending} onClick={onClose}>ביטול</Button><Button type="submit" disabled={body.trim().length < 5 || mutation.isPending}><MessageSquareReply />{mutation.isPending ? 'שומר...' : 'שליחה לבדיקה'}</Button></div></form></DialogContent></Dialog>
}