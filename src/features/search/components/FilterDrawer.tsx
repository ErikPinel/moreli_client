import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import type { CityDto, SubjectDto } from '@/types/api'
import type { TeacherSearchValues } from '../hooks/useTeacherSearchParams'
import { SearchFilters } from './SearchFilters'

export function FilterDrawer({ values, subjects, cities, onApply }: {
  values: TeacherSearchValues
  subjects: SubjectDto[]
  cities: CityDto[]
  onApply: (values: TeacherSearchValues) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(values)

  function change(nextOpen: boolean) {
    if (nextOpen) setDraft(values)
    setOpen(nextOpen)
  }

  return <Drawer open={open} onOpenChange={change}>
    <DrawerTrigger asChild><Button variant="outline"><SlidersHorizontal />סינון</Button></DrawerTrigger>
    <DrawerContent className="search-filter-drawer" dir="rtl">
      <DrawerHeader><DrawerTitle>סינון מורים</DrawerTitle><DrawerDescription>בחרו את הפרטים החשובים לכם והחילו את הסינון.</DrawerDescription></DrawerHeader>
      <div className="search-filter-drawer__body"><SearchFilters values={draft} subjects={subjects} cities={cities} onChange={(patch) => setDraft((current) => ({ ...current, ...patch, page: 1, onlinePage: 1 }))} /></div>
      <DrawerFooter><DrawerClose asChild><Button onClick={() => onApply(draft)} disabled={!draft.online && !draft.inPerson}>החלת הסינון</Button></DrawerClose><DrawerClose asChild><Button variant="ghost">ביטול</Button></DrawerClose></DrawerFooter>
    </DrawerContent>
  </Drawer>
}