import { Clock3 } from 'lucide-react'
import { useId, useRef } from 'react'

export function TimeSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const selectRef = useRef<HTMLSelectElement>(null)
  const selectId = useId()
  const choices = Array.from({ length: 96 }, (_, index) => `${String(Math.floor(index / 4)).padStart(2, '0')}:${String(index % 4 * 15).padStart(2, '0')}`)
  if (value && !choices.includes(value)) choices.push(value)
  return <div className="israel-time-field"><label htmlFor={selectId}>{label}</label><div><select id={selectId} ref={selectRef} dir="ltr" value={value} onChange={(event) => onChange(event.target.value)}>{choices.sort().map((time) => <option key={time} value={time}>{time}</option>)}</select><button type="button" className="time-picker-button" aria-label={`בחירת ${label}`} title={`בחירת ${label} · שעון ישראל`} onClick={() => { const select = selectRef.current; select?.focus(); try { select?.showPicker?.() } catch { select?.click() } }}><Clock3 aria-hidden="true" /></button></div></div>
}