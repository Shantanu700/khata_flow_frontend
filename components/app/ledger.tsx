import * as React from "react"
import { Dialog, Popover } from "radix-ui"

import {
  ChevronIcon,
  CloseIcon,
  FilterIcon,
  GridIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/app/icons"
import { useLayout } from "@/components/app/layout"
import { CornerButton } from "@/components/app/parts"
import { Notch, notchRadius } from "@/components/notch"
import { Segmented } from "@/components/segmented"
import { cn } from "@/lib/utils"

export const PAGE = 11

export function paginate<T>(rows: T[], page: number, size = PAGE) {
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const current = Math.min(page, pages)
  return {
    pages,
    current,
    shown: rows.slice((current - 1) * size, current * size),
  }
}

/** Size of the notch sitting directly in `ref`, so the title beside (or under) it clears it. */
export function useNotchBox(ref: React.RefObject<HTMLElement | null>) {
  const [box, setBox] = React.useState({ w: 0, h: 0, card: 0 })
  React.useLayoutEffect(() => {
    const card = ref.current
    const n = card?.querySelector<HTMLElement>(':scope > [data-notch="tr"]')
    if (!card || !n) return
    // The fillet beside the block curves the card's edge, so the heading must clear it too.
    const fillet = n.querySelector<HTMLElement>(":scope > [aria-hidden]")
    const ro = new ResizeObserver(() =>
      setBox({
        w: n.offsetWidth + (fillet?.offsetWidth ?? 0),
        h: n.offsetHeight,
        card: card.clientWidth,
      })
    )
    ro.observe(n)
    ro.observe(card)
    return () => ro.disconnect()
  }, [ref])
  return box
}

/** Padding for a card's heading so it never runs under its top-right notch: beside it while at least
 *  `min` px is left for the heading, otherwise under it. `pad` is the card's own padding. */
export function clearNotch(
  box: { w: number; h: number; card: number },
  phone: boolean,
  pad: number,
  /** the narrowest the heading may get beside the notch; Infinity always puts it under */
  min = 140
): React.CSSProperties {
  if (!box.w) return {}
  const beside = box.card - box.w - pad - 12
  return min === Infinity || (phone && beside < min)
    ? { paddingTop: Math.max(0, box.h - pad + 6) }
    : { paddingRight: Math.max(0, box.w - pad + 12) }
}

/** The Lead Flow table card: title on the left, controls in a notch cut into the top-right corner.
 *  The notch stays at every width; below `compact` it holds `compactControls` (round buttons) instead. */
export function LedgerCard({
  title,
  sub,
  controls,
  compactControls,
  toolbar,
  className,
  flip,
  children,
}: {
  title: string
  sub: React.ReactNode
  controls: React.ReactNode
  compactControls?: React.ReactNode
  toolbar: React.ReactNode
  className?: string
  /** Flip id prefix when this is the screen's main card (it morphs between screens). */
  flip?: string
  children: React.ReactNode
}) {
  const { compact, phone } = useLayout()
  const ref = React.useRef<HTMLElement>(null)
  const box = useNotchBox(ref)
  return (
    <section
      ref={ref}
      data-panel
      data-flip-id={flip && `${flip}-card`}
      data-shape={flip ? "" : undefined}
      className={cn(
        "relative flex flex-col gap-3.5 rounded-[32px] bg-card p-6",
        className
      )}
    >
      <div
        className="min-h-[58px] min-w-0"
        style={clearNotch(box, phone, 24, 190)}
      >
        <h2 data-roll={flip && "card-title"} className="text-2xl font-normal">
          {title}
        </h2>
        <p
          data-roll={flip && "card-sub"}
          className={cn(
            "font-light text-muted-foreground",
            phone ? "text-lg" : "text-2xl"
          )}
        >
          {sub}
        </p>
      </div>
      <Notch
        corner="tr"
        r={notchRadius(phone ? 44 : 52)}
        gap={10}
        data-flip-id={flip && `${flip}-tr`}
        data-shape={flip ? "" : undefined}
        className="flex items-center gap-[10px]"
      >
        {compact && compactControls ? compactControls : controls}
      </Notch>
      {toolbar}
      {children}
    </section>
  )
}

/** A round 52px control for a notch. */
export function RoundButton({
  title,
  active,
  className,
  children,
  ...props
}: {
  title: string
  active?: boolean
} & React.ComponentProps<"button">) {
  const { phone } = useLayout()
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      {...props}
      className={cn(
        phone ? "size-11" : "size-[52px]",
        "relative grid shrink-0 cursor-pointer place-items-center rounded-full bg-card transition-transform duration-150 active:scale-[0.94]",
        className
      )}
    >
      {children}
      {active && (
        <span
          aria-hidden
          className="absolute top-2.5 right-2.5 size-2 rounded-full bg-lime"
        />
      )}
    </button>
  )
}

/** Search for a condensed notch: a round button that opens into the field in place. */
export function NotchSearch({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  label: string
}) {
  const [open, setOpen] = React.useState(false)
  const { phone } = useLayout()
  return (
    <>
      <RoundButton
        title={label}
        active={!!value}
        onClick={() => setOpen(true)}
        className={cn(open && "invisible")}
      >
        <SearchIcon size={18} />
      </RoundButton>
      {open && (
        // Typing takes the whole notch; closing folds back into the button (a dot marks an active search).
        <label
          className={cn(
            "absolute top-0 right-0 left-[10px] z-10 flex items-center gap-2.5 rounded-full bg-card px-[18px] text-muted-foreground",
            phone ? "h-11" : "h-[52px]"
          )}
        >
          <SearchIcon size={16} />
          <input
            value={value}
            autoFocus
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            placeholder={placeholder}
            aria-label={label}
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
          />
        </label>
      )}
    </>
  )
}

/** A condensed notch's filters: one round button opening the screen's toggles and date range. */
export function FilterButton({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <RoundButton title="Chhaantiye" active={active}>
          <FilterIcon size={18} />
        </RoundButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          collisionPadding={12}
          className="kf-app z-50 flex w-[min(340px,calc(100vw-24px))] flex-col gap-2.5 rounded-[28px] bg-background p-2.5 text-foreground shadow-[0_24px_60px_rgb(0_0_0/0.45)] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  label: string
}) {
  return (
    <label className="flex h-[52px] w-[200px] shrink-0 items-center gap-2.5 rounded-full bg-card px-[18px] text-muted-foreground max-sm:w-full">
      <SearchIcon size={16} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
      />
    </label>
  )
}

export function Pager({
  page,
  pages,
  onPage,
}: {
  page: number
  pages: number
  onPage: (p: number) => void
}) {
  const { phone } = useLayout()
  return (
    <div
      className={cn(
        "flex items-center rounded-full bg-card",
        phone ? "h-11 gap-0.5 p-1 [&_button]:size-9" : "h-[52px] gap-2 p-1.5"
      )}
      role="group"
      aria-label="Page"
    >
      <PageButton
        label="Pichhla page"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronIcon left size={16} />
      </PageButton>
      <span
        className={cn(
          "text-center tabular-nums",
          phone ? "min-w-9 text-xs" : "min-w-12 text-sm"
        )}
        aria-live="polite"
      >
        {page} <span className="text-muted-foreground">/ {pages}</span>
      </span>
      <PageButton
        label="Agla page"
        disabled={page === pages}
        onClick={() => onPage(page + 1)}
      >
        <ChevronIcon size={16} />
      </PageButton>
    </div>
  )
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-10 cursor-pointer place-items-center rounded-full bg-lime text-black transition-[background-color,color,transform] duration-150 active:scale-[0.94]",
        "disabled:cursor-default disabled:opacity-40 disabled:active:scale-100"
      )}
    >
      {children}
    </button>
  )
}

export type View = "cards" | "table"
const VIEWS: { value: View; label: React.ReactNode }[] = [
  {
    value: "cards",
    label: (
      <>
        <GridIcon size={16} />
        <span className="sr-only">Cards</span>
      </>
    ),
  },
  {
    value: "table",
    label: (
      <>
        <ListIcon size={16} />
        <span className="sr-only">Table</span>
      </>
    ),
  },
]

export function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: View
  onChange: (v: View) => void
  className?: string
}) {
  return (
    <Segmented
      label="Kaise dikhaye"
      options={VIEWS}
      value={value}
      onChange={onChange}
      className={cn("h-[52px] bg-card p-1.5", className)}
      itemClassName="px-3.5"
    />
  )
}

export function AddButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  const { phone } = useLayout()
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        phone ? "size-11" : "size-[52px]",
        "grid shrink-0 cursor-pointer place-items-center rounded-full bg-lime text-black transition-[background-color,transform] duration-150 hover:bg-lime/85 active:scale-[0.94]"
      )}
    >
      <PlusIcon size={20} />
    </button>
  )
}

/** Paging for a panel: prev and next in the bottom corners, the count in a notch centred on the bottom edge. The panel needs ~92px bottom padding. */
export function CornerPager({
  total,
  size,
  page,
  pages,
  onPage,
  flip,
}: {
  total: number
  size: number
  page: number
  pages: number
  onPage: (p: number) => void
  flip?: string
}) {
  const { phone } = useLayout()
  const first = total ? (page - 1) * size + 1 : 0
  // Phones page from the top notch instead (the host puts a Pager there).
  if (phone) return null
  return (
    <>
      <CornerButton
        corner="bl"
        flip={flip && `${flip}-bl`}
        title="Pichhla page"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
        className={cn("bg-lime text-black", phone && "size-11")}
      >
        <ChevronIcon left size={16} />
      </CornerButton>
      <Notch
        corner="b"
        r={notchRadius(52)}
        gap={10}
        data-flip-id={flip && `${flip}-b`}
        data-shape={flip ? "" : undefined}
        className="flex"
      >
        <span
          className={cn(
            "flex items-center gap-4 rounded-full bg-secondary text-secondary-foreground",
            phone ? "h-11" : "h-[52px]",
            phone ? "px-5" : "px-6"
          )}
          aria-live="polite"
        >
          {!phone && (
            <span
              data-roll={flip && "pager-range"}
              className="text-xs whitespace-nowrap text-muted-foreground"
            >
              {first}–{Math.min(page * size, total)} / {total}
            </span>
          )}
          <span
            data-roll={flip && "pager-page"}
            className={cn(
              "font-light whitespace-nowrap tabular-nums",
              phone ? "text-lg" : "text-2xl"
            )}
          >
            {page} / {pages}
          </span>
        </span>
      </Notch>
      <CornerButton
        corner="br"
        flip={flip && `${flip}-br`}
        title="Agla page"
        disabled={page === pages}
        onClick={() => onPage(page + 1)}
        className={cn("bg-lime text-black", phone && "size-11")}
      >
        <ChevronIcon size={16} />
      </CornerButton>
    </>
  )
}

export const FIELD =
  "h-[52px] rounded-full bg-raised px-5 text-base outline-none [appearance:textfield] focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-inner-spin-button]:appearance-none"

const BTN = 44
const GAP = 8
const R = (BTN + GAP) / 2
const S = BTN + GAP
const solid = "linear-gradient(#000,#000)"
const fillet = `radial-gradient(circle at 0 100%, transparent ${R - 0.5}px, #000 ${R}px)`
// Notch's shape as a real cut-out (the overlay behind a modal is see-through, so a painted notch can't match it): layer 1 minus the rest.
const NOTCH_MASK: React.CSSProperties = {
  maskImage: [
    solid,
    solid,
    solid,
    `radial-gradient(circle at 100% 0, #000 ${R - 0.5}px, transparent ${R}px)`,
    fillet,
    fillet,
  ].join(","),
  maskSize: `100% 100%, ${S}px ${S - R}px, ${S - R}px ${S}px, ${R}px ${R}px, ${R}px ${R}px, ${R}px ${R}px`,
  maskPosition: `0 0, right 0 top 0, right 0 top 0, right ${S - R}px top ${S - R}px, right ${S}px top 0, right 0 top ${S}px`,
  maskRepeat: "no-repeat",
  maskComposite: "subtract, add, add, add, add, add",
}

/** A centred modal, or with `drawer` a full-height panel sliding in from the right; both get the notched ✕. */
export function FormDialog({
  open,
  onClose,
  drawer,
  children,
}: {
  open: boolean
  onClose: () => void
  drawer?: boolean
  children: React.ReactNode
}) {
  const { phone } = useLayout()
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "kf-app fixed z-50 text-foreground drop-shadow-[0_24px_60px_rgb(0_0_0/0.35)] outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
            drawer
              ? cn(
                  "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-10 data-[state=open]:duration-300 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-10",
                  phone
                    ? "inset-[6px]"
                    : "inset-y-[10px] right-[10px] w-[min(520px,calc(100vw-20px))]"
                )
              : "top-1/2 left-1/2 flex max-h-[calc(100dvh-32px)] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          <div
            className={cn(
              "overflow-y-auto overscroll-contain rounded-[32px] bg-card [&_h2]:pr-12",
              drawer ? "h-full" : "min-h-0",
              phone ? "p-5" : "p-7"
            )}
            style={NOTCH_MASK}
          >
            {children}
          </div>
          <Dialog.Close
            title="Band karo"
            aria-label="Band karo"
            className="absolute top-0 right-0 grid cursor-pointer place-items-center rounded-full bg-[#fe9695] text-black transition-transform duration-150 hover:rotate-90"
            style={{ width: BTN, height: BTN }}
          >
            <CloseIcon size={18} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** No cancel button: the notched ✕, Esc and the overlay close a modal. */
export function FormActions({
  submit,
  onDelete,
}: {
  submit: React.ReactNode
  onDelete?: () => void
}) {
  return (
    <div className="flex gap-[10px] pt-1">
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="flex h-14 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#fe9695]/15 text-base text-[var(--red-ink)] transition-colors duration-150 hover:bg-[#fe9695]/25"
        >
          <TrashIcon size={18} />
          Hatao
        </button>
      ) : null}
      <button
        type="submit"
        className="h-14 flex-1 cursor-pointer rounded-full bg-lime text-base font-medium text-black transition-transform duration-150 hover:scale-[1.02]"
      >
        {submit}
      </button>
    </div>
  )
}
