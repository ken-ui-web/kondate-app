import type { ReactNode } from 'react'

/**
 * 線画アイコン。stroke="currentColor" なので置かれた場所の文字色に馴染む。
 */
export type IconName =
  | 'calendar' | 'cart' | 'fridge' | 'book' | 'settings'
  | 'sparkles' | 'refresh' | 'chevron-left' | 'chevron-right'
  | 'plus' | 'minus' | 'x' | 'check' | 'search' | 'trash'
  | 'utensils' | 'soup' | 'bulb' | 'eye' | 'eye-off'
  | 'download' | 'upload' | 'users' | 'jar' | 'archive'
  | 'camera' | 'key'

const PATHS: Record<IconName, ReactNode> = {
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
      <path d="M3 3.5h2.2l2.4 11.2a1.8 1.8 0 0 0 1.76 1.42h7.55a1.8 1.8 0 0 0 1.76-1.43L20.5 8H6.1" />
    </>
  ),
  fridge: (
    <>
      <rect x="5.5" y="2.5" width="13" height="19" rx="2.2" />
      <path d="M5.5 9.5h13M9 5.3v1.8M9 12.5v3" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.6C10.5 5.1 8.4 4.3 5.8 4.3c-1 0-1.9.1-2.8.35V19c.9-.25 1.8-.35 2.8-.35 2.6 0 4.7.8 6.2 2.3 1.5-1.5 3.6-2.3 6.2-2.3 1 0 1.9.1 2.8.35V4.65a10.8 10.8 0 0 0-2.8-.35c-2.6 0-4.7.8-6.2 2.3Z" />
      <path d="M12 6.6V21" />
    </>
  ),
  settings: (
    <>
      <path d="M20 7h-9M14 17H5" />
      <circle cx="17" cy="7" r="2.8" />
      <circle cx="7" cy="17" r="2.8" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3.5 13.8 8.7 19 10.5 13.8 12.3 12 17.5 10.2 12.3 5 10.5 10.2 8.7 12 3.5Z" />
      <path d="M18.8 15.8l.65 1.75 1.75.65-1.75.65-.65 1.75-.65-1.75-1.75-.65 1.75-.65.65-1.75Z" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8.2" />
      <path d="M21 3.5v4.7h-4.7" />
    </>
  ),
  'chevron-left': <path d="M14.5 6l-6 6 6 6" />,
  'chevron-right': <path d="M9.5 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M4.5 12.5l5 5 10-10.5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.3-4.3" />
    </>
  ),
  trash: (
    <>
      <path d="M4 6.5h16M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
      <path d="M6.5 6.5l.75 12.7a2 2 0 0 0 2 1.9h5.5a2 2 0 0 0 2-1.9l.75-12.7" />
      <path d="M10 10.5v6.5M14 10.5v6.5" />
    </>
  ),
  utensils: (
    <>
      <path d="M4.5 3v6.5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3" />
      <path d="M7.5 3v18" />
      <path d="M19.5 15h-2.6a1.4 1.4 0 0 1-1.4-1.4V8a5 5 0 0 1 4-4.9V21" />
    </>
  ),
  soup: (
    <>
      <path d="M4 11.5h16a8 8 0 0 1-16 0Z" />
      <path d="M9 8c.6-1 .6-2.2 0-3.2M13.8 8c.6-1 .6-2.2 0-3.2" />
    </>
  ),
  bulb: (
    <>
      <path d="M12 3a6 6 0 0 1 3.6 10.8c-.7.55-1.1 1.3-1.1 2.2h-5c0-.9-.4-1.65-1.1-2.2A6 6 0 0 1 12 3Z" />
      <path d="M9.8 19.5h4.4M10.8 22h2.4" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.7 12 5.7 21.5 12 21.5 12 18 18.3 12 18.3 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.9" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M4 4.5l16 15" />
      <path d="M9.9 6.1A9.7 9.7 0 0 1 12 5.9c6 0 9.5 6.1 9.5 6.1a16.6 16.6 0 0 1-2.6 3.2M6.4 7.4A16 16 0 0 0 2.5 12S6 18.1 12 18.1c1.1 0 2.1-.2 3-.5" />
      <path d="M9.9 9.9a2.9 2.9 0 0 0 4.1 4.1" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5v10.5M7.5 10L12 14.5 16.5 10" />
      <path d="M4 16.5v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  upload: (
    <>
      <path d="M12 14.5V4M7.5 8L12 3.5 16.5 8" />
      <path d="M4 16.5v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.5-3.4 2.7-5.4 5.5-5.4s5 2 5.5 5.4" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16.4 14.7c2.2.4 3.7 2.1 4.1 4.8" />
    </>
  ),
  jar: (
    <>
      <rect x="6.5" y="7.5" width="11" height="13.5" rx="2.5" />
      <path d="M9 7.5V5.8a1.8 1.8 0 0 1 1.8-1.8h2.4A1.8 1.8 0 0 1 15 5.8v1.7" />
      <path d="M6.5 11.5h11" />
    </>
  ),
  archive: (
    <>
      <rect x="3.5" y="4" width="17" height="5" rx="1.5" />
      <path d="M5.5 9v9.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V9" />
      <path d="M10 13h4" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.3a2 2 0 0 1 2-2h1.1l.95-1.7A1.6 1.6 0 0 1 9.45 3.7h5.1a1.6 1.6 0 0 1 1.4.9l.95 1.7H18a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="13.2" r="3.6" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="3.5" />
      <path d="M9.9 13.1 18 5M15.2 8.8l2.3 2.3M18.5 5.5l2 2" />
    </>
  ),
}

export default function Icon({
  name,
  size = 18,
  strokeWidth = 1.8,
  className,
}: {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
