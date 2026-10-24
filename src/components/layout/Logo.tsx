import { GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function BrandName({ className }: { className?: string }) {
  return (
    <span className={cn('brand-name', className)} dir="rtl">
      מוֹרֶה<span className="brand-name__suffix">לִי</span>
    </span>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      className={cn('site-logo', className)}
      to="/"
      aria-label="מורהלי - עמוד הבית"
    >
      <span className="site-logo__mark"><GraduationCap aria-hidden="true" /></span>
      <BrandName />
    </Link>
  )
}