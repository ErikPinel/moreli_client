import { useMutation, useQuery } from '@tanstack/react-query'
import { DateTime } from 'luxon'
import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { LessonCalendarDto, LessonDto } from '@/types/api'
import { LessonDateInput } from './LessonDateInput'
import { lessonZone, useRefreshLessons } from './lesson-data'
import { useAcceptedStudents } from './useAccountData'

export function CreateLessonDialog({ student, lesson, onClose }: { student?: { id: string; name: string }; lesson?: LessonDto; onClose: () => void }) {
  const refresh = useRefreshLessons()
  const students = useAcceptedStudents(!student && !lesson)
  const [studentId, setStudentId] = useState(student?.id ?? lesson?.student_id ?? '')
  const [requestKey] = useState(() => crypto.randomUUID())
  const [duration, setDuration] = useState(lesson?.starts_at && lesson.ends_at ? (Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at)) / 60000 : 60)
  const [date, setDate] = useState(lesson?.starts_at ? DateTime.fromISO(lesson.starts_at).setZone(lessonZone).toISODate()! : DateTime.now().setZone(lessonZone).toISODate()!)
  const [start, setStart] = useState(lesson?.starts_at ? DateTime.fromISO(lesson.starts_at).toUTC().toISO()! : '')
  const [mode, setMode] = useState<'online' | 'in_person'>(lesson?.mode ?? 'online')
  const calendar = useQuery({
    queryKey: ['lessons', 'available-times', duration, lesson?.id],
    queryFn: () => apiRequest<LessonCalendarDto>(`${endpoints.lessonTimes}?duration=${duration}${lesson ? `&lessonId=${lesson.id}` : ''}`),
    staleTime: 0,
  })
  const times = calendar.data?.days.find(day => day.date === date)?.times ?? []
  const selected = times.find(time => Date.parse(time.startAt) === Date.parse(start || times[0]?.startAt || ''))
  const people = new Map(students.data?.pages.flatMap(page => page.items).map(inquiry => [inquiry.student_id, [inquiry.student?.first_name, inquiry.student?.last_name].filter(Boolean).join(' ') || 'תלמיד/ה']))
  const save = useMutation({
    mutationFn: () => apiRequest<LessonDto>(lesson ? endpoints.lessonRecord(lesson.id) : endpoints.lessons, { method: lesson ? 'PATCH' : 'POST', body: { requestKey, studentId, startsAt: selected?.startAt, endsAt: selected?.endAt, mode } }),
    onSuccess: () => { refresh(); toast.success(lesson ? 'מועד השיעור עודכן. התלמיד יקבל אימייל והתראה באתר.' : 'השיעור נקבע. התלמיד יקבל אימייל והתראה באתר.'); onClose() },
    onError: () => { void calendar.refetch() },
  })
  return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose() }}><DialogContent dir="rtl" showCloseButton={!save.isPending}><DialogHeader><DialogTitle>{lesson ? 'עדכון מועד השיעור' : 'קביעת שיעור נוסף'}</DialogTitle><DialogDescription>השיעור יופיע מיד בלוח של שני המשתתפים. לתלמיד יישלחו אימייל והתראה באתר; אין צורך באישור נוסף ואין חיוב אוטומטי.</DialogDescription></DialogHeader>
    <form className="lesson-form" onSubmit={event => { event.preventDefault(); if (selected && studentId && !save.isPending) save.mutate() }}><fieldset disabled={save.isPending}>
      {student || lesson ? <p><strong>{student?.name ?? [lesson?.student.first_name, lesson?.student.last_name].filter(Boolean).join(' ')}</strong></p> : <><label>תלמיד/ה<select required value={studentId} onChange={event => setStudentId(event.target.value)}><option value="">בחרו תלמיד שהפנייה שלו התקבלה</option>{[...people].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>{students.isError ? <p role="alert">לא ניתן לטעון תלמידים. <button type="button" onClick={() => void students.refetch()}>ניסיון נוסף</button></p> : students.isPending ? <p role="status">טוען תלמידים...</p> : null}{students.hasNextPage ? <Button type="button" variant="ghost" disabled={students.isFetchingNextPage} onClick={() => void students.fetchNextPage()}>טעינת תלמידים נוספים</Button> : null}</>}
      <label>משך השיעור<select value={duration} onChange={event => setDuration(Number(event.target.value))}>{[30, 45, 60, 90, 120, 180, 240].map(minutes => <option key={minutes} value={minutes}>{minutes} דקות</option>)}</select></label>
      {calendar.isPending ? <p role="status">בודק מועדים פנויים...</p> : calendar.isError ? <p role="alert">לא ניתן לטעון זמינות. <button type="button" onClick={() => void calendar.refetch()}>ניסיון נוסף</button></p> : <><LessonDateInput key={lesson?.id ?? 'new'} value={date} min={DateTime.now().setZone(lessonZone).toISODate()!} isAvailable={candidate => Boolean(calendar.data.days.find(day => day.date === candidate)?.times.length)} onChange={value => { setDate(value); setStart('') }} /><label>שעת התחלה · שעון ישראל<select required value={selected?.startAt ?? ''} onChange={event => setStart(event.target.value)}><option value="" disabled>{times.length ? 'בחרו מועד פנוי' : 'אין שעות פנויות בתאריך הזה'}</option>{times.map(time => <option value={time.startAt} key={time.startAt}>{time.time}</option>)}</select></label>{start && !selected ? <p role="alert" className="form-error">המועד שנבחר אינו פנוי למשך הזה. בחרו שעה אחרת.</p> : null}<p>אפשר לקבוע עד 90 יום מראש. מוצגים רק חלונות פנויים בזמינות שלכם; המערכת בודקת גם חפיפה עם שיעורי התלמיד.</p></>}
      <label>אופן המפגש<select value={mode} onChange={event => setMode(event.target.value === 'online' ? 'online' : 'in_person')}><option value="online">אונליין</option><option value="in_person">פרונטלי</option></select></label>
      {save.isError ? <p className="form-error" role="alert">{save.error.message}</p> : null}
      <div className="review-actions"><Button type="submit" disabled={!selected || !studentId || save.isPending || calendar.isFetching}><CalendarPlus aria-hidden="true" />{save.isPending ? 'שומר...' : lesson ? 'עדכון ושליחת הודעה' : 'קביעת שיעור ושליחת הודעה'}</Button><Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>ביטול</Button></div>
    </fieldset></form>
  </DialogContent></Dialog>
}
