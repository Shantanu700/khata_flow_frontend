"use client"

import * as React from "react"
import { Popover } from "radix-ui"

import { useI18n, type T } from "@/components/app/i18n"
import { CalendarIcon, ChevronIcon } from "@/components/app/icons"
import { isoDay, parseDay } from "@/lib/api"
import { cn } from "@/lib/utils"

/** ISO dates, `from` the older end; null is every date. */
export type Range = { from: string; to: string } | null

const shift = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return isoDay(d)
}

const PRESETS: { key: string; range: () => Range }[] = [
  { key: "range.today", range: () => ({ from: shift(0), to: shift(0) }) },
  { key: "range.yesterday", range: () => ({ from: shift(1), to: shift(1) }) },
  { key: "range.week", range: () => ({ from: shift(6), to: shift(0) }) },
  { key: "range.all", range: () => null },
]

/** The API's date filters for a range. */
export const rangeParams = (r: Range) =>
  r ? { date_from: r.from, date_to: r.to } : {}

const short = (iso: string, locale: string) =>
  parseDay(iso).toLocaleDateString(locale, { day: "numeric", month: "short" })

export const rangeLabel = (r: Range, t: T, locale: string) =>
  !r
    ? t("range.allDates")
    : r.from === r.to
      ? short(r.from, locale)
      : `${short(r.from, locale)} – ${short(r.to, locale)}`

/** The month's days in Monday-first rows (null pads the first week). */
function monthCells(year: number, month: number) {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) =>
      isoDay(new Date(year, month, i + 1))
    ),
  ]
}

export function DateRange({
  value,
  onChange,
}: {
  value: Range
  onChange: (r: Range) => void
}) {
  const { t, locale } = useI18n()
  const today = isoDay()
  const [open, setOpen] = React.useState(false)
  const [anchor, setAnchor] = React.useState<string | null>(null)
  const [hover, setHover] = React.useState<string | null>(null)
  const [month, setMonth] = React.useState(() => {
    const d = parseDay(value?.to ?? today)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const shown: Range =
    anchor !== null && hover !== null
      ? anchor < hover
        ? { from: anchor, to: hover }
        : { from: hover, to: anchor }
      : value
  const cells = monthCells(month.y, month.m)
  const now = parseDay(today)
  const atLatest = month.y === now.getFullYear() && month.m === now.getMonth()
  const step = (by: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(y, m + by, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  const pick = (iso: string) => {
    if (anchor === null) {
      setAnchor(iso)
      onChange({ from: iso, to: iso })
      return
    }
    setAnchor(null)
    onChange(
      anchor < iso ? { from: anchor, to: iso } : { from: iso, to: anchor }
    )
    setOpen(false)
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => (setOpen(o), setAnchor(null), setHover(null))}
    >
      <Popover.Trigger
        className="flex h-[52px] cursor-pointer items-center gap-2.5 rounded-full bg-card pr-4 pl-[18px] text-sm whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-raised"
        aria-label={`${t("range.label")}: ${rangeLabel(value, t, locale)}`}
      >
        <CalendarIcon size={16} className="text-muted-foreground" />
        {rangeLabel(value, t, locale)}
        <ChevronIcon size={14} className="rotate-90 text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          collisionPadding={12}
          className="kf-app z-50 flex w-[min(320px,calc(100vw-24px))] flex-col gap-4 rounded-[28px] bg-card p-4 text-foreground shadow-[0_24px_60px_rgb(0_0_0/0.35)] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex gap-1 rounded-full bg-background p-1">
            {PRESETS.map((p) => {
              const r = p.range()
              const on =
                r === null
                  ? value === null
                  : value !== null && r.from === value.from && r.to === value.to
              return (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => (onChange(r), setAnchor(null), setOpen(false))}
                  className={cn(
                    "h-9 flex-1 cursor-pointer rounded-full text-[13px] transition-colors duration-150",
                    on
                      ? "bg-lime text-black"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t(p.key)}
                </button>
              )
            })}
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between px-1">
              <button
                type="button"
                title={t("range.prevMonth")}
                aria-label={t("range.prevMonth")}
                onClick={() => step(-1)}
                className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-raised"
              >
                <ChevronIcon left size={14} />
              </button>
              <p className="text-sm">
                {new Date(month.y, month.m).toLocaleDateString(locale, {
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <button
                type="button"
                title={t("range.nextMonth")}
                aria-label={t("range.nextMonth")}
                disabled={atLatest}
                onClick={() => step(1)}
                className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-raised disabled:cursor-default disabled:opacity-30"
              >
                <ChevronIcon size={14} />
              </button>
            </div>
            <div
              className="grid grid-cols-7 gap-y-1 text-center"
              onMouseLeave={() => setHover(null)}
            >
              {t("weekday.short")
                .split(",")
                .map((w) => (
                  <span
                    key={w}
                    className="pb-1.5 text-[11px] text-muted-foreground"
                  >
                    {w}
                  </span>
                ))}
              {cells.map((iso, i) => {
                if (!iso) return <span key={`pad${i}`} />
                const future = iso > today
                const inside =
                  shown !== null && iso >= shown.from && iso <= shown.to
                const edge =
                  shown !== null && (iso === shown.from || iso === shown.to)
                const col = i % 7
                return (
                  <div
                    key={iso}
                    className={cn(
                      "flex h-10 items-center justify-center",
                      inside && !future && "bg-lime/15",
                      (iso === shown?.from || col === 0) && "rounded-l-full",
                      (iso === shown?.to || col === 6) && "rounded-r-full"
                    )}
                  >
                    <button
                      type="button"
                      disabled={future}
                      onClick={() => pick(iso)}
                      onMouseEnter={() => !future && setHover(iso)}
                      onFocus={() => !future && setHover(iso)}
                      aria-label={short(iso, locale)}
                      aria-pressed={inside}
                      className={cn(
                        "grid size-10 cursor-pointer place-items-center rounded-full text-sm tabular-nums transition-colors duration-150 disabled:cursor-default disabled:opacity-30",
                        edge
                          ? "bg-lime text-black"
                          : !future && "hover:bg-raised",
                        iso === today && !edge && "ring-1 ring-lime/60"
                      )}
                    >
                      {parseDay(iso).getDate()}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="px-1 text-xs text-muted-foreground">
            {anchor === null ? t("range.pickStart") : t("range.pickEnd")}
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
