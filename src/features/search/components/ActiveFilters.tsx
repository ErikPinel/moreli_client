import { X } from 'lucide-react'
import type { TeacherSearchValues } from '../hooks/useTeacherSearchParams'

type ActiveFilter = {
  key: keyof TeacherSearchValues
  label: string
  patch: Partial<TeacherSearchValues>
}

export function ActiveFilters({ filters, onRemove, onClear }: {
  filters: ActiveFilter[]
  onRemove: (patch: Partial<TeacherSearchValues>) => void
  onClear: () => void
}) {
  if (filters.length === 0) return null
  return <div className="active-filters" aria-label="סינון פעיל"><div>{filters.map((filter) => <button key={filter.key} type="button" onClick={() => onRemove(filter.patch)}>{filter.label}<X /></button>)}</div><button type="button" onClick={onClear}>ניקוי הכל</button></div>
}

export type { ActiveFilter }