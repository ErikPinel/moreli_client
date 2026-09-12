import { GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      className={cn('inline-flex items-center gap-1.5 text-2xl font-black text-navy', className)}
      to="/"
      aria-label="מורהלי - עמוד הבית"
    >
      <span className="relative text-navy">
        מורה
        <span className="text-primary">לי</span>
        <span className="absolute -start-2 top-0 size-2 bg-primary" aria-hidden="true" />
      </span>
      <GraduationCap className="size-6 fill-navy text-navy" aria-hidden="true" />
    </Link>
  )
}