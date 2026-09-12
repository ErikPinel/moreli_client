import { Skeleton } from '@/components/ui/skeleton'

export function TeacherCardSkeleton() {
  return (
    <div className="teacher-card" aria-hidden="true">
      <Skeleton className="teacher-card__image rounded-none" />
      <div className="teacher-card__content space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="mt-auto h-8 w-full" />
      </div>
    </div>
  )
}