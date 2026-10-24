import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { featuredSubjects, subjectHref } from '@/features/home/data/subjects'
import { ScribbleUnderline } from './Scribbles'
import { SubjectIllustration } from './SubjectIllustrations'

export function SubjectsSection() {
  return (
    <section className="page-shell subjects-section" aria-labelledby="subjects-title">
      <div className="subjects-section__header">
        <div>
          <p className="section-kicker">מקצועות ותחומי לימוד</p>
          <h2 id="subjects-title" className="section-title">
            מה תרצו <span className="subjects-section__mark">ללמוד<ScribbleUnderline /></span>?
          </h2>
        </div>
        <Link className="text-link" to="/teachers">
          לכל המקצועות
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <ul className="subjects-grid">
        {featuredSubjects.map((subject) => (
          <li key={subject.key} className={`subject-tile subject-tile--${subject.key}`}>
            <Link to={subjectHref(subject.catalogName)}>
              <span className="subject-tile__art"><SubjectIllustration subject={subject.key} /></span>
              <span className="subject-tile__body">
                <strong>{subject.label}</strong>
                <span>{subject.note}</span>
              </span>
              <span className="subject-tile__go" aria-hidden="true"><ArrowLeft /></span>
            </Link>
          </li>
        ))}
        <li className="subject-tile subject-tile--all">
          <Link to="/teachers">
            <span className="subject-tile__art"><SubjectIllustration subject="more" /></span>
            <span className="subject-tile__body">
              <strong>משהו אחר?</strong>
              <span>חפשו מורים בתחומים נוספים</span>
            </span>
            <span className="subject-tile__go" aria-hidden="true"><ArrowLeft /></span>
          </Link>
        </li>
      </ul>
    </section>
  )
}
