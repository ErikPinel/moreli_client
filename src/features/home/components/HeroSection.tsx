import { BookOpen, Check, MessagesSquare, Monitor } from 'lucide-react'
import { Link } from 'react-router-dom'
import heroImage from '@/assets/morali-hero.webp'
import { BrandName } from '@/components/layout/Logo'
import { popularSearches, subjectHref } from '@/features/home/data/subjects'
import { HeroSearch } from '@/features/search/components/HeroSearch'
import { ScribbleArrow, ScribbleUnderline } from './Scribbles'

export function HeroSection() {
  return (
    <section className="home-hero" aria-labelledby="hero-title">
      <div className="page-shell home-hero__inner">
        <div className="home-hero__copy">
          <p className="home-hero__brand"><BrandName /></p>
          <ScribbleUnderline className="home-hero__underline" />
          <h1 id="hero-title">מורה פרטי שמתאים לכם</h1>
          <p className="home-hero__description">
            מחפשים עזרה בלימודים או רוצים ללמוד משהו חדש?
            {' '}בחרו מקצוע ומיקום, הכירו את המורים ושלחו בקשה לשיעור.
          </p>
          <ul className="home-hero__cues" aria-label="היתרונות של מורהלי">
            <li><BookOpen aria-hidden="true" /> מגוון מקצועות ותחומי לימוד</li>
            <li><Monitor aria-hidden="true" /> אונליין או פנים אל פנים</li>
            <li><MessagesSquare aria-hidden="true" /> תיאום ישיר עם המורה</li>
          </ul>
        </div>

        <figure className="home-hero__visual">
          <div className="home-hero__photo">
            <img
              src={heroImage}
              alt="תלמידה לומדת ליד המחשב בביתה"
              width="2048"
              height="768"
              fetchPriority="high"
            />
          </div>
          <div className="home-hero__card" aria-hidden="true">
            <span className="home-hero__card-title">המורה שאני מחפש</span>
            <span><Check /> במקצוע שאני צריך</span>
            <span><Check /> בתקציב שלי</span>
            <span><Check /> אונליין או קרוב לבית</span>
          </div>
          <p className="home-hero__sticky" aria-hidden="true">שיעור ראשון?<br />מתחילים מחיפוש אחד</p>
        </figure>

        <div className="home-hero__search">
          <h2 id="hero-search-title" className="home-hero__hint">
            איזה מורה אתם מחפשים?
            <ScribbleArrow className="home-hero__hint-arrow" aria-hidden="true" />
          </h2>
          <HeroSearch />
          <nav className="home-hero__popular" aria-label="חיפושים נפוצים">
            <span>חיפושים נפוצים:</span>
            {popularSearches.map((item) => (
              <Link key={item.label} to={subjectHref(item.catalogName)}>{item.label}</Link>
            ))}
            <Link className="home-hero__popular-match" to="/match">מתלבטים? קבלו המלצות למורים</Link>
          </nav>
        </div>
      </div>
    </section>
  )
}
