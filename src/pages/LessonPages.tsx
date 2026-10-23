import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Mail, Phone } from 'lucide-react'
import { DateTime } from 'luxon'
import { useState } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { AccountShell, WorkspaceState } from '@/features/account/AccountShell'
import { CreateLessonDialog } from '@/features/account/CreateLessonDialog'
import { LessonDashboard, LessonList } from '@/features/account/LessonList'
import { lessonLabels, lessonName, lessonTime, lessonZone, useLessonClock, useLessons, useRefreshLessons, type LessonSide } from '@/features/account/lesson-data'
import type { LessonDto, LessonPersonDto, PaginatedDto } from '@/types/api'

const currentWeek = () => {
  const today = DateTime.now().setZone(lessonZone).startOf('day')
  return today.minus({ days: today.weekday % 7 })
}

export function StudentDashboardPage() {
  return <AccountShell title="הלמידה שלי" description="השיעורים שנקבעו, והעדכונים שחשוב לטפל בהם."><LessonDashboard side="student" /><section className="learning-next-step"><div><h2>רוצים ללמוד משהו נוסף?</h2><p>מצאו מורה מתאים ושלחו בקשה למועד פנוי.</p></div><Link className="button-link" to="/teachers">מציאת מורה<ArrowLeft aria-hidden="true" /></Link></section></AccountShell>
}

export function LessonsPage() {
  const side: LessonSide = useLocation().pathname.startsWith('/teacher/') ? 'teacher' : 'student'
  const [params, setParams] = useSearchParams()
  const mode = params.get('view') === 'needs_action' ? 'needs_action' : params.get('view') === 'all' ? 'all' : 'week'
  const [week, setWeek] = useState(currentWeek)
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const list = useLessons(side, mode === 'needs_action' ? 'needs_action' : 'all', { page, limit: 20 }, mode !== 'week')
  const from = week.toUTC().toISO()!
  const to = week.plus({ weeks: 1 }).toUTC().toISO()!
  const calendar = useQuery({
    queryKey: ['lessons', side, 'week', from, to],
    enabled: mode === 'week',
    refetchInterval: 30_000,
    queryFn: async () => {
      const items = new Map<string, LessonDto>()
      for (let nextPage = 1; ; nextPage++) {
        const query = new URLSearchParams({ side, view: 'week', from, to, limit: '100', page: String(nextPage) })
        const result = await apiRequest<PaginatedDto<LessonDto>>(`${endpoints.lessons}?${query}`)
        result.items.forEach(lesson => items.set(lesson.id, lesson))
        if (!result.hasMore) return [...items.values()]
        if (!result.items.length) throw new Error('לא ניתן לטעון את השבוע המלא. נסו שוב.')
      }
    },
  })
  const loading = mode === 'week' ? calendar.isPending : list.isPending
  const error = mode === 'week' ? calendar.isError : list.isError
  const lessons = mode === 'week' ? calendar.data : list.data?.items
  return <AccountShell title="לוח השיעורים" description="מועדים שנקבעו והיסטוריית השיעורים · כל השעות לפי שעון ישראל." actions={side === 'teacher' ? <Button className="lesson-primary-action" onClick={() => setAdding(true)}><CalendarPlus aria-hidden="true" />קביעת שיעור נוסף</Button> : undefined}>
    <div className="lesson-view-tabs" role="group" aria-label="תצוגת שיעורים">{([{ value: 'week', label: 'לוח שבועי' }, { value: 'all', label: 'כל השיעורים' }, { value: 'needs_action', label: 'מצריכים עדכון' }] as const).map(tab => <Button key={tab.value} variant={mode === tab.value ? 'default' : 'outline'} aria-pressed={mode === tab.value} onClick={() => { setPage(1); setParams(tab.value === 'week' ? {} : { view: tab.value }) }}>{tab.label}</Button>)}</div>
    {mode === 'week' ? <header className="lesson-week-toolbar"><div><h2>{week.setLocale('he').toFormat('dd בLLL')} – {week.plus({ days: 6 }).setLocale('he').toFormat('dd בLLL yyyy')}</h2><p>ראשון עד שבת · שעון ישראל</p></div><div><Button variant="outline" size="icon" aria-label="השבוע הקודם" onClick={() => setWeek(value => value.minus({ weeks: 1 }))}><ChevronRight /></Button><Button variant="outline" onClick={() => setWeek(currentWeek())}>השבוע הנוכחי</Button><Button variant="outline" size="icon" aria-label="השבוע הבא" onClick={() => setWeek(value => value.plus({ weeks: 1 }))}><ChevronLeft /></Button></div></header> : <p>{mode === 'needs_action' ? 'שיעורים שעדיין חסר בהם מועד או אישור שלכם שהתקיימו. זמן שחלף אינו אישור נוכחות.' : `${list.data?.total ?? '…'} שיעורים · כולל ביטולים ודיווחים, בלי להסיק נוכחות רק לפי המועד.`}</p>}
    {loading ? <WorkspaceState>טוען שיעורים...</WorkspaceState> : error ? <WorkspaceState tone="error"><p>לא ניתן לטעון את השיעורים.</p><Button variant="outline" onClick={() => void (mode === 'week' ? calendar.refetch() : list.refetch())}>ניסיון נוסף</Button></WorkspaceState> : mode === 'week' ? <WeeklyLessons week={week} lessons={lessons ?? []} side={side} /> : lessons?.length ? <LessonList lessons={lessons} side={side} /> : <WorkspaceState>{mode === 'needs_action' ? 'אין שיעורים שמצריכים עדכון שלכם כרגע.' : 'עדיין אין שיעורים.'}</WorkspaceState>}
    {mode !== 'week' ? <nav className="lesson-pagination" aria-label="דפדוף בשיעורים"><Button variant="outline" disabled={page === 1} onClick={() => setPage(value => value - 1)}>הקודם</Button><span>עמוד {page}</span><Button variant="outline" disabled={!list.data?.hasMore} onClick={() => setPage(value => value + 1)}>הבא</Button></nav> : null}
    {adding ? <CreateLessonDialog onClose={() => setAdding(false)} /> : null}
  </AccountShell>
}

function WeeklyLessons({ week, lessons, side }: { week: DateTime; lessons: LessonDto[]; side: LessonSide }) {
  const dated = lessons.map(lesson => ({ lesson, start: lesson.starts_at ? DateTime.fromISO(lesson.starts_at).setZone(lessonZone) : null, end: lesson.ends_at ? DateTime.fromISO(lesson.ends_at).setZone(lessonZone) : null }))
  const inGrid = dated.filter(item => item.start && item.end && item.start.hour >= 9 && (item.end.hour < 21 || item.end.hour === 21 && item.end.minute === 0) && item.start.toISODate() === item.end.toISODate() && item.lesson.status !== 'cancelled')
  const gridIds = new Set(inGrid.map(item => item.lesson.id))
  const other = lessons.filter(lesson => !gridIds.has(lesson.id))
  return <>
    {!lessons.length ? <p className="lesson-week-empty" role="status">אין שיעורים שנקבעו בשבוע הזה. אפשר לעבור לשבוע אחר.</p> : null}
    <p className="calendar-scroll-hint">גללו לצדדים כדי לראות את כל שבעת ימי השבוע.</p>
    <div className="lesson-calendar-scroll" role="region" aria-label="לוח שיעורים שבועי, ראשון עד שבת" tabIndex={0}><div className="lesson-calendar">
      <div className="lesson-calendar__hours"><div>שעה</div>{Array.from({ length: 12 }, (_, i) => <span key={i} dir="ltr">{String(i + 9).padStart(2, '0')}:00</span>)}</div>
      {Array.from({ length: 7 }, (_, index) => week.plus({ days: index })).map(day => {
        const laneEnds: number[] = []
        const events = inGrid.filter(item => item.start?.hasSame(day, 'day')).sort((a, b) => a.start!.toMillis() - b.start!.toMillis()).map(item => {
          let lane = laneEnds.findIndex(end => end <= item.start!.toMillis())
          if (lane < 0) lane = laneEnds.length
          laneEnds[lane] = item.end!.toMillis()
          return { ...item, lane }
        })
        const lanes = Math.max(1, laneEnds.length)
        return <section className={`lesson-calendar__day ${day.hasSame(DateTime.now().setZone(lessonZone), 'day') ? 'is-today' : ''}`} key={day.toISODate()!}><h3><span>{day.setLocale('he').toFormat('ccc')}</span><strong>{day.toFormat('dd/MM')}</strong></h3><div className="lesson-calendar__slots">{events.map(({ lesson, start, end, lane }) => <Link key={lesson.id} className={`lesson-calendar__event lesson-calendar__event--${lesson.status}`} to={`/${side}/lessons/${lesson.id}`} style={{ top: (start!.hour - 9) * 60 + start!.minute, height: end!.diff(start!, 'minutes').minutes, insetInlineStart: `calc(${lane / lanes * 100}% + 3px)`, insetInlineEnd: `calc(${(lanes - lane - 1) / lanes * 100}% + 3px)` }} title={`${lessonName(lesson, side)} · ${start!.toFormat('HH:mm')}–${end!.toFormat('HH:mm')} · ${lessonLabels[lesson.status]}`}><strong>{lessonName(lesson, side)}</strong><span dir="ltr">{start!.toFormat('HH:mm')}–{end!.toFormat('HH:mm')}</span><span className="sr-only">{lessonLabels[lesson.status]}</span></Link>)}</div></section>
      })}
    </div></div><p className="lesson-calendar-note">לחצו על שיעור לפרטים ולפעולות. ״נקבע״ אינו אישור שהשיעור התקיים.</p>
    {other.length ? <section className="dashboard-section"><header><div><h2>מועדים נוספים וביטולים בשבוע הזה</h2><p>גם שיעורים מחוץ לשעות 09:00–21:00 נשמרים ומופיעים כאן.</p></div></header><LessonList lessons={other} side={side} /></section> : null}
  </>
}

export function TeacherStudentLessonsPage() {
  const { id = '' } = useParams()
  const [adding, setAdding] = useState(false)
  const [pastPage, setPastPage] = useState(1)
  const [futurePage, setFuturePage] = useState(1)
  const [actionPage, setActionPage] = useState(1)
  const student = useQuery({ queryKey: ['lessons', 'student', id], queryFn: () => apiRequest<LessonPersonDto>(endpoints.lessonStudent(id)) })
  const upcoming = useLessons('teacher', 'upcoming', { studentId: id, page: futurePage })
  const past = useLessons('teacher', 'past', { studentId: id, page: pastPage })
  const attention = useLessons('teacher', 'needs_action', { studentId: id, page: actionPage })
  const sections = [
    ...(attention.isPending || attention.isError || attention.data.items.length ? [{ title: 'מצריכים עדכון', description: 'שיעורים ללא מועד או שיעורים שהסתיימו ועדיין חסר אישור שלכם שהתקיימו.', query: attention, page: actionPage, setPage: setActionPage }] : []),
    { title: 'שיעורים קרובים', description: 'המועדים הבאים שנקבעו לכם יחד.', query: upcoming, page: futurePage, setPage: setFuturePage },
    { title: 'היסטוריית שיעורים', description: 'המצב מציין אם השיעור אושר כמתקיים, בוטל, דווח או עדיין ממתין לעדכון.', query: past, page: pastPage, setPage: setPastPage },
  ]
  const name = student.data ? [student.data.first_name, student.data.last_name].filter(Boolean).join(' ') : 'פרטי תלמיד'
  return <AccountShell title={name} description="כל השיעורים שלכם יחד, בלי לפתוח פנייה חדשה לכל מפגש." actions={student.data ? <Button className="lesson-primary-action" onClick={() => setAdding(true)}><CalendarPlus aria-hidden="true" />קביעת שיעור נוסף</Button> : undefined}>
    <Link className="text-link" to="/teacher/students">חזרה לתלמידים שלי</Link>
    {student.isPending ? <WorkspaceState>טוען תלמיד...</WorkspaceState> : student.isError ? <WorkspaceState tone="error"><p>התלמיד אינו זמין או שאין הרשאה לצפות בפרטיו.</p><Button variant="outline" onClick={() => void student.refetch()}>ניסיון נוסף</Button></WorkspaceState> : <div className="student-lesson-contact">{student.data.phone ? <a href={`tel:${student.data.phone}`}><Phone aria-hidden="true" /><span dir="ltr">{student.data.phone}</span></a> : null}{student.data.contact_email ? <a href={`mailto:${student.data.contact_email}`}><Mail aria-hidden="true" /><span dir="ltr">{student.data.contact_email}</span></a> : null}</div>}
    {sections.map(section => <section className="dashboard-section" key={section.title}><header><div><h2>{section.title}</h2><p>{section.description}</p></div></header>{section.query.isPending ? <WorkspaceState>טוען שיעורים...</WorkspaceState> : section.query.isError ? <WorkspaceState tone="error"><p>לא ניתן לטעון את השיעורים.</p><Button variant="outline" onClick={() => void section.query.refetch()}>ניסיון נוסף</Button></WorkspaceState> : section.query.data.items.length ? <LessonList side="teacher" lessons={section.query.data.items} /> : <p>אין שיעורים בתצוגה הזאת.</p>}<div className="lesson-pagination"><Button variant="outline" disabled={section.page === 1} onClick={() => section.setPage(value => value - 1)}>הקודם</Button><span>עמוד {section.page}</span><Button variant="outline" disabled={!section.query.data?.hasMore} onClick={() => section.setPage(value => value + 1)}>הבא</Button></div></section>)}
    {adding && student.data ? <CreateLessonDialog student={{ id: student.data.id, name }} onClose={() => setAdding(false)} /> : null}
  </AccountShell>
}

type LessonAction = 'confirm_completed' | 'cancel' | 'report_no_show'
export function LessonDetailPage() {
  const { id = '' } = useParams()
  const { profile } = useAuth()
  const pathSide: LessonSide = useLocation().pathname.startsWith('/teacher/') ? 'teacher' : 'student'
  const [action, setAction] = useState<LessonAction | null>(null)
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(false)
  const refresh = useRefreshLessons()
  const now = useLessonClock()
  const query = useQuery({ queryKey: ['lessons', 'detail', id], queryFn: () => apiRequest<LessonDto>(endpoints.lessonRecord(id)), refetchInterval: 15_000 })
  const lesson = query.data
  const side = lesson && profile ? lesson.student_id === profile.id ? 'student' : lesson.teacher.user_id === profile.id ? 'teacher' : null : null
  const mutation = useMutation({
    mutationFn: () => apiRequest(endpoints.lessonState(id), { method: 'PATCH', body: { action, note: note.trim() } }),
    onSuccess: () => { refresh(); setAction(null); setNote(''); toast.success('השיעור עודכן ונשלחה הודעה לצד השני.') },
  })
  if (side && side !== pathSide) return <Navigate replace to={`/${side}/lessons/${id}`} />
  const teacher = side === 'teacher'
  const person = lesson ? teacher ? lesson.student : lesson.teacher.profile : null
  const ended = Boolean(lesson?.ends_at && Date.parse(lesson.ends_at) <= now)
  const confirmed = lesson ? teacher ? lesson.teacher_completed_at : lesson.student_completed_at : null
  const title = action === 'confirm_completed' ? 'אישור שהשיעור התקיים' : action === 'cancel' ? 'ביטול השיעור' : 'דיווח על אי-הגעה'
  function choose(value: LessonAction) { mutation.reset(); setNote(''); setAction(value) }
  return <AccountShell title="פרטי השיעור" description="המועד, פרטי הקשר ועדכון מצב השיעור.">
    <Link className="text-link" to={`/${pathSide}/lessons`}>חזרה ללוח השיעורים</Link>
    {query.isPending ? <WorkspaceState>טוען שיעור...</WorkspaceState> : query.isError ? <WorkspaceState tone="error"><p>השיעור אינו זמין או שאין הרשאה לצפות בו.</p><Button variant="outline" onClick={() => void query.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {lesson ? <article className="lesson-detail"><header><span className={`lesson-badge lesson-badge--${lesson.status}`}>{lessonLabels[lesson.status]}</span><h2>{lessonName(lesson, pathSide)}</h2><p><CalendarDays aria-hidden="true" />{lesson.starts_at ? lessonTime(lesson.starts_at) : 'מועד השיעור עדיין לא נקבע'}</p>{lesson.ends_at ? <p>עד {DateTime.fromISO(lesson.ends_at).setZone(lessonZone).toFormat('HH:mm')} · {lesson.mode === 'in_person' ? 'פרונטלי' : lesson.mode === 'online' ? 'אונליין' : 'אופן המפגש טרם נקבע'} · שעון ישראל</p> : null}</header>
      {lesson.status === 'scheduled' || lesson.status === 'needs_scheduling' ? <section><h3>{ended ? 'עדכון אחרי השיעור' : 'מה חשוב לדעת'}</h3><p>{lesson.status === 'needs_scheduling' ? 'צריך לתאם מועד. המורה יכול לקבוע אותו כאן ולשלוח עדכון לתלמיד.' : ended ? 'המועד עבר, אבל אין בכך אישור שהשיעור התקיים. כל משתתף מאשר בנפרד, רק אם השתתף בפועל.' : 'השיעור נקבע למועד שמופיע כאן. אין צורך באישור נוסף של התלמיד. יש לתאם ישירות את מקום המפגש או קישור השיחה.'}</p>{confirmed ? <p className="lesson-confirmed"><CheckCircle2 aria-hidden="true" />אישרתם שהשיעור התקיים. ממתינים לאישור הצד השני.</p> : null}<div className="review-actions">{lesson.status === 'scheduled' && ended && !confirmed ? <Button onClick={() => choose('confirm_completed')}><CheckCircle2 aria-hidden="true" />אישור שהשיעור התקיים</Button> : null}{teacher && !lesson.student_completed_at && !lesson.teacher_completed_at && (!lesson.starts_at || Date.parse(lesson.starts_at) > now) ? <Button variant="outline" onClick={() => setEditing(true)}>{lesson.status === 'needs_scheduling' ? 'קביעת מועד' : 'שינוי מועד'}</Button> : null}<Button variant="outline" onClick={() => choose('cancel')}>ביטול שיעור</Button>{ended ? <Button variant="ghost" onClick={() => choose('report_no_show')}>דיווח על אי-הגעה</Button> : null}</div></section> : null}
      {lesson.status === 'completed' ? <section><h3>השיעור התקיים</h3><p>שני המשתתפים אישרו בנפרד שהשיעור התקיים.</p>{!teacher ? <Link className="button-link" to="/student/reviews">הביקורות שלי וכתיבת ביקורת</Link> : null}</section> : null}
      {lesson.note ? <section><h3>סיבת העדכון</h3><p className="whitespace-pre-wrap break-words">{lesson.note}</p></section> : null}
      {lesson.status === 'no_show_reported' ? <p>דיווח על אי-הגעה אינו קביעה מוכחת. במקרה של מחלוקת אפשר לפנות לתמיכה.</p> : null}
      <section><h3>פרטי קשר</h3><div className="student-lesson-contact">{person?.phone ? <a href={`tel:${person.phone}`}><Phone aria-hidden="true" /><span dir="ltr">{person.phone}</span></a> : null}{person?.contact_email ? <a href={`mailto:${person.contact_email}`}><Mail aria-hidden="true" /><span dir="ltr">{person.contact_email}</span></a> : null}{!person?.phone && !person?.contact_email ? <p>פרטי הקשר אינם מלאים. ניתן לפנות לתמיכה.</p> : null}</div></section>
      <div className="lesson-detail__links">{teacher ? <Link to={`/teacher/students/${lesson.student_id}`}>כל השיעורים עם התלמיד/ה</Link> : null}<Link to={`/${pathSide}/inquiries/${lesson.connection_inquiry_id}`}>הפנייה שחיברה ביניכם</Link><Link to={`/support?category=support&lesson=${encodeURIComponent(lesson.id)}`}>עזרה או בירור לגבי השיעור הזה</Link></div>
    </article> : null}
    <Dialog open={Boolean(action)} onOpenChange={open => { if (!open && !mutation.isPending) setAction(null) }}><DialogContent dir="rtl" showCloseButton={!mutation.isPending}><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{action === 'confirm_completed' ? 'אשרו רק אם השיעור באמת התקיים. נדרש אישור נפרד משני המשתתפים; השעה שחלפה אינה אישור נוכחות.' : 'כתבו סיבה ברורה ללא פרטים רגישים. הצד השני יקבל עדכון. הפעולה אינה קובעת חיוב או החזר על השיעור.'}</DialogDescription></DialogHeader>{action !== 'confirm_completed' ? <label>סיבת העדכון<Textarea required minLength={5} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} disabled={mutation.isPending} /></label> : null}{mutation.isError ? <p className="form-error" role="alert">{mutation.error.message}</p> : null}<DialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={() => setAction(null)}>חזרה</Button><Button disabled={mutation.isPending || action !== 'confirm_completed' && note.trim().length < 5} onClick={() => mutation.mutate()}>{mutation.isPending ? 'מעדכן...' : 'אישור ושליחת עדכון'}</Button></DialogFooter></DialogContent></Dialog>
    {editing && lesson ? <CreateLessonDialog lesson={lesson} onClose={() => setEditing(false)} /> : null}
  </AccountShell>
}
