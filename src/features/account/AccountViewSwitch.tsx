import { GraduationCap, Presentation } from 'lucide-react'
import { Link } from 'react-router-dom'
import { accountViewHome, useAccountView } from './account-view'

export function AccountViewSwitch({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const { view, canTeach } = useAccountView()
  if (!canTeach) return null
  const options = [
    { value: 'student' as const, label: compact ? 'תלמיד' : 'מצב תלמיד', hint: 'לומדים ומזמינים שיעורים', icon: GraduationCap },
    { value: 'teacher' as const, label: compact ? 'מורה' : 'מצב מורה', hint: 'פניות, תלמידים וזמינות', icon: Presentation },
  ]
  return (
    <nav className={`account-view-switch${compact ? ' account-view-switch--compact' : ''}`} aria-label="מעבר בין מצב תלמיד למצב מורה">
      {options.map(({ value, label, hint, icon: Icon }) => (
        <Link
          key={value}
          to={accountViewHome[value]}
          className={`account-view-switch__option account-view-switch__option--${value}${view === value ? ' is-active' : ''}`}
          aria-current={view === value ? 'true' : undefined}
          onClick={onNavigate}
        >
          <Icon aria-hidden="true" />
          <span>
            <strong>{label}</strong>
            {compact ? null : <small>{hint}</small>}
          </span>
        </Link>
      ))}
    </nav>
  )
}
