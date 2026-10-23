import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'

export function SmartMatchSection() {
  return (
    <section className="smart-match-section" aria-labelledby="smart-match-title">
      <div className="page-shell smart-match-band">
        <SlidersHorizontal className="smart-match-band__icon" aria-hidden="true" />
        <div className="smart-match-band__copy">
          <h2 id="smart-match-title">
            קצת יותר אישי.
          </h2>
          <p>
            התאמה לפי המקצוע, הרמה, התקציב והזמינות שלכם.
          </p>
        </div>
        <Link className="smart-match-band__cta" to="/match">
          לבקשת התאמה
          <ArrowLeft aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}