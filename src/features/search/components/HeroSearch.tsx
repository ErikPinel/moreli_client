import { ArrowLeft, BookOpen, MapPin } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SearchOption } from './SearchCombobox'
import { SearchCombobox } from './SearchCombobox'
import { catalogs } from '@/data/catalogs'

const subjectOptions = catalogs.professions.map((item) => ({ id: item.slug, label: item.name_he }))
const cityOptions = [
  { id: 'online', label: 'אונליין' },
  ...catalogs.cities.map((item) => ({ id: item.slug, label: item.name_he })),
]

export function HeroSearch() {
  const navigate = useNavigate()
  const [subject, setSubject] = useState<SearchOption | null>(null)
  const [location, setLocation] = useState<SearchOption | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (subject) params.set('subject', String(subject.id))
    if (location?.id === 'online') {
      params.set('online', 'true')
      params.set('inPerson', 'false')
    } else if (location) {
      params.set('city', String(location.id))
    }
    navigate(`/teachers${params.size ? `?${params.toString()}` : ''}`)
  }

  return (
    <form
      className="hero-search"
      aria-label="חיפוש מורה"
      onSubmit={submit}
    >
      <SearchCombobox
        label="מה תרצו ללמוד?"
        placeholder="לדוגמה: מתמטיקה, אנגלית..."
        icon={<BookOpen className="size-5" />}
        options={subjectOptions}
        value={subject}
        onChange={setSubject}
      />
      <SearchCombobox
        label="איפה?"
        placeholder="אונליין או אזור מגורים"
        icon={<MapPin className="size-5" />}
        options={cityOptions}
        value={location}
        onChange={setLocation}
      />
      <button className="hero-search__submit" type="submit">
        מצאו לי מורה
        <ArrowLeft className="size-5" aria-hidden="true" />
      </button>
    </form>
  )
}