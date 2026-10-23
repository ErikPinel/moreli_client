import heroImage from '@/assets/morali-hero.webp'
import { HeroSearch } from '@/features/search/components/HeroSearch'

export function HeroSection() {
  return (
    <section className="home-hero" aria-labelledby="hero-title">
      <img
        className="home-hero__image"
        src={heroImage}
        alt="תלמידה לומדת ליד המחשב בביתה"
        width="2048"
        height="768"
        fetchPriority="high"
      />
      <div className="home-hero__veil" aria-hidden="true" />

      <div className="page-shell home-hero__inner">
        <div className="home-hero__copy">
          <p className="home-hero__eyebrow">מקום טוב להתחיל ללמוד</p>
          <h1 id="hero-title">
            מורהלי
          </h1>
          <p className="home-hero__description">
            מורים פרטיים. קשר אישי. דרך שמתאימה לכם.
            <br /> מבית הספר ועד הדבר שתמיד רציתם ללמוד.
          </p>
        </div>

        <HeroSearch />
      </div>
    </section>
  )
}