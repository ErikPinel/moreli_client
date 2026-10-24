import { ArrowLeft, Check, UserRoundPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import teacherPortrait from '@/features/home/static assets/inviteJoinTeacherMainPage.jpg'

export function TeacherAcquisitionSection() {
  const { profile } = useAuth()
  if (profile?.role === 'teacher') return null

  return (
    <section className="teacher-acquisition-section" aria-labelledby="teach-title">
      <div className="page-shell teacher-acquisition">
        <img className="teacher-acquisition__portrait" src={teacherPortrait} alt="" loading="lazy" />
        <div className="teacher-acquisition__copy">
          <h2 id="teach-title">מורים פרטיים? הכירו תלמידים חדשים</h2>
          <p>
            הציגו את הניסיון שלכם, בחרו מקצועות וקבעו מחיר וזמינות. התלמידים יוכלו למצוא אתכם ולשלוח בקשה לשיעור.
          </p>
        </div>
        <Link className="teacher-acquisition__cta" to="/teach">
          <UserRoundPlus aria-hidden="true" />
          הצטרפות כמורים
          <ArrowLeft aria-hidden="true" />
        </Link>
        <ul className="teacher-acquisition__benefits">
          <li><Check /> פתיחת פרופיל בחינם</li>
          <li><Check /> אתם קובעים את המחיר והזמינות</li>
          <li><Check /> התלמיד החדש הראשון ללא עלות</li>
        </ul>
      </div>
    </section>
  )
}