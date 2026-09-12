import { ShieldCheck, Star, UsersRound } from 'lucide-react'

const trustItems = [
  { icon: ShieldCheck, label: 'מורים פעילים', value: null, className: 'trust-item--shield' },
  { icon: Star, label: 'דירוג תלמידים', value: '4.8', className: 'trust-item--rating' },
  { icon: UsersRound, label: 'מורים מאומתים', value: null, className: 'trust-item--users' },
] as const

export function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="היתרונות של מורהלי">
      <div className="page-shell grid grid-cols-3">
        {trustItems.map(({ icon: Icon, label, value, className }) => (
          <div className={`trust-item ${className}`} key={label}>
            <Icon aria-hidden="true" />
            <span>{value ? <strong>{value}</strong> : null} {label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}