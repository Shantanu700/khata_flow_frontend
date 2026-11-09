// The KhataFlow app design's own line icons (24px grid, 1.8 stroke).
type IconProps = { size?: number; stroke?: number; className?: string }

function Icon({ size = 18, stroke = 1.8, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} className={className}>
      {children}
    </svg>
  )
}

export const BookIcon = (p: IconProps) => (
  <Icon {...p}><path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" /></Icon>
)
export const HomeIcon = (p: IconProps) => <Icon {...p}><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" /></Icon>
export const BoxIcon = (p: IconProps) => <Icon {...p}><path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" /></Icon>
export const UsersIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3" /></Icon>
)
export const ListIcon = (p: IconProps) => <Icon {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Icon>
export const MicIcon = (p: IconProps) => (
  <Icon {...p}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5" /></Icon>
)
export const LogoutIcon = (p: IconProps) => <Icon {...p}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></Icon>
export const ArrowIcon = (p: IconProps) => <Icon {...p}><path d="M7 17 17 7M8 7h9v9" /></Icon>
export const CalendarIcon = (p: IconProps) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></Icon>
export const ChevronIcon = ({ left, ...p }: IconProps & { left?: boolean }) => <Icon {...p}><path d={left ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} /></Icon>
export const GlobeIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Icon>
)
export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
)
export const MoonIcon = (p: IconProps) => <Icon {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Icon>
export const BellIcon = (p: IconProps) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4" /></Icon>
export const SearchIcon = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>
export const UndoIcon = (p: IconProps) => <Icon {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></Icon>
export const PlusIcon = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
export const PencilIcon = (p: IconProps) => <Icon {...p}><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Icon>
export const TrashIcon = (p: IconProps) => <Icon {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></Icon>
export const CloseIcon = (p: IconProps) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12" /></Icon>
export const GridIcon = (p: IconProps) => <Icon {...p}><rect x="3" y="3" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" /></Icon>

/** White disc with the book and a lime dot; `ring` is the colour behind it. */
export function LogoMark({ size = 44, ring = "var(--surface)" }: { size?: number; ring?: string }) {
  const dot = size >= 60 ? 16 : 14
  return (
    <span className="relative grid shrink-0 place-items-center rounded-full bg-white text-black" style={{ width: size, height: size }}>
      <BookIcon size={size >= 60 ? 24 : 20} />
      <span
        className="absolute rounded-full border-[3px] bg-lime"
        style={{ width: dot, height: dot, right: size >= 60 ? 0 : -2, bottom: size >= 60 ? 0 : -2, borderColor: ring }}
      />
    </span>
  )
}
export const FilterIcon = (p: IconProps) => <Icon {...p}><path d="M4 6h16M7 12h10M10 18h4" /></Icon>
