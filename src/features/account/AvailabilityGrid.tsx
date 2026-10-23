import { availabilityDays, availabilitySegments, toggleAvailabilityHour, type EditableAvailability } from './availability-grid'

export function AvailabilityGrid({ slots, onChange, disabled = false }: { slots: EditableAvailability[]; onChange: (slots: EditableAvailability[]) => void; disabled?: boolean }) {
  const invalid = slots.some((slot, index) => slot.end_time <= slot.start_time || slots.some((other, otherIndex) => otherIndex < index && other.day_of_week === slot.day_of_week && other.start_time < slot.end_time && slot.start_time < other.end_time))
  return <div className="availability-editor">
    <div className="availability-editor__intro"><h3>מבט שבועי · <bdi dir="ltr">09:00–21:00</bdi></h3><p>לחצו על משבצת של שעה כדי לפתוח או לסגור אותה. השדות והמשבצות מתעדכנים יחד.</p><span><i aria-hidden="true" />ירוק = שעות הוראה שנבחרו</span></div>
    {invalid ? <p className="form-error" role="alert">תקנו שעות סיום או חפיפות בין חלונות בשדות למטה לפני שינוי במשבצות.</p> : null}
    <p className="calendar-scroll-hint">גללו לצדדים כדי לראות את כל שבעת ימי השבוע.</p>
    <div className="availability-scroll" role="region" aria-label="זמינות שבועית, שבעה ימים ושנים עשר חלונות של שעה" tabIndex={0}>
      <table className="availability-grid"><thead><tr><th scope="col">שעה</th>{availabilityDays.map(day => <th scope="col" key={day}>{day}</th>)}</tr></thead><tbody>{Array.from({ length: 12 }, (_, index) => index + 9).map(hour => <tr key={hour}><th scope="row" dir="ltr">{String(hour).padStart(2, '0')}:00</th>{availabilityDays.map((day, dayIndex) => {
        const segments = availabilitySegments(slots, dayIndex, hour)
        const total = segments.reduce((sum, part) => sum + part.end - part.start, 0)
        return <td key={day}><button type="button" disabled={disabled || invalid} aria-pressed={total === 0 ? false : total >= 60 ? true : 'mixed'} aria-label={`יום ${day}, ${hour}:00 עד ${hour + 1}:00, ${total === 0 ? 'לא נבחר' : total >= 60 ? 'נבחר' : 'נבחר חלקית'}`} onClick={() => onChange(toggleAvailabilityHour(slots, dayIndex, hour))}>{segments.map((part, index) => <span aria-hidden="true" key={index} style={{ top: `${(part.start - hour * 60) / 60 * 100}%`, height: `${(part.end - part.start) / 60 * 100}%` }} />)}</button></td>
      })}</tr>)}</tbody></table>
    </div><p className="availability-editor__note">כל משבצת היא שעה אחת. זמינות מחוץ לשעות האלה נשארת בשדות למטה. תלמידים רואים רק מועדים פנויים בפועל, לאחר הסרת שיעורים תפוסים ושעות שבת לפי המיקום. השינויים ייכנסו לתוקף רק בשמירה.</p>
  </div>
}
