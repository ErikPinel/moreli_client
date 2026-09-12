import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, Check, CheckCircle2, Clock3, MessageCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { TimeSelect } from '@/features/account/TimeSelect'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AccountShell, InquiryStatusFilter, WorkspaceState } from '@/features/account/AccountShell'
import { accountKeys, useAcceptedStudents, useInquiries, useTeacherProfile, useTeacherSchedule, useUnreadNotifications } from '@/features/account/useAccountData'
import type { AvailabilitySlotDto, InquiryDto } from '@/types/api'

const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
type EditableSlot = Pick<AvailabilitySlotDto, 'day_of_week' | 'start_time' | 'end_time'>

export function TeacherDashboardPage() {
  const profileQuery = useTeacherProfile()
  const inquiriesQuery = useInquiries('teacher')
  const scheduleQuery = useTeacherSchedule()
  const unreadQuery = useUnreadNotifications()
  const newInquiries = inquiriesQuery.isSuccess ? inquiriesQuery.data.items.filter((item) => ['sent', 'viewed'].includes(item.status)).length : null
  const accepted = inquiriesQuery.isSuccess ? inquiriesQuery.data.items.filter((item) => item.status === 'accepted').length : null
  const teacher = profileQuery.data
  return <AccountShell title="לוח הבקרה" description="תמונת מצב עדכנית של פרופיל ההוראה והפניות שלכם.">
    <div className="dashboard-stats"><article><MessageCircle /><div><strong>{newInquiries ?? '?'}</strong><span>ממתינות למענה</span></div></article><article><CheckCircle2 /><div><strong>{accepted ?? '?'}</strong><span>פניות שהתקבלו</span></div></article><article><CalendarDays /><div><strong>{scheduleQuery.isSuccess ? scheduleQuery.data.length : '?'}</strong><span>חלונות זמינות</span></div></article><article><Clock3 /><div><strong>{unreadQuery.isSuccess ? unreadQuery.data.count : '?'}</strong><span>התראות שלא נקראו</span></div></article></div>
    {inquiriesQuery.hasNextPage ? <p>ספירת הפניות מתייחסת ל-{inquiriesQuery.data?.items.length} הפניות האחרונות שנטענו. <Link to="/teacher/inquiries">לכל הפניות</Link></p> : null}
    {profileQuery.isError || scheduleQuery.isError || unreadQuery.isError ? <WorkspaceState tone="error"><p>חלק מנתוני לוח הבקרה לא נטענו.</p><Button variant="outline" onClick={() => { void profileQuery.refetch(); void scheduleQuery.refetch(); void unreadQuery.refetch() }}>ניסיון נוסף</Button></WorkspaceState> : null}
    {teacher ? <section className="dashboard-profile"><div><span className={`status-pill status-pill--${teacher.profile_status}`}>{teacher.profile_status === 'published' ? 'מפורסם' : teacher.profile_status === 'pending' ? 'ממתין לאישור' : teacher.profile_status === 'suspended' ? 'מושהה' : 'טיוטה'}</span><h2>{teacher.headline || 'הפרופיל המקצועי עדיין בהכנה'}</h2><p>{teacher.profile_status === 'published' ? 'הפרופיל זמין לתלמידים בחיפוש ובהתאמות.' : teacher.profile_status === 'pending' ? 'הפרופיל התקבל ונמצא בבדיקה. ההחלטה תופיע כאן ותישלח באימייל.' : teacher.profile_status === 'suspended' ? 'הפרופיל אינו מופיע בחיפוש. עריכת הפרטים אינה מבטלת את ההשהיה; נדרשת בדיקת מנהל.' : 'השלימו את כל פרטי החובה ושלחו את הפרופיל לבדיקה.'}</p></div><Link className="button-link" to="/teacher/onboarding">{teacher.profile_status === 'draft' ? 'השלמת הפרופיל' : 'עריכת פרטי ההוראה'}<ArrowLeft /></Link></section> : null}
    <section className="dashboard-section"><header><div><h2>פניות אחרונות</h2><p>פניות שנקראו עדיין ממתינות להחלטה שלכם.</p></div><Link to="/teacher/inquiries">לכל הפניות<ArrowLeft /></Link></header>{inquiriesQuery.isPending ? <WorkspaceState>טוען פניות...</WorkspaceState> : inquiriesQuery.isError ? <WorkspaceState tone="error"><p>לא הצלחנו לטעון פניות.</p><Button onClick={() => void inquiriesQuery.refetch()}>ניסיון נוסף</Button></WorkspaceState> : inquiriesQuery.data?.items.length ? <div className="inquiry-list">{inquiriesQuery.data.items.slice(0, 3).map((inquiry) => <TeacherInquirySummary inquiry={inquiry} key={inquiry.id} />)}</div> : <WorkspaceState>אין פניות כרגע.</WorkspaceState>}</section>
  </AccountShell>
}

export function TeacherInquiriesPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<InquiryDto['status'] | ''>('')
  const [decision, setDecision] = useState<{ inquiry: InquiryDto; status: 'accepted' | 'declined' } | null>(null)
  const inquiriesQuery = useInquiries('teacher', status || undefined)
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: accountKeys.inquiries('teacher') })
    void queryClient.invalidateQueries({ queryKey: accountKeys.notifications })
    void queryClient.invalidateQueries({ queryKey: accountKeys.unreadNotifications })
  }
  const view = useMutation({ mutationFn: (id: string) => apiRequest(endpoints.viewInquiry(id), { method: 'PATCH' }), onSuccess: refresh, onError: () => toast.error('לא הצלחנו לסמן את הפנייה כנקראה') })
  const respond = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'accepted' | 'declined' }) => apiRequest(endpoints.respondInquiry(id), { method: 'PATCH', body: { status } }),
    onSuccess: (_, variables) => { refresh(); setDecision(null); toast.success(variables.status === 'accepted' ? 'הפנייה התקבלה. פרטי הקשר זמינים כעת.' : 'הפנייה נדחתה והתלמיד יקבל עדכון.') },
    onError: () => { refresh(); toast.error('לא הצלחנו לעדכן. ייתכן שהפנייה כבר נענתה או פגה; רעננו ובדקו את המצב.') },
  })
  function chooseDecision(inquiry: InquiryDto, nextStatus: 'accepted' | 'declined') {
    respond.reset()
    setDecision({ inquiry, status: nextStatus })
  }
  return <AccountShell title="פניות מתלמידים" description="קראו את מטרת הלימוד ואשרו פניות שמתאימות לכם." actions={inquiriesQuery.hasNextPage ? <Button variant="outline" disabled={inquiriesQuery.isFetchingNextPage} onClick={() => void inquiriesQuery.fetchNextPage()}>פניות נוספות</Button> : undefined}>
    <InquiryStatusFilter value={status} onChange={setStatus} />
    {inquiriesQuery.isPending ? <WorkspaceState>טוען פניות...</WorkspaceState> : null}
    {inquiriesQuery.isError ? <WorkspaceState tone="error"><p>לא הצלחנו לטעון פניות.</p><Button onClick={() => void inquiriesQuery.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {inquiriesQuery.data?.items.length === 0 ? <WorkspaceState><MessageCircle /><h2>{status ? 'אין פניות במצב הזה' : 'אין פניות כרגע'}</h2>{status ? <Button variant="outline" onClick={() => setStatus('')}>כל הפניות</Button> : <Link to="/teacher/onboarding">לפרופיל ההוראה</Link>}</WorkspaceState> : null}
    <div className="inquiry-list">{inquiriesQuery.data?.items.map((inquiry) => <article className={`inquiry-card ${inquiry.status === 'sent' ? 'is-new' : ''}`} key={inquiry.id}>
      <header><div><span className={`status-pill status-pill--${inquiry.status}`}>{inquiryStatus(inquiry.status)}</span><h2>{studentName(inquiry)}</h2></div><time>{formatDate(inquiry.created_at)}</time></header>
      {inquiry.requested_start_at ? <p className="inquiry-card__schedule"><CalendarDays />{formatLessonTime(inquiry.requested_start_at)} · {inquiry.lesson_mode === 'in_person' ? 'פרונטלי' : 'אונליין'} · שעון ישראל{inquiry.requested_end_at ? ` · ${Math.round((Date.parse(inquiry.requested_end_at) - Date.parse(inquiry.requested_start_at)) / 60000)} דקות` : ''}</p> : null}
      <blockquote>{inquiry.message}</blockquote>
      {['sent', 'viewed'].includes(inquiry.status) ? <div className="inquiry-card__actions"><Button disabled={respond.isPending || view.isPending} onClick={() => chooseDecision(inquiry, 'accepted')}><Check />קבלת הפנייה</Button><Button variant="outline" disabled={respond.isPending || view.isPending} onClick={() => chooseDecision(inquiry, 'declined')}><XCircle />דחייה</Button>{inquiry.status === 'sent' ? <Button variant="ghost" disabled={view.isPending || respond.isPending} onClick={() => view.mutate(inquiry.id)}>סימון כנקראה</Button> : null}</div> : null}
      {inquiry.status === 'accepted' ? <><p>הפנייה התקבלה. יש ליצור קשר ולסכם את מועד השיעור.</p><div className="inquiry-contact"><strong>פרטי התלמיד/ה</strong>{inquiry.student?.contact_email ? <a href={`mailto:${inquiry.student.contact_email}`}>{inquiry.student.contact_email}</a> : null}{inquiry.student?.phone ? <a href={`tel:${inquiry.student.phone}`}>{inquiry.student.phone}</a> : null}<Link to="/teacher/students">התלמידים שלי</Link></div></> : null}
    </article>)}</div>
    <Dialog open={Boolean(decision)} onOpenChange={(open) => { if (!open && !respond.isPending) setDecision(null) }}><DialogContent dir="rtl"><DialogHeader><DialogTitle>{decision?.status === 'accepted' ? 'קבלת הפנייה' : 'דחיית הפנייה'}</DialogTitle><DialogDescription>{decision?.inquiry ? studentName(decision.inquiry) : ''}{decision?.status === 'accepted' ? ' יקבלו את האימייל והטלפון שלכם, ותוכלו לראות את פרטי הקשר שלהם. מועד השיעור ייקבע בתיאום ישיר.' : ' יקבלו עדכון שהפנייה נדחתה. לא ניתן לשנות את ההחלטה לאחר השליחה.'}</DialogDescription></DialogHeader>{respond.isError ? <p role="alert">העדכון לא הושלם. סגרו ובדקו את מצב הפנייה לפני ניסיון נוסף.</p> : null}<DialogFooter><Button variant="outline" disabled={respond.isPending} onClick={() => setDecision(null)}>ביטול</Button><Button disabled={respond.isPending || respond.isError} onClick={() => { if (decision) respond.mutate({ id: decision.inquiry.id, status: decision.status }) }}>{respond.isPending ? 'מעדכן...' : 'אישור ושליחת עדכון'}</Button></DialogFooter></DialogContent></Dialog>
  </AccountShell>
}

export function TeacherSchedulePage() {
  const queryClient = useQueryClient()
  const scheduleQuery = useTeacherSchedule()
  if (scheduleQuery.isPending) return <AccountShell title="זמינות שבועית" description=""><WorkspaceState>טוען זמינות...</WorkspaceState></AccountShell>
  if (scheduleQuery.isError) return <AccountShell title="זמינות שבועית" description=""><WorkspaceState tone="error">לא הצלחנו לטעון את הזמינות.</WorkspaceState></AccountShell>
  return <ScheduleForm initial={scheduleQuery.data ?? []} onSaved={() => void queryClient.invalidateQueries({ queryKey: accountKeys.schedule })} />
}

export function TeacherStudentsPage() {
  const query = useAcceptedStudents()
  const students = new Map<string, InquiryDto>()
  for (const page of query.data?.pages ?? []) {
    for (const inquiry of page.items) {
      if (!students.has(inquiry.student_id)) students.set(inquiry.student_id, inquiry)
    }
  }
  return <AccountShell title="התלמידים שלי" description="">
    {query.isPending ? <WorkspaceState>טוען תלמידים...</WorkspaceState> : null}
    {query.isError ? <WorkspaceState tone="error"><p>לא הצלחנו לטעון תלמידים.</p><Button onClick={() => void query.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {query.isSuccess && students.size === 0 ? <WorkspaceState>עדיין אין תלמידים עם פנייה שאושרה.</WorkspaceState> : null}
    <div className="inquiry-list">{[...students.values()].map((inquiry) => <article className="inquiry-card" key={inquiry.student_id}>
      <header><h2>{studentName(inquiry)}</h2><span className="status-pill status-pill--accepted">פנייה אושרה</span></header>
      <div className="inquiry-contact">
        {inquiry.student?.contact_email ? <a href={`mailto:${inquiry.student.contact_email}`}>{inquiry.student.contact_email}</a> : null}
        {inquiry.student?.phone ? <a href={`tel:${inquiry.student.phone}`}>{inquiry.student.phone}</a> : null}
      </div>
      {inquiry.requested_start_at ? <p>{formatLessonTime(inquiry.requested_start_at)} · שעון ישראל</p> : null}
      <blockquote>{inquiry.message}</blockquote>
      <Link to="/teacher/inquiries">כל הפניות</Link>
    </article>)}</div>
    {query.hasNextPage ? <Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>תלמידים נוספים</Button> : null}
  </AccountShell>
}

function ScheduleForm({ initial, onSaved }: { initial: AvailabilitySlotDto[]; onSaved: () => void }) {
  const [slots, setSlots] = useState<EditableSlot[]>(() => initial.map(({ day_of_week, start_time, end_time }) => ({ day_of_week, start_time: start_time.slice(0, 5), end_time: end_time.slice(0, 5) })))
  const mutation = useMutation({
    mutationFn: () => apiRequest(endpoints.teacherAvailability, { method: 'PUT', body: { slots: slots.map((slot) => ({ dayOfWeek: slot.day_of_week, startTime: slot.start_time, endTime: slot.end_time, timezone: 'Asia/Jerusalem', isActive: true })) } }),
    onSuccess: () => { onSaved(); toast.success('הזמינות נשמרה') },
    onError: () => toast.error('לא הצלחנו לשמור. ודאו שאין שעות חופפות.'),
  })
  const update = (index: number, field: keyof EditableSlot, value: number | string) => setSlots((current) => current.map((slot, slotIndex) => slotIndex === index ? { ...slot, [field]: value } : slot))
  return <AccountShell title="זמינות שבועית" description="הגדירו חלונות קבועים שבהם תלמידים יכולים לבקש שיעור." actions={<Button onClick={() => mutation.mutate()} disabled={mutation.isPending}><Check />שמירת זמינות</Button>}>
    <section className="schedule-page"><header><CalendarDays /><div><h2>מערכת שבועית</h2><p>השעות לפי שעון ישראל · תצוגת 24 שעות</p></div></header><fieldset disabled={mutation.isPending}><div className="onboarding-schedule">{slots.map((slot, index) => <div className="onboarding-slot" key={index}><label><span>יום בשבוע</span><select value={slot.day_of_week} onChange={(event) => update(index, 'day_of_week', Number(event.target.value))}>{days.map((day, dayIndex) => <option key={day} value={dayIndex}>{day}</option>)}</select></label><TimeSelect label="שעת התחלה" value={slot.start_time} onChange={(value) => update(index, 'start_time', value)} /><TimeSelect label="שעת סיום" value={slot.end_time} onChange={(value) => update(index, 'end_time', value)} /><Button variant="ghost" aria-label={`הסרת חלון ${index + 1}`} onClick={() => setSlots((current) => current.filter((_, slotIndex) => slotIndex !== index))}>הסרה</Button></div>)}</div><Button variant="outline" onClick={() => setSlots((current) => [...current, { day_of_week: 0, start_time: '16:00', end_time: '18:00' }])}><CalendarDays />הוספת חלון</Button></fieldset>{mutation.isError ? <p role="alert">הזמינות לא נשמרה. ודאו ששעת הסיום אחרי שעת ההתחלה ושאין חפיפות.</p> : null}{slots.length === 0 ? <WorkspaceState>לא הוגדרה זמינות. הוסיפו חלון כדי שתלמידים ידעו מתי אפשר לפנות לשיעור.</WorkspaceState> : null}</section>
  </AccountShell>
}

function TeacherInquirySummary({ inquiry }: { inquiry: InquiryDto }) { return <article className="inquiry-card"><header><div><span className={`status-pill status-pill--${inquiry.status}`}>{inquiryStatus(inquiry.status)}</span><h3>{studentName(inquiry)}</h3></div><time>{formatDate(inquiry.created_at)}</time></header><blockquote>{inquiry.message}</blockquote></article> }
function studentName(inquiry: InquiryDto) { return [inquiry.student?.first_name, inquiry.student?.last_name].filter(Boolean).join(' ') || 'תלמיד/ה' }
function inquiryStatus(status: InquiryDto['status']) { return ({ sent: 'חדשה', viewed: 'נצפתה', accepted: 'אושרה', declined: 'נדחתה', expired: 'פגה' })[status] }
function formatDate(value: string) { return new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function formatLessonTime(value: string) { return new Intl.DateTimeFormat('he-IL', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jerusalem' }).format(new Date(value)) }