// «بذرة نقية» — the brand mark: a quiet seed for beginnings and latent growth.
// Faithful SVG recreation of the approved logo direction (teal gradient seed + gold sprout slit).

export function SeedMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden>
      <defs>
        <linearGradient id="seed-body" x1="0.25" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#16505F" />
          <stop offset="0.55" stopColor="#2E8D91" />
          <stop offset="1" stopColor="#6FC4B4" />
        </linearGradient>
        <linearGradient id="seed-slit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E8DCBB" />
          <stop offset="1" stopColor="#B59A65" />
        </linearGradient>
      </defs>
      {/* seed body — marquise leaning gently like a leaf */}
      <path
        d="M62 4
           C 92 34, 108 68, 103 100
           C 99 128, 80 146, 58 146
           C 36 145, 18 126, 15 98
           C 12 66, 32 32, 62 4 Z"
        fill="url(#seed-body)"
      />
      {/* gold sprout slit with a soft light edge */}
      <path
        d="M66 40
           C 76 60, 78 88, 66 112
           C 63 114, 60 113, 59 110
           C 52 88, 55 60, 63 41
           C 64 39, 65 39, 66 40 Z"
        fill="url(#seed-slit)"
      />
      <path
        d="M63 41 C 55 60, 52 88, 59 110"
        fill="none"
        stroke="#FFFDF8"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity="0.9"
      />
    </svg>
  )
}

// Light variant for dark (teal) surfaces — ivory seed, teal slit.
export function SeedMarkLight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden>
      <defs>
        <linearGradient id="seed-slit-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6FC4B4" />
          <stop offset="1" stopColor="#2E8D91" />
        </linearGradient>
      </defs>
      <path
        d="M62 4
           C 92 34, 108 68, 103 100
           C 99 128, 80 146, 58 146
           C 36 145, 18 126, 15 98
           C 12 66, 32 32, 62 4 Z"
        fill="#F7F2EA"
      />
      <path
        d="M66 40
           C 76 60, 78 88, 66 112
           C 63 114, 60 113, 59 110
           C 52 88, 55 60, 63 41
           C 64 39, 65 39, 66 40 Z"
        fill="url(#seed-slit-l)"
      />
      <path
        d="M63 41 C 55 60, 52 88, 59 110"
        fill="none"
        stroke="#B59A65"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />
    </svg>
  )
}
