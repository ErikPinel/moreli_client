import { ArrowLeft, CalendarDays, Clock3, MapPin, Video } from 'lucide-react'
import { DateTime } from 'luxon'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { WorkspaceState } from './AccountShell'
import { lessonLabels, lessonName, lessonTime, lessonZone, useLessonClock, useLessons, type LessonSide } from './lesson-data'
import type { LessonDto } from '@/types/api'

export function LessonList({ lessons, side }: { lessons: LessonDto[]; side: LessonSide }) {
  const now = useLessonClock()
  return <div className="lesson-list">{lessons.map(lesson => {
    const date = lesson.starts_at ? DateTime.fromISO(lesson.starts_at).setZone(lessonZone).setLocale('he') : null
    const ModeIcon = lesson.mode === 'in_person' ? MapPin : Video
    const ongoing = lesson.status === 'scheduled' && date && date.toMillis() <= now && lesson.ends_at && Date.parse(lesson.ends_at) > now
    return <Link className={`lesson-row lesson-row--${lesson.status}`} key={lesson.id} to={`/${side}/lessons/${lesson.id}`}>
      <div className="lesson-row__day" aria-hidden="true"><span>{date?.toFormat('ccc') ?? 'טרם'}</span><strong>{date?.toFormat('dd') ?? '—'}</strong><small>{date?.toFormat('LLL') ?? 'נקבע'}</small></div>
      <div className="lesson-row__body"><strong>{lessonName(lesson, side)}</strong><span>{lesson.starts_at ? lessonTime(lesson.starts_at) : 'יש לתאם מועד עם המורה'}</span><small><ModeIcon aria-hidden="true" />{lesson.mode === 'in_person' ? 'פרונטלי' : lesson.mode === 'online' ? 'אונליין' : 'אופן המפגש טרם נקבע'}{lesson.ends_at ? ` · עד ${DateTime.fromISO(lesson.ends_at).setZone(lessonZone).toFormat('HH:mm')}` : ''}</small></div>
      <span className={`lesson-badge lesson-badge--${ongoing ? 'ongoing' : lesson.status}`}>{ongoing ? 'מתקיים עכשיו' : lessonLabels[lesson.status]}</span><ArrowLeft className="lesson-row__arrow" aria-hidden="true" />
    </Link>
  })}</div>
}

export function LessonDashboard({ side }: { side: LessonSide }) {
  const upcoming = useLessons(side, 'upcoming', { limit: 5 })
  const action = useLessons(side, 'needs_action', { limit: 5 })
  return <>
    {action.isError ? <WorkspaceState tone="error"><p>לא ניתן לבדוק אם יש שיעורים שמצריכים עדכון.</p><Button variant="outline" onClick={() => void action.refetch()}>ניסיון נוסף</Button></WorkspaceState> : null}
    {action.data?.total ? <section className="lesson-attention"><header><Clock3 aria-hidden="true" /><div><h2>{action.data.total === 1 ? 'שיעור אחד מצריך עדכון' : `${action.data.total} שיעורים מצריכים עדכון`}</h2><p>אשרו רק שיעור שבאמת התקיים. {side === 'teacher' ? 'מועד חסר אפשר לקבוע מתוך פרטי השיעור.' : 'אם לא נקבע מועד, יש לתאם אותו עם המורה.'}</p></div></header><LessonList lessons={action.data.items} side={side} />{action.data.hasMore ? <Link to={`/${side}/lessons?view=needs_action`}>לכל השיעורים שמצריכים עדכון<ArrowLeft aria-hidden="true" /></Link> : null}</section> : null}
    <section className="dashboard-section upcoming-lessons"><header><div><h2><CalendarDays aria-hidden="true" />השיעורים הקרובים</h2><p>עד חמשת השיעורים הבאים, לפי סדר הזמן · שעון ישראל</p></div><Link to={`/${side}/lessons`}>לוח השיעורים המלא<ArrowLeft aria-hidden="true" /></Link></header>
      {upcoming.isPending ? <WorkspaceState>טוען שיעורים...</WorkspaceState> : upcoming.isError ? <WorkspaceState tone="error"><p>לא ניתן לטעון את השיעורים.</p><Button variant="outline" onClick={() => void upcoming.refetch()}>ניסיון נוסף</Button></WorkspaceState> : upcoming.data.items.length ? <LessonList lessons={upcoming.data.items} side={side} /> : <WorkspaceState><CalendarDays aria-hidden="true" /><h3>אין שיעורים קרובים</h3><p>{side === 'teacher' ? 'קבלת פנייה קובעת את השיעור הראשון. שיעורים נוספים קובעים מתוך כרטיס התלמיד.' : 'כשהמורה יקבל את הפנייה שלכם, השיעור יופיע כאן. שיעורים נוספים שהמורה יקבע יופיעו אוטומטית.'}</p><Link className="text-link" to={side === 'teacher' ? '/teacher/students' : '/teachers'}>{side === 'teacher' ? 'לתלמידים שלי' : 'מציאת מורה'}<ArrowLeft aria-hidden="true" /></Link></WorkspaceState>}
    </section>
  </>
}
