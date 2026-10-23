import { CalendarDays } from 'lucide-react'
import { useId, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { he } from 'react-day-picker/locale'
import { DateTime } from 'luxon'
import { Popover } from 'radix-ui'
import { formatIsraeliDate, parseIsraeliDate } from '@/lib/lesson-time'
import { Input } from '@/components/ui/input'
import 'react-day-picker/style.css'

export function LessonDateInput({ value, onChange, min, isAvailable }: { value: string; onChange: (value: string) => void; min: string; isAvailable: (date: string) => boolean }) {
  const [text, setText] = useState(() => formatIsraeliDate(value))
  const [open, setOpen] = useState(false)
  const inputId = useId()
  const parsed = parseIsraeliDate(text)
  const error = !parsed ? 'יש להזין תאריך תקין בפורמט יום/חודש/שנה, למשל 14/09/2026.' : parsed < min ? 'התאריך שנבחר כבר עבר. בחרו מועד פנוי.' : !isAvailable(parsed) ? 'אין זמינות למשך השיעור שנבחר בתאריך הזה.' : ''
  const calendarDate = (date: string) => DateTime.fromISO(date).toJSDate()
  const calendarValue = (date: Date) => DateTime.fromJSDate(date).toFormat('yyyy-MM-dd')
  return <div className="lesson-date-field"><label htmlFor={inputId}>תאריך</label><div className="lesson-date-control"><Input id={inputId} dir="ltr" placeholder="DD/MM/YYYY" value={text} maxLength={10} aria-invalid={Boolean(error)} aria-describedby={`${inputId}-error`} onChange={(event) => { setText(event.target.value); onChange(parseIsraeliDate(event.target.value) ?? '') }} /><Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger asChild><button type="button" className="time-picker-button" aria-label="בחירת תאריך מלוח שנה" title="בחירת תאריך מלוח שנה"><CalendarDays aria-hidden="true" /></button></Popover.Trigger><Popover.Portal><Popover.Content className="lesson-date-calendar" dir="rtl" sideOffset={8} collisionPadding={12} aria-label="בחירת תאריך לשיעור"><DayPicker mode="single" locale={he} dir="rtl" selected={parsed ? calendarDate(parsed) : undefined} defaultMonth={calendarDate(parsed && parsed >= min ? parsed : min)} startMonth={calendarDate(min)} disabled={(date) => { const iso = calendarValue(date); return iso < min || !isAvailable(iso) }} onSelect={(date) => { if (!date) return; const iso = calendarValue(date); setText(formatIsraeliDate(iso)); onChange(iso); setOpen(false) }} /></Popover.Content></Popover.Portal></Popover.Root></div><p id={`${inputId}-error`} className={error ? 'form-error' : 'lesson-date-format'} aria-live="polite">{error || 'יום/חודש/שנה · DD/MM/YYYY'}</p></div>
}