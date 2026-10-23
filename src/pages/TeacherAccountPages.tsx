import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, CalendarPlus, Check, CheckCircle2, MessageCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { ApiError } from '@/api/api-error'
import { TeacherAccessNotice } from './TeacherAccessPage'
import { endpoints } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { TimeSelect } from '@/features/account/TimeSelect'
import { AvailabilityGrid } from '@/features/account/AvailabilityGrid'
import { defaultAvailability } from '@/features/account/availability-grid'
import { LessonDashboard } from '@/features/account/LessonList'
import { CreateLessonDialog } from '@/features/account/CreateLessonDialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AccountShell, InquiryStatusFilter, WorkspaceState } from '@/features/account/AccountShell'
import { accountKeys, useAcceptedStudents, useInquiries, useTeacherProfile, useTeacherSchedule, useUnreadNotifications } from '@/features/account/useAccountData'
import type { AvailabilitySlotDto, InquiryDto } from '@/types/api'

const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
type EditableSlot = Pick<AvailabilitySlotDto, 'day_of_week' | 'start_time' | 'end_time'>

export function TeacherDashboardPage() {
  const [addingLesson, setAddingLesson] = useState(false)
  const profileQuery = useTeacherProfile()
  const inquiriesQuery = useInquiries('teacher', undefined, 'actionable')
  const unreadQuery = useUnreadNotifications()
  const newInquiries = inquiriesQuery.isSuccess ? inquiriesQuery.data.items.filter((item) => ['sent', 'viewed'].includes(item.status)).length : null
  const teacher = profileQuery.data
  const { dialog, renderCard } = useTeacherInquiryActions()
  return <AccountShell title="לוח הבקרה" description="מה דורש מענה, ומה השיעור הבא שלכם." actions={<Button className="lesson-primary-action" onClick={() => setAddingLesson(true)}><CalendarPlus aria-hidden="true" />קביעת שיעור חדש</Button>}>
    <TeacherAccessNotice actionOnly />
    {profileQuery.isError || unreadQuery.isError ? <WorkspaceState tone="error"><p>חלק מנתוני לוח הבקרה לא נטענו.</p><Button variant="outline" onClick={() => { void profileQuery.refetch(); void unreadQuery.refetch() }}>ניסיון נוסף</Button></WorkspaceState> : null}
    {teacher && teacher.profile_status !== 'published' ? <section className="dashboard-profile"><div><span className={`status-pill status-pill--${teacher.profile_status}`}>{teacher.profile_status === 'pending' ? 'ממתין לאישור' : teacher.profile_status === 'suspended' ? 'מושהה' : 'טיוטה'}</span><h2>{teacher.headline || 'הפרופיל המקצועי עדיין בהכנה'}</h2><p>{teacher.profile_status === 'pending' ? 'הפרופיל התקבל ונמצא בבדיקה. ההחלטה תופיע כאן ותישלח באימייל.' : teacher.profile_status === 'suspended' ? 'הפרופיל אינו מופיע בחיפוש. עריכת הפרטים אינה מבטלת את ההשהיה; נדרשת בדיקת מנהל.' : 'השלימו את כל פרטי החובה ושלחו את הפרופיל לבדיקה.'}</p></div><Link className="button-link" to="/teacher/onboarding">{teacher.profile_status === 'draft' ? 'השלמת הפרופיל' : 'פרטי ההוראה והבדיקה'}<ArrowLeft /></Link></section> : null}
    {inquiriesQuery.isPending || inquiriesQuery.isError || newInquiries ? <section className="dashboard-section teacher-pending-inquiries"><header><div><h2>{newInquiries ? `${newInquiries}${inquiriesQuery.hasNextPage ? '+' : ''} פניות ממתינות למענה` : 'פניות שממתינות למענה'}</h2><p>קבלת הפנייה קובעת את השיעור במועד שהתבקש וחושפת את פרטי הקשר.</p></div><Link to="/teacher/inquiries">לכל הפניות<ArrowLeft /></Link></header>{inquiriesQuery.isPending ? <WorkspaceState>טוען פניות...</WorkspaceState> : inquiriesQuery.isError ? <WorkspaceState tone="error"><p>לא ניתן לבדוק פניות חדשות.</p><Button onClick={() => void inquiriesQuery.refetch()}>ניסיון נוסף</Button></WorkspaceState> : <div className="inquiry-list">{inquiriesQuery.data?.items.slice(0, 3).map(inquiry => renderCard(inquiry, 'h3'))}</div>}</section> : null}
    <LessonDashboard side="teacher" />
    <div className="dashboard-quiet-status"><span><CheckCircle2 aria-hidden="true" />{newInquiries === 0 ? 'אין פניות שממתינות למענה' : 'אפשר לנהל את ההמשך מתוך לוח השיעורים'}</span>{unreadQuery.data?.count ? <Link to="/teacher/notifications">{unreadQuery.data.count} התראות שלא נקראו<ArrowLeft aria-hidden="true" /></Link> : null}{teacher?.profile_status === 'published' ? <Link to="/teacher/onboarding">הפרופיל מפורסם · עריכת פרטי ההוראה</Link> : null}</div>
        {dialog}
        {addingLesson ? <CreateLessonDialog onClose={() => setAddingLesson(false)} /> : null}
      </AccountShell>
}

function useTeacherInquiryActions() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [decision, setDecision] = useState<{ inquiry: InquiryDto; status: 'accepted' | 'declined' } | null>(null)
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: accountKeys.inquiries('teacher') })
    void queryClient.invalidateQueries({ queryKey: accountKeys.notifications })
    void queryClient.invalidateQueries({ queryKey: accountKeys.unreadNotifications })
    void queryClient.invalidateQueries({ queryKey: ['lessons'] })
    void queryClient.invalidateQueries({ queryKey: ['teachers', 'calendar'] })
  }
  const view = useMutation({ mutationFn: (id: string) => apiRequest(endpoints.viewInquiry(id), { method: 'PATCH' }), onSuccess: refresh, onError: () => toast.error('לא הצלחנו לסמן את הפנייה כנקראה') })
  const respond = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'accepted' | 'declined' }) => apiRequest(endpoints.respondInquiry(id), { method: 'PATCH', body: { status } }),
    onSuccess: (_, variables) => { refresh(); setDecision(null); toast.success(variables.status === 'accepted' ? 'הפנייה התקבלה. פרטי הקשר זמינים כעת.' : 'הפנייה נדחתה והתלמיד יקבל עדכון.') },
    onError: (error) => { refresh(); if (error instanceof ApiError && error.status === 402) { setDecision(null); toast.error('לקבלת תלמיד חדש נוסף נדרשת גישה חודשית מאושרת ב־60 ש״ח.', { action: { label: 'פרטי הגישה', onClick: () => navigate('/teacher/access') } }); return } toast.error('לא הצלחנו לעדכן. ייתכן שהפנייה כבר נענתה, המועד נתפס או שהפנייה פגה; בדקו את המצב.') },
  })
  function chooseDecision(inquiry: InquiryDto, nextStatus: 'accepted' | 'declined') {
    respond.reset()
    setDecision({ inquiry, status: nextStatus })
  }
  const busy = respond.isPending || view.isPending
  const dialog = <Dialog open={Boolean(decision)} onOpenChange={(open) => { if (!open && !respond.isPending) setDecision(null) }}><DialogContent dir="rtl"><DialogHeader><DialogTitle>{decision?.status === 'accepted' ? 'קבלת הפנייה וקביעת השיעור' : 'דחיית הפנייה'}</DialogTitle><DialogDescription>{decision?.inquiry ? studentName(decision.inquiry) : ''}{decision?.status === 'accepted' ? ' יקבלו את האימייל והטלפון שלכם, ותוכלו לראות את פרטי הקשר שלהם. השיעור ייקבע במועד שהתבקש ויופיע בלוח של שניכם. לאחר שעת הסיום, כל אחד יאשר בנפרד שהשיעור התקיים.' : ' יקבלו עדכון שהפנייה נדחתה. לא ניתן לשנות את ההחלטה לאחר השליחה.'}</DialogDescription></DialogHeader>{respond.isError ? <p role="alert">העדכון לא הושלם. סגרו ובדקו את מצב הפנייה לפני ניסיון נוסף.</p> : null}<DialogFooter><Button variant="outline" disabled={respond.isPending} onClick={() => setDecision(null)}>ביטול</Button><Button disabled={respond.isPending || respond.isError} onClick={() => { if (decision) respond.mutate({ id: decision.inquiry.id, status: decision.status }) }}>{respond.isPending ? 'מעדכן...' : 'אישור ושליחת עדכון'}</Button></DialogFooter></DialogContent></Dialog>
  const renderCard = (inquiry: InquiryDto, Heading: 'h2' | 'h3' = 'h2') => <article className={`inquiry-card ${inquiry.status === 'sent' ? 'is-new' : ''}`} key={inquiry.id}>
    <header><div><span className={`status-pill status-pill--${inquiry.status}`}>{inquiryStatus(inquiry.status)}</span><Heading>{studentName(inquiry)}</Heading></div><time>{formatDate(inquiry.created_at)}</time></header>
    {inquiry.requested_start_at ? <p className="inquiry-card__schedule"><CalendarDays />{formatLessonTime(inquiry.requested_start_at)} · {inquiry.lesson_mode === 'in_person' ? 'פרונטלי' : 'אונליין'} · שעון ישראל{inquiry.requested_end_at ? ` · ${Math.round((Date.parse(inquiry.requested_end_at) - Date.parse(inquiry.requested_start_at)) / 60000)} דקות` : ''}</p> : null}
    <blockquote>{inquiry.message}</blockquote>
    <Link className="text-link" to={`/teacher/inquiries/${inquiry.id}`}>פרטי הפנייה, השיעור ופרטי הקשר<ArrowLeft aria-hidden="true" /></Link>
    {['sent', 'viewed'].includes(inquiry.status) ? <div className="inquiry-card__actions"><Button disabled={busy} onClick={() => chooseDecision(inquiry, 'accepted')}><Check />קבלת הפנייה</Button><Button variant="outline" disabled={busy} onClick={() => chooseDecision(inquiry, 'declined')}><XCircle />דחייה</Button>{inquiry.status === 'sent' ? <Button variant="ghost" disabled={busy} onClick={() => view.mutate(inquiry.id)}>סימון כנקראה</Button> : null}</div> : null}
    {inquiry.status === 'accepted' ? <><p>הפנייה התקבלה. מצב השיעור והמועד המעודכן מופיעים בלוח השיעורים.</p><div className="inquiry-contact"><strong>פרטי התלמיד/ה</strong>{inquiry.student?.contact_email ? <a href={`mailto:${inquiry.student.contact_email}`}>{inquiry.student.contact_email}</a> : null}{inquiry.student?.phone ? <a href={`tel:${inquiry.student.phone}`}>{inquiry.student.phone}</a> : null}<Link to={`/teacher/students/${inquiry.student_id}`}>כל השיעורים עם התלמיד/ה</Link></div></> : null}
  </article>
  return { dialog, renderCard }
}

export function TeacherInquiriesPage() {
  const [status, setStatus] = useState<InquiryDto['status'] | ''>('')
  const inquiriesQuery = useInquiries('teacher', status || undefined)
  const { dialog, renderCard } = useTeacherInquiryActions()
  return <AccountShell title="פניות מתלמידים" description="קראו את מטרת הלימוד ואשרו פניות שמתאימות לכם." actions={inquiriesQuery.hasNextPage ? <Button variant="outline" disabled={inquiriesQuery.isFetchingNextPage} onClick={() => void inquiriesQuery.fetchNextPage()}>פניות נוספות</Button> : undefined}>
    <TeacherAccessNotice />
    <InquiryStatusFilter value={status} onChange={setStatus} />
    {inquiriesQuery.isPending ? <WorkspaceState>טוען פניות...</WorkspaceState> : null}
    {inquiriesQuery.isError ? <WorkspaceState tone="error"><p>לא הצלחנו לטעון פניות.</p><Button onClick={() => void inquiriesQuery.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {inquiriesQuery.data?.items.length === 0 ? <WorkspaceState><MessageCircle /><h2>{status ? 'אין פניות במצב הזה' : 'אין פניות כרגע'}</h2>{status ? <Button variant="outline" onClick={() => setStatus('')}>כל הפניות</Button> : <Link to="/teacher/onboarding">לפרופיל ההוראה</Link>}</WorkspaceState> : null}
    <div className="inquiry-list">{inquiriesQuery.data?.items.map((inquiry) => renderCard(inquiry))}</div>
    {dialog}
  </AccountShell>
}

export function TeacherSchedulePage() {
  const queryClient = useQueryClient()
  const scheduleQuery = useTeacherSchedule()
  if (scheduleQuery.isPending) return <AccountShell title="זמינות שבועית" description=""><WorkspaceState>טוען זמינות...</WorkspaceState></AccountShell>
  if (scheduleQuery.isError) return <AccountShell title="זמינות שבועית" description=""><WorkspaceState tone="error">לא הצלחנו לטעון את הזמינות.</WorkspaceState></AccountShell>
  return <ScheduleForm initial={scheduleQuery.data ?? []} onSaved={() => { void queryClient.invalidateQueries({ queryKey: accountKeys.schedule }); void queryClient.invalidateQueries({ queryKey: ['teachers', 'calendar'] }) }} />
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
      <p>צפו בשיעורים הקרובים, בהיסטוריה ובמצב כל מפגש.</p>
      <Link className="button-link" to={`/teacher/students/${inquiry.student_id}`}>שיעורים עם התלמיד/ה וקביעת מפגש נוסף<ArrowLeft aria-hidden="true" /></Link>
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
  return <AccountShell title="זמינות שבועית" description="הגדירו חלונות קבועים לשיעורים. שעות שבת מחושבות לפי המיקום ומוסרות מלוח התלמיד." actions={<Button className="lesson-primary-action" onClick={() => mutation.mutate()} disabled={mutation.isPending}><Check />שמירת זמינות</Button>}>
    <section className="schedule-page"><header><CalendarDays /><div><h2>שעות ההוראה הקבועות</h2><p>ברירת המחדל למורה חדש: ראשון–חמישי, 09:00–21:00. זמינות שכבר ערכתם נשמרת.</p></div></header><AvailabilityGrid slots={slots} onChange={setSlots} disabled={mutation.isPending} /><fieldset disabled={mutation.isPending}><h3>בחירת ימים ושעות מדויקות</h3><div className="onboarding-schedule">{slots.map((slot, index) => <div className="onboarding-slot" key={index}><label><span>יום בשבוע</span><select value={slot.day_of_week} onChange={(event) => update(index, 'day_of_week', Number(event.target.value))}>{days.map((day, dayIndex) => <option key={day} value={dayIndex}>{day}</option>)}</select></label><TimeSelect label="שעת התחלה" value={slot.start_time} onChange={(value) => update(index, 'start_time', value)} /><TimeSelect label="שעת סיום" value={slot.end_time} onChange={(value) => update(index, 'end_time', value)} /><Button variant="ghost" aria-label={`הסרת חלון ${index + 1}`} onClick={() => setSlots((current) => current.filter((_, slotIndex) => slotIndex !== index))}>הסרה</Button></div>)}</div><div className="review-actions"><Button variant="outline" onClick={() => setSlots((current) => [...current, { day_of_week: 0, start_time: '16:00', end_time: '18:00' }])}><CalendarDays />הוספת חלון</Button><Button variant="ghost" onClick={() => setSlots(defaultAvailability())}>בחירת ברירת המחדל א׳–ה׳</Button></div></fieldset>{mutation.isError ? <p role="alert">הזמינות לא נשמרה. ודאו ששעת הסיום אחרי שעת ההתחלה ושאין חפיפות.</p> : null}{slots.length === 0 ? <WorkspaceState>אין שעות פתוחות להזמנה. הוסיפו חלון או בחרו את ברירת המחדל, ואז שמרו.</WorkspaceState> : null}</section>
  </AccountShell>
}

function studentName(inquiry: InquiryDto) { return [inquiry.student?.first_name, inquiry.student?.last_name].filter(Boolean).join(' ') || 'תלמיד/ה' }
function inquiryStatus(status: InquiryDto['status']) { return ({ sent: 'חדשה', viewed: 'נצפתה', accepted: 'אושרה', declined: 'נדחתה', expired: 'פגה' })[status] }
function formatDate(value: string) { return new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function formatLessonTime(value: string) { return new Intl.DateTimeFormat('he-IL', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jerusalem' }).format(new Date(value)) }
