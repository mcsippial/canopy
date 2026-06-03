import Link from 'next/link'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M16 2L4 8v8c0 7.732 5.333 14.267 12 16 6.667-1.733 12-8.268 12-16V8L16 2z"
          fill="#5DCAA5"
          opacity="0.9"
        />
        <path
          d="M16 6L7 10.5v6c0 5.5 3.8 10.2 9 11.5 5.2-1.3 9-6 9-11.5v-6L16 6z"
          fill="#1a1a2e"
        />
        <path
          d="M16 10L10 13v4c0 3.5 2.4 6.5 6 7.5 3.6-1 6-4 6-7.5v-4L16 10z"
          fill="#5DCAA5"
          opacity="0.6"
        />
      </svg>
      <span className="font-bold text-xl tracking-tight" style={{ color: '#1a1a2e' }}>Canopy</span>
    </Link>
  )
}

export function LogoWhite({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M16 2L4 8v8c0 7.732 5.333 14.267 12 16 6.667-1.733 12-8.268 12-16V8L16 2z"
          fill="#5DCAA5"
          opacity="0.9"
        />
        <path
          d="M16 6L7 10.5v6c0 5.5 3.8 10.2 9 11.5 5.2-1.3 9-6 9-11.5v-6L16 6z"
          fill="#1a1a2e"
        />
        <path
          d="M16 10L10 13v4c0 3.5 2.4 6.5 6 7.5 3.6-1 6-4 6-7.5v-4L16 10z"
          fill="#5DCAA5"
          opacity="0.6"
        />
      </svg>
      <span className="font-bold text-xl tracking-tight text-white">Canopy</span>
    </Link>
  )
}
