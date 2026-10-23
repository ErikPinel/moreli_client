import { useMutation } from '@tanstack/react-query'
import { Send, Star } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { ReviewDto } from '@/types/api'

type ReviewEditorProps = {
  review?: ReviewDto
  teacherId?: string
  name: string
  onClose: () => void
  onSaved: () => void
}

export function ReviewEditor({ review, teacherId, name, onClose, onSaved }: ReviewEditorProps) {
  const [rating, setRating] = useState(review?.rating ?? 0)
  const [body, setBody] = useState(review?.body ?? '')
  const [confirmed, setConfirmed] = useState(false)
  const fieldId = useId()
  const mutation = useMutation({
    mutationFn: () => apiRequest<ReviewDto>(review ? endpoints.review(review.id) : endpoints.reviews, {
      method: review ? 'PATCH' : 'POST', body: { rating, body: body.trim(), ...(!review ? { teacherId } : {}) },
    }),
    onSuccess: () => { toast.success(review ? 'העריכה נשמרה והביקורת נשלחה לבדיקה' : 'הביקורת פורסמה'); onSaved() },
  })
  return <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose() }}>
    <DialogContent className="sm:max-w-lg max-h-[90svh] overflow-y-auto" dir="rtl" showCloseButton={!mutation.isPending}>
      <DialogHeader>
        <DialogTitle>{review ? 'עריכת הביקורת' : 'דירוג של'} {name}</DialogTitle>
        <DialogDescription>{review ? 'עריכה מחזירה את הביקורת לבדיקה ומסירה תגובה קודמת של המורה. רק לאחר אישור היא תופיע שוב בפרופיל.' : 'בחרו דירוג בין 1 ל־5. אפשר להוסיף תגובה, אבל אין חובה. אין צורך בשיעור שהוזמן באתר. אין לפרסם מידע אישי או תוכן פוגעני.'}</DialogDescription>
      </DialogHeader>
      <form className="review-editor" onSubmit={(event) => { event.preventDefault(); if (confirmed && rating >= 1 && rating <= 5 && !mutation.isPending) mutation.mutate() }}>
        <fieldset disabled={mutation.isPending}>
          <legend>הדירוג שלכם · חובה</legend>
          <div className="review-rating-picker" dir="ltr">{[1, 2, 3, 4, 5].map((value) => <label key={value} title={`${value} מתוך 5`}>
            <input className="sr-only" type="radio" name={`${fieldId}-rating`} value={value} checked={rating === value} onChange={() => setRating(value)} required />
            <Star aria-hidden="true" className={value <= rating ? 'is-filled' : ''} /><span className="sr-only">{value} מתוך 5</span>
          </label>)}</div>
        </fieldset>
        <label htmlFor={fieldId}>תגובה <span className="text-muted-foreground">(לא חובה)</span></label>
        <Textarea id={fieldId} maxLength={3000} rows={5} value={body} onChange={(event) => setBody(event.target.value)} disabled={mutation.isPending} />
        <p className="text-xs text-muted-foreground" dir="ltr">{body.length} / 3000</p>
        <label className="review-confirmation"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={mutation.isPending} required /><span>הדירוג מתאר את החוויה האישית שלי עם המורה.</span></label>
        {mutation.isError ? <p role="alert" className="form-error">{mutation.error.message}</p> : null}
        <div className="review-actions">
          <Button variant="outline" type="button" disabled={mutation.isPending} onClick={onClose}>ביטול</Button>
          <Button type="submit" disabled={!confirmed || rating < 1 || mutation.isPending}><Send />{mutation.isPending ? 'שומר...' : review ? 'שליחת העריכה לבדיקה' : 'פרסום דירוג'}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
}