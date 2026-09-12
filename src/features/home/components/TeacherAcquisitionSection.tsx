import { ArrowLeft, Check, UserRoundPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import teacherPortrait from '@/features/home/static assets/inviteJoinTeacherMainPage.jpg'

export function TeacherAcquisitionSection() {
  const { profile } = useAuth()
  if (profile?.role === 'teacher') return null

  return (
    <section className="page-shell teacher-acquisition-section" aria-labelledby="teach-title">
      <div className="teacher-acquisition">
        <img className="teacher-acquisition__portrait" src={teacherPortrait} alt="" loading="lazy" />
        <div className="teacher-acquisition__copy">
          <h2 id="teach-title">יודעים ללמד? בואו ללמד במורהלי</h2>
          <p>
            צרו פרופיל בחינם והתחילו לקבל פניות מתלמידים.
          </p>
        </div>
        <Link className="teacher-acquisition__cta" to="/teach">
          <UserRoundPlus aria-hidden="true" />
          התחילו ללמד במורהלי
          <ArrowLeft aria-hidden="true" />
        </Link>
        <ul className="teacher-acquisition__benefits">
          <li><Check /> קובעים את הזמינות שלכם</li>
          <li><Check /> מקבלים פניות מתאימות</li>
          <li><Check /> ללא עלות התחלה</li>
        </ul>
      </div>
    </section>
  )
}