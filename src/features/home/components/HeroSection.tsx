import { BookOpen, Check, MessagesSquare, Monitor } from 'lucide-react'
import { Link } from 'react-router-dom'
import heroImage from '@/assets/morali-hero.webp'
import { popularSearches, subjectHref } from '@/features/home/data/subjects'
import { HeroSearch } from '@/features/search/components/HeroSearch'
import { ScribbleArrow, ScribbleUnderline } from './Scribbles'

export function HeroSection() {
  return (
    <section className="home-hero" aria-labelledby="hero-title">
      <div className="page-shell home-hero__inner">
        <div className="home-hero__copy">
          <h1 id="hero-title">מורהלי</h1>
          <ScribbleUnderline className="home-hero__underline" />
          <p className="home-hero__description">
            מורים פרטיים. קשר אישי. דרך שמתאימה לכם.
            <br /> מבית הספר ועד הדבר שתמיד רציתם ללמוד.
          </p>
          <ul className="home-hero__cues" aria-label="היתרונות של מורהלי">
            <li><BookOpen aria-hidden="true" /> לימודים בכל שלב בחיים</li>
            <li><Monitor aria-hidden="true" /> אונליין או פרונטלי</li>
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
            <span className="home-hero__card-title">הבקשה שלי</span>
            <span><Check /> מה לומדים</span>
            <span><Check /> בתקציב שלי</span>
            <span><Check /> אונליין או קרוב לבית</span>
          </div>
          <p className="home-hero__sticky" aria-hidden="true">שיעור ראשון?<br />מתחילים מחיפוש אחד</p>
        </figure>

        <div className="home-hero__search">
          <p className="home-hero__hint" aria-hidden="true">
            מתחילים כאן
            <ScribbleArrow className="home-hero__hint-arrow" />
          </p>
          <HeroSearch />
          <nav className="home-hero__popular" aria-label="חיפושים נפוצים">
            <span>חיפושים נפוצים:</span>
            {popularSearches.map((item) => (
              <Link key={item.label} to={subjectHref(item.catalogName)}>{item.label}</Link>
            ))}
            <Link className="home-hero__popular-match" to="/match">לא בטוחים? נמצא בשבילכם</Link>
          </nav>
        </div>
      </div>
    </section>
  )
}
