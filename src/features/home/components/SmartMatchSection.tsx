import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ScribbleArrow } from './Scribbles'

const criteria = ['מקצוע', 'תקציב', 'זמינות'] as const

export function SmartMatchSection() {
  return (
    <section className="smart-match-section" aria-labelledby="smart-match-title">
      <div className="page-shell smart-match-band">
        <SlidersHorizontal className="smart-match-band__icon" aria-hidden="true" />
        <div className="smart-match-band__copy">
          <h2 id="smart-match-title">
            רוצים עזרה בבחירת מורה?
          </h2>
          <p>
            ספרו מה תרצו ללמוד, מה התקציב ומתי נוח לכם. נציע מורים לפי ההעדפות שלכם.
          </p>
          <ul className="smart-match-band__criteria" aria-hidden="true">
            {criteria.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <p className="smart-match-band__note" aria-hidden="true">
          לא בטוחים במי לבחור?
          <ScribbleArrow className="smart-match-band__note-arrow" />
        </p>
        <Link className="smart-match-band__cta" to="/match">
          קבלו המלצות למורים
          <ArrowLeft aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
