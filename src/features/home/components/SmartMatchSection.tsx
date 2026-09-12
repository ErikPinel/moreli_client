import { Send, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'

export function SmartMatchSection() {
  return (
    <section className="page-shell smart-match-section" aria-labelledby="smart-match-title">
      <div className="smart-match-band">
        <Send className="smart-match-band__icon" aria-hidden="true" />
        <div className="smart-match-band__copy">
          <h2 id="smart-match-title">
            לא יודעים איזה מורה לבחור?
          </h2>
          <p>
            נמצא לכם 3 מורים שמתאימים בדיוק — לפי המקצוע, הרמה, התקציב, המיקום והזמינות שלכם.
          </p>
        </div>
        <Link className="smart-match-band__cta" to="/match">
          <UsersRound aria-hidden="true" />
          מצאו לי 3 מורים
        </Link>
        <div className="smart-match-note" aria-hidden="true">
          <svg className="smart-match-note__arrow" viewBox="0 0 58 32" fill="none">
            <path d="M54 8C43 7 34 9 26 13C18 17 12 19 5 18" />
            <path d="M15 10L5 18L16 26" />
          </svg>
          <span className="smart-match-note__copy">
            לא רוצים לעבור<br />על עשרות פרופילים?
          </span>
        </div>
      </div>
    </section>
  )
}