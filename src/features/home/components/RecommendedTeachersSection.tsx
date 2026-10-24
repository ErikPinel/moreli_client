import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TeacherCard } from '@/features/teachers/components/TeacherCard'
import { TeacherCardSkeleton } from '@/features/teachers/components/TeacherCardSkeleton'
import { useTeachers } from '@/features/teachers/hooks/useTeachers'

const recommendedFilters = { limit: 5, page: 1 }

export function RecommendedTeachersSection() {
  const teachersQuery = useTeachers(recommendedFilters)
  const teachers = teachersQuery.data?.items ?? []

  return (
    <section className="page-shell recommended-section" aria-labelledby="recommended-title">
      <div className="recommended-section__header">
        <div className="recommended-section__heading">
          <h2 id="recommended-title" className="section-title">מורים שכדאי להכיר</h2>
          <p>הכירו את המורים, בדקו מחירים ובחרו למי לפנות.</p>
        </div>
        <Link className="text-link" to="/teachers">
          לכל המורים
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {teachersQuery.isLoading ? (
        <div className="teachers-grid" aria-label="טוען מורים">
          {Array.from({ length: 5 }, (_, index) => (
            <TeacherCardSkeleton key={index} />
          ))}
        </div>
      ) : teachersQuery.isError ? (
        <div className="section-state" role="alert">
          <p>לא הצלחנו לטעון את המורים כרגע.</p>
          <button type="button" onClick={() => void teachersQuery.refetch()}>
            <RefreshCw aria-hidden="true" />
            נסו שוב
          </button>
        </div>
      ) : teachers.length === 0 ? (
        <div className="section-state">
          <p>עדיין אין מורים שפורסמו.</p>
          <Link to="/teach">הצטרפו כמורים הראשונים</Link>
        </div>
      ) : (
        <div className="teachers-grid">
          {teachers.map((teacher) => (
            <TeacherCard key={teacher.id} teacher={teacher} />
          ))}
        </div>
      )}
    </section>
  )
}