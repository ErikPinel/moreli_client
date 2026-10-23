import type { ReactNode } from 'react'

const ink = '#0c244f'
const orange = '#ff5a0a'
const hand = '"Playpen Sans Hebrew Variable", cursive'

function Frame({ blob, children }: { blob: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 200 140" direction="ltr" fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M38 22c22-16 70-18 104-8 30 9 50 34 44 64-6 32-40 52-82 52-38 0-74-14-84-42C12 62 20 35 38 22Z" fill={blob} stroke="none" />
      {children}
    </svg>
  )
}

function MathArt() {
  return (
    <Frame blob="#ffe7d6">
      <rect x="44" y="26" width="86" height="92" rx="4" fill="#fff" transform="rotate(-4 87 72)" />
      <g stroke="#d9e2f0" strokeWidth="1.2" transform="rotate(-4 87 72)">
        <path d="M44 44h86M44 62h86M44 80h86M44 98h86M62 26v92M80 26v92M98 26v92M116 26v92" />
      </g>
      <text x="87" y="66" textAnchor="middle" fill={ink} stroke="none" fontFamily={hand} fontSize="17" fontWeight="600" transform="rotate(-4 87 72)">a²+b²</text>
      <path d="M60 92c10-12 20-14 30-4s22 8 30-6" stroke={orange} transform="rotate(-4 87 72)" />
      <path d="M128 52l34 62h-34Z" fill="#ffd2b8" />
      <path d="M128 72l14 30h-14Z" fill="#fff" />
      <path d="M128 60h5M128 68h8M128 76h5M128 84h8M128 92h5M128 100h8" strokeWidth="1.6" />
    </Frame>
  )
}

function EnglishArt() {
  return (
    <Frame blob="#e3edff">
      <path d="M30 34h78a10 10 0 0 1 10 10v28a10 10 0 0 1-10 10H62l-16 14v-14H30a10 10 0 0 1-10-10V44a10 10 0 0 1 10-10Z" fill="#fff" />
      <text x="69" y="64" textAnchor="middle" fill={ink} stroke="none" fontFamily={hand} fontSize="18" fontWeight="700">Hello!</text>
      <path d="M100 66h68a10 10 0 0 1 10 10v24a10 10 0 0 1-10 10h-10v14l-16-14h-42a10 10 0 0 1-10-10V76a10 10 0 0 1 10-10Z" fill={orange} stroke={ink} />
      <text x="134" y="94" textAnchor="middle" fill="#fff" stroke="none" fontFamily={hand} fontSize="17" fontWeight="700">ABC</text>
      <path d="M150 30l4 8 8 2-8 3-4 8-3-8-8-3 8-2Z" fill="#ffd2b8" strokeWidth="1.8" />
    </Frame>
  )
}

function CodingArt() {
  return (
    <Frame blob="#e2f3ea">
      <rect x="32" y="24" width="136" height="90" rx="10" fill="#fff" />
      <path d="M32 42h136" />
      <circle cx="44" cy="33" r="2.5" fill={orange} stroke="none" />
      <circle cx="53" cy="33" r="2.5" fill="#f5c84b" stroke="none" />
      <circle cx="62" cy="33" r="2.5" fill="#3cb179" stroke="none" />
      <path d="M62 62l-14 14 14 14M138 62l14 14-14 14M108 56l-16 42" stroke={orange} strokeWidth="3.5" />
      <path d="M48 104h30M86 104h16" stroke="#c8d3e3" />
      <rect x="60" y="118" width="80" height="6" rx="3" fill="#fff" />
    </Frame>
  )
}

function PianoArt() {
  return (
    <Frame blob="#efe6ff">
      <rect x="26" y="62" width="148" height="56" rx="6" fill="#fff" />
      <path d="M47 62v56M68 62v56M89 62v56M110 62v56M131 62v56M152 62v56" />
      {[41, 62, 104, 125, 146].map((x) => (
        <rect key={x} x={x} y="62" width="12" height="32" rx="2" fill={ink} stroke="none" />
      ))}
      <path d="M66 46V18l26-6v28" />
      <ellipse cx="60" cy="46" rx="7" ry="5" fill={orange} />
      <ellipse cx="86" cy="40" rx="7" ry="5" fill={orange} />
      <path d="M132 36V16l14 6" />
      <ellipse cx="126" cy="36" rx="7" ry="5" fill="#fff" />
    </Frame>
  )
}

function GuitarArt() {
  return (
    <Frame blob="#fff1cc">
      <g transform="rotate(-38 100 76)">
        <path d="M100 52c-14 0-22 10-20 20 1 6-4 9-8 14-10 12-4 34 28 34s38-22 28-34c-4-5-9-8-8-14 2-10-6-20-20-20Z" fill={orange} />
        <circle cx="100" cy="86" r="9" fill={ink} stroke="none" />
        <rect x="95" y="6" width="10" height="50" rx="2" fill="#fff" />
        <path d="M95 18h10M95 28h10M95 38h10" strokeWidth="1.6" />
        <rect x="92" y="-6" width="16" height="14" rx="3" fill={ink} stroke="none" />
        <path d="M90 108h20" />
      </g>
      <path d="M150 34c4 4 4 10 0 14M158 28c8 8 8 20 0 28" stroke={orange} />
    </Frame>
  )
}

function PsychometricArt() {
  return (
    <Frame blob="#ffe7d6">
      <rect x="90" y="24" width="76" height="94" rx="6" fill="#fff" />
      <path d="M104 46l5 5 9-10M104 70l5 5 9-10" stroke="#168257" strokeWidth="3" />
      <path d="M126 46h28M126 70h28M126 94h22" stroke="#c8d3e3" />
      <rect x="102" y="86" width="16" height="16" rx="3" />
      <circle cx="66" cy="78" r="34" fill="#fff" />
      <path d="M60 40h12M66 40v4M92 54l6-6" />
      <path d="M66 78V60M66 78l12 8" stroke={orange} strokeWidth="3" />
      <circle cx="66" cy="78" r="3" fill={ink} stroke="none" />
    </Frame>
  )
}

function DrawingArt() {
  return (
    <Frame blob="#e3edff">
      <path d="M94 26c-36 0-62 22-62 50s22 44 46 40c12-2 10-14 20-16 14-3 26 6 38-6 18-18 6-68-42-68Z" fill="#fff" />
      <circle cx="66" cy="58" r="8" fill={orange} />
      <circle cx="94" cy="46" r="8" fill="#f5c84b" />
      <circle cx="124" cy="56" r="8" fill="#3cb179" />
      <circle cx="58" cy="88" r="8" fill="#6c8cff" />
      <path d="M172 20l-44 58" strokeWidth="6" />
      <path d="M128 78c-8 2-12 8-12 16 8 0 14-4 16-12Z" fill={orange} />
    </Frame>
  )
}

function MoreArt() {
  const label = { fill: ink, stroke: 'none', fontFamily: '"Heebo Variable", sans-serif', fontSize: 14, fontWeight: 700, textAnchor: 'middle', direction: 'rtl' } as const
  return (
    <Frame blob="#ffe7d6">
      <rect x="30" y="26" width="62" height="34" rx="8" fill="#fff" transform="rotate(-4 61 43)" />
      <rect x="104" y="20" width="66" height="34" rx="8" fill="#fff" transform="rotate(3 137 37)" />
      <rect x="36" y="78" width="62" height="34" rx="8" fill="#fff" transform="rotate(2 67 95)" />
      <text x="61" y="48" {...label} transform="rotate(-4 61 43)">שחמט</text>
      <text x="137" y="42" {...label} transform="rotate(3 137 37)">ספרדית</text>
      <text x="67" y="100" {...label} transform="rotate(2 67 95)">כימיה</text>
      <circle cx="136" cy="90" r="22" fill="#fff" stroke={orange} strokeWidth="4" />
      <path d="M152 106l16 16" stroke={orange} strokeWidth="6" />
    </Frame>
  )
}

const illustrations: Record<string, () => ReactNode> = {
  math: MathArt,
  english: EnglishArt,
  coding: CodingArt,
  piano: PianoArt,
  guitar: GuitarArt,
  psychometric: PsychometricArt,
  drawing: DrawingArt,
  more: MoreArt,
}

export function SubjectIllustration({ subject }: { subject: string }) {
  const Art = illustrations[subject] ?? MoreArt
  return <Art />
}
