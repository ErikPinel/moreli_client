import { SlidersHorizontal } from 'lucide-react'
import type { CityDto, SubjectDto } from '@/types/api'
import type { TeacherSearchValues } from '../hooks/useTeacherSearchParams'
import { CatalogCombobox } from './CatalogCombobox'

type SearchFiltersProps = {
  values: TeacherSearchValues
  subjects: SubjectDto[]
  cities: CityDto[]
  onChange: (patch: Partial<TeacherSearchValues>) => void
}

export function SearchFilters({ values, onChange }: SearchFiltersProps) {
  return (
    <div className="search-filters">
      <h2><SlidersHorizontal />סינון תוצאות</h2>
      <CatalogCombobox
        catalog="professions"
        value={values.subject}
        onChange={(subject) => onChange({ subject })}
        label="מקצוע"
        placeholder="כל המקצועות"
      />
      <fieldset>
        <legend>סוג שיעור</legend>
        <label className="search-filter-check"><input type="checkbox" checked={values.online} onChange={(event) => onChange({ online: event.target.checked })} />אונליין</label>
        <label className="search-filter-check"><input type="checkbox" checked={values.inPerson} onChange={(event) => onChange({ inPerson: event.target.checked })} />פרונטלי</label>
        {values.city && values.online ? <small>שיעורי אונליין מוצגים בנפרד, ללא הגבלת עיר.</small> : null}
        {!values.online && !values.inPerson ? <small>בחרו לפחות סוג שיעור אחד.</small> : null}
      </fieldset>
      <div className="search-price-fields">
        <span>מחיר לשעה</span>
        <label><span>מ־</span><input type="number" min="0" inputMode="numeric" value={values.priceMin} onChange={(event) => onChange({ priceMin: event.target.value })} placeholder="₪80" /></label>
        <label><span>עד</span><input type="number" min="0" inputMode="numeric" value={values.priceMax} onChange={(event) => onChange({ priceMax: event.target.value })} placeholder="₪250" /></label>
      </div>
      {values.inPerson ? <CatalogCombobox catalog="cities" value={values.city} onChange={(city) => onChange({ city })} label="מיקום" placeholder="כל האזורים" /> : null}
      <fieldset>
        <legend>איכות</legend>
        <label className="search-filter-check"><input type="checkbox" checked={values.verifiedOnly} onChange={(event) => onChange({ verifiedOnly: event.target.checked })} />מורים מאומתים בלבד</label>
        <label className="search-filter-check"><input type="checkbox" checked={values.ratingMin === '4.5'} onChange={(event) => onChange({ ratingMin: event.target.checked ? '4.5' : '' })} />דירוג 4.5 ומעלה</label>
      </fieldset>
    </div>
  )
}