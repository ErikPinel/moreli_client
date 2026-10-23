type ScribbleProps = { className?: string }

export function ScribbleArrow({ className }: ScribbleProps) {
  return (
    <svg className={className} viewBox="0 0 64 40" fill="none" aria-hidden="true">
      <path d="M60 6c-10 2-24 6-34 14-6 5-11 10-17 16" />
      <path d="M8 24c0 4 0 8 1 12 4-1 8-1 12-1" />
    </svg>
  )
}

export function ScribbleUnderline({ className }: ScribbleProps) {
  return (
    <svg className={className} viewBox="0 0 200 14" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <path d="M3 9c40-6 92-8 150-5 14 1 28 2 44 4" />
    </svg>
  )
}
