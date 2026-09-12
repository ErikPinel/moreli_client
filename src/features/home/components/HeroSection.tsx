import { Heart } from 'lucide-react'
import heroImage from '@/assets/morali-hero.webp'
import { HeroSearch } from '@/features/search/components/HeroSearch'
import { TeacherAvatar } from '@/features/teachers/components/TeacherAvatar'
import { useTeachers } from '@/features/teachers/hooks/useTeachers'

const featuredTeacherFilters = { limit: 5, page: 1 }

export function HeroSection() {
  const teachersQuery = useTeachers(featuredTeacherFilters)
  const featuredTeachers = teachersQuery.data?.items.slice(0, 3) ?? []

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
          <h1 id="hero-title">
            המורה הפרטי
            <br />
            שמתאים  <span>לי.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base font-medium leading-8 text-navy/75 sm:text-lg">
            מורים פרטיים מקצועיים, התאמה אישית ותוצאות אמיתיות.
            <br className="hidden sm:block" /> החיפוש החכם שלכם מתחיל כאן.
          </p>
        </div>

        <div className="hero-note" aria-hidden="true">
          <span>מורה המושלם<br />בשבילי</span>
          <svg id="hero-note-arrow-home-desktop-main" className="hero-note__arrow" viewBox="-66 -10 64 44" fill="none">
            <path d="M4 5C13 17 24 23 36 27C42 29 48 31 54 34" />
            <path d="M44 25L54 34L43 40" />
          </svg>
        </div>

        {featuredTeachers.length > 0 ? (
          <div className="social-proof" aria-label="תלמידים מוצאים מורים במורהלי">
            <div className="social-proof__avatars" aria-hidden="true">
              {featuredTeachers.map((teacher) => {
                const name = `${teacher.profile.first_name} ${teacher.profile.last_name}`.trim()
                return (
                  <div className="social-proof__avatar" key={teacher.id}>
                    <TeacherAvatar
                      slug={teacher.slug}
                      name={name}
                      avatarPath={teacher.profile.avatar_path}
                    />
                  </div>
                )
              })}
            </div>
            <p><strong>תלמידים מוצאים</strong><br />את המורה שמתאים להם</p>
            <span className="social-proof__heart" aria-hidden="true">
              <Heart />
            </span>
          </div>
        ) : null}

        <HeroSearch />
      </div>
    </section>
  )
}