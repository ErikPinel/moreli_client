import { GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      className={cn('site-logo', className)}
      to="/"
      aria-label="מורהלי - עמוד הבית"
    >
      <span className="site-logo__mark"><GraduationCap aria-hidden="true" /></span>
      <span className="site-logo__name">
        מורה
        <span>לי</span>
      </span>
    </Link>
  )
}