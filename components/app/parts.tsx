import * as React from "react"
import { toast } from "sonner"

import { UndoIcon } from "@/components/app/icons"
import { Notch, type Corner, notchRadius } from "@/components/notch"
import { useI18n } from "@/components/app/i18n"
import { useLayout } from "@/components/app/layout"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

/** The design's corner control: a 52px round button sitting in a notch cut into the card. */
export function CornerButton({
  corner = "tr",
  title,
  onClick,
  rotate,
  className,
  radius,
  bg,
  disabled,
  flip,
  children,
}: {
  corner?: Exclude<Corner, "b">
  /** Flip id when this notch belongs to a screen's main card (it morphs between screens). */
  flip?: string
  title: string
  onClick?: () => void
  /** what the panel sits on, when it isn't the page canvas */
  bg?: string
  disabled?: boolean
  /** turn 45° on hover, for the ↗ "open" arrows */
  rotate?: boolean
  className?: string
  /** the notch's own corner radius when it differs from its 36px fillets */
  radius?: number
  children: React.ReactNode
}) {
  const style = radius
    ? corner === "br"
      ? { borderTopLeftRadius: radius }
      : { borderBottomLeftRadius: radius }
    : undefined
  const { phone } = useLayout()
  return (
    <Notch
      corner={corner}
      r={notchRadius(phone ? 44 : 52)}
      gap={10}
      bg={bg}
      style={style}
      data-flip-id={flip}
      data-shape={flip ? "" : undefined}
      className="flex"
    >
      <Tip label={title}>
        <button
          type="button"
          aria-label={title}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            phone ? "size-11" : "size-[52px]",
            "grid cursor-pointer place-items-center rounded-full bg-card text-foreground transition-[transform,opacity] duration-200 disabled:cursor-default disabled:opacity-40",
            rotate && "hover:rotate-45",
            className
          )}
        >
          {children}
        </button>
      </Tip>
    </Notch>
  )
}

/** The label of an icon-only control on hover and keyboard focus (shadcn's tooltip, as in Lead Flow). */
export function Tip({
  label,
  side,
  children,
}: {
  label?: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  children: React.ReactElement
}) {
  if (!label) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/** One async action's progress, so its control can show a spinner while it runs. */
export function usePending() {
  const [pending, setPending] = React.useState(false)
  const track = React.useCallback(<R,>(work: () => R | Promise<R>) => {
    setPending(true)
    return Promise.resolve()
      .then(work)
      .finally(() => setPending(false))
  }, [])
  return [pending, track] as const
}

/** Confirms a finished write with a toast and passes its result on. */
export const toasted =
  (message: string) =>
  <R,>(result: R) => {
    toast.success(message)
    return result
  }

export const Dot = ({ color, size = 10 }: { color: string; size?: number }) => (
  <span
    aria-hidden
    className="shrink-0 rounded-full"
    style={{ width: size, height: size, background: color }}
  />
)

export function UndoButton({
  onClick,
  className,
}: {
  onClick: () => unknown
  className?: string
}) {
  const { t } = useI18n()
  const [pending, track] = usePending()
  return (
    <Tip label={t("entry.undo")}>
      <button
        type="button"
        aria-label={t("entry.undo")}
        aria-busy={pending}
        disabled={pending}
        onClick={() => track(onClick)}
        className={cn(
          "grid size-9 cursor-pointer place-items-center rounded-full bg-raised",
          className
        )}
      >
        {pending ? <Spinner className="size-3.5" /> : <UndoIcon size={14} />}
      </button>
    </Tip>
  )
}

export const AliasChip = ({
  children,
  small,
}: {
  children: React.ReactNode
  small?: boolean
}) => (
  <span
    className={cn(
      "rounded-full bg-raised px-2.5 py-1",
      small ? "text-[11px]" : "text-xs"
    )}
  >
    {children}
  </span>
)

export const PanelTitle = ({
  title,
  sub,
  subClassName,
}: {
  title: string
  sub: string
  subClassName?: string
}) => (
  <div>
    <h2 className="text-xl font-normal">{title}</h2>
    <p className={cn("text-sm text-muted-foreground", subClassName)}>{sub}</p>
  </div>
)

/** Lead Flow's text swap: both labels share one grid cell and crossfade with a 4px rise (200ms). */
export function Swap({
  on,
  off,
  children,
}: {
  on: boolean
  off: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <span className="inline-grid">
      {[off, children].map((label, i) => {
        const shown = (i === 1) === on
        return (
          <span
            key={i}
            inert={!shown}
            aria-hidden={!shown}
            className={cn(
              "transition-[opacity,transform] duration-200 ease-out [grid-area:1/1] motion-reduce:transform-none",
              shown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            )}
          >
            {label}
          </span>
        )
      })}
    </span>
  )
}

/** Time since recording started, as 0:07. */
export function Elapsed({ className }: { className?: string }) {
  const [start] = React.useState(() => Date.now())
  const [now, setNow] = React.useState(start)
  React.useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(tick)
  }, [])
  const s = Math.floor((now - start) / 1000)
  return (
    <span
      className={cn(
        "w-9 shrink-0 text-sm text-black/60 tabular-nums",
        className
      )}
    >
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </span>
  )
}

