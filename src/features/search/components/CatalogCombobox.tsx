import { BookOpen, MapPin } from 'lucide-react'
import { useMemo } from 'react'
import { catalogs } from '@/data/catalogs'
import { SearchCombobox } from './SearchCombobox'

type Props = {
  catalog: keyof typeof catalogs
  value: string
  onChange: (slug: string) => void
  label: string
  placeholder?: string
  excluded?: string[]
  selected?: string[]
  onRemove?: (slug: string) => void
}

export function CatalogCombobox({ catalog, value, onChange, label, placeholder = '', excluded, selected, onRemove }: Props) {
  const options = useMemo(() => catalogs[catalog]
    .filter((item) => !excluded?.includes(item.slug))
    .map((item) => ({ id: item.slug, label: item.name_he })), [catalog, excluded])

  return <SearchCombobox
    label={label}
    placeholder={placeholder}
    icon={catalog === 'cities' ? <MapPin /> : <BookOpen />}
    options={options}
    value={options.find((item) => item.id === value) ?? null}
    onChange={(item) => onChange(item ? String(item.id) : '')}
    variant="field"
    selectedOptions={selected?.map((slug) => ({ id: slug, label: catalogs[catalog].find((item) => item.slug === slug)?.name_he ?? slug }))}
    onRemove={(id) => onRemove?.(String(id))}
  />
}