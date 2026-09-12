import { Search } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { CityDto, SubjectDto } from '@/types/api'
import { CatalogCombobox } from './CatalogCombobox'

type SearchToolbarProps = {
  subject: string
  city: string
  subjects: SubjectDto[]
  cities: CityDto[]
  onSearch: (subject: string, city: string) => void
}

export function SearchToolbar({ subject, city, subjects, cities, onSearch }: SearchToolbarProps) {
  return <SearchToolbarForm key={`${subject}:${city}`} subject={subject} city={city} subjects={subjects} cities={cities} onSearch={onSearch} />
}

function SearchToolbarForm({ subject, city, onSearch }: SearchToolbarProps) {
  const [selectedSubject, setSelectedSubject] = useState(subject)
  const [selectedCity, setSelectedCity] = useState(city)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(selectedSubject, selectedCity)
  }

  return (
    <form className="results-toolbar" onSubmit={submit}>
      <CatalogCombobox
        catalog="professions"
        value={selectedSubject}
        onChange={setSelectedSubject}
        label="מה תרצו ללמוד?"
        placeholder="כל המקצועות"
      />
      <CatalogCombobox catalog="cities" value={selectedCity} onChange={setSelectedCity} label="איפה?" placeholder="כל האזורים" />
      <Button type="submit"><Search />חיפוש</Button>
    </form>
  )
}