import { ArrowLeft, BookOpenCheck, MessageSquareText, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

const steps = [
  {
    number: '01',
    icon: BookOpenCheck,
    title: 'בוחרים מקצוע ואזור',
    description: 'מספרים לנו מה אתם מחפשים',
  },
  {
    number: '02',
    icon: Search,
    title: 'מקבלים המלצות',
    description: 'אנחנו מציעים מורים מתאימים',
  },
  {
    number: '03',
    icon: MessageSquareText,
    title: 'יוצרים קשר',
    description: 'מדברים, מתאמים ומתחילים',
  },
] as const

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="how-it-works" aria-labelledby="how-title">
      <div className="page-shell how-it-works__inner">
        <div className="how-it-works__heading">
          <p className="section-kicker">איך זה עובד</p>
          <h2 id="how-title" className="section-title">מהחיפוש לשיעור הראשון.</h2>
          <p className="how-it-works__lead">שלושה צעדים פשוטים. אתם מחליטים מתי ועם מי.</p>
        </div>
        <ol className="steps-list">
          {steps.map(({ number, icon: Icon, title, description }) => (
            <li key={number}>
              <span className="step-number" aria-hidden="true">{number}</span>
              <span className="step-icon"><Icon aria-hidden="true" /></span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="how-it-works__actions">
          <Link className="how-it-works__cta" to="/teachers">
            מתחילים לחפש
            <ArrowLeft aria-hidden="true" />
          </Link>
          <Link className="text-link" to="/match">או שנמצא מורה בשבילכם</Link>
        </div>
      </div>
    </section>
  )
}
