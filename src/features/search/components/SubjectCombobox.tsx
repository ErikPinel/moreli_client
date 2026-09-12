import { BookOpen } from 'lucide-react'
import { useMemo } from 'react'
import type { SubjectDto } from '@/types/api'
import { SearchCombobox, type SearchOption } from './SearchCombobox'

type SubjectValue = number | string

type SubjectComboboxProps = {
  subjects: SubjectDto[]
  value: SubjectValue | null
  valueKey: 'id' | 'slug'
  onChange: (value: SubjectValue | null) => void
  label?: string
  placeholder?: string
  isLoading?: boolean
  className?: string
}

export function SubjectCombobox({
  subjects,
  value,
  valueKey,
  onChange,
  label = 'מקצוע',
  placeholder = 'חיפוש מקצוע... ',
  isLoading,
  className,
}: SubjectComboboxProps) {
  const options = useMemo(
    () => subjects.map(toSubjectOption(valueKey)),
    [subjects, valueKey],
  )
  const selected = options.find((option) => option.id === value) ?? null

  return (
    <SearchCombobox
      label={label}
      placeholder={placeholder.trim()}
      icon={<BookOpen aria-hidden="true" />}
      options={options}
      value={selected}
      onChange={(option) => onChange(option?.id ?? null)}
      isLoading={isLoading}
      variant="field"
      className={className}
    />
  )
}

function toSubjectOption(valueKey: 'id' | 'slug') {
  return (subject: SubjectDto): SearchOption => {
    const separator = subject.name_he.indexOf(' - ')
    return {
      id: subject[valueKey],
      label: subject.name_he,
      hint: separator > 0 ? subject.name_he.slice(0, separator) : undefined,
    }
  }
}