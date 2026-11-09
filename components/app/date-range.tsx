"use client"

import * as React from "react"
import { Popover } from "radix-ui"

import { CalendarIcon, ChevronIcon } from "@/components/app/icons"
import { dayMonth } from "@/components/app/khata-data"
import { cn } from "@/lib/utils"

/** Days before today, inclusive; `from` is the older end. */
export type Range = { from: number; to: number }
export const FULL: Range = { from: 14, to: 0 }

const PRESETS: { label: string; range: Range }[] = [
  { label: "Aaj", range: { from: 0, to: 0 } },
  { label: "Kal", range: { from: 1, to: 1 } },
  { label: "7 din", range: { from: 6, to: 0 } },
  { label: "Sab", range: FULL },
]
const WEEKDAYS = ["So", "Ma", "Bu", "Gu", "Shu", "Sha", "Ra"]
// 26 Oct (14 days back) is a Monday, so the grid starts there; the last six cells are days to come.
const CELLS = Array.from({ length: 21 }, (_, i) => 14 - i)

export const rangeLabel = ({ from, to }: Range) => (from === to ? dayMonth(from) : `${dayMonth(from)} – ${dayMonth(to)}`)

export function DateRange({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const [open, setOpen] = React.useState(false)
  const [anchor, setAnchor] = React.useState<number | null>(null)
  const [hover, setHover] = React.useState<number | null>(null)
  const shown = anchor !== null && hover !== null ? { from: Math.max(anchor, hover), to: Math.min(anchor, hover) } : value

  const pick = (d: number) => {
    if (anchor === null) {
      setAnchor(d)
      onChange({ from: d, to: d })
      return
    }
    setAnchor(null)
    onChange({ from: Math.max(anchor, d), to: Math.min(anchor, d) })
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={(o) => (setOpen(o), setAnchor(null), setHover(null))}>
      <Popover.Trigger
        className="flex h-[52px] cursor-pointer items-center gap-2.5 rounded-full bg-card pr-4 pl-[18px] text-sm whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-raised"
        aria-label={`Tareekh chuniye: ${rangeLabel(value)}`}
      >
        <CalendarIcon size={16} className="text-muted-foreground" />
        {rangeLabel(value)}
        <ChevronIcon size={14} className="rotate-90 text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          className="kf-app z-50 flex w-[320px] flex-col gap-4 rounded-[28px] bg-card p-4 text-foreground shadow-[0_24px_60px_rgb(0_0_0/0.35)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex gap-1 rounded-full bg-background p-1">
            {PRESETS.map((p) => {
              const on = p.range.from === value.from && p.range.to === value.to
              return (
                <button
                  key={p.label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => (onChange(p.range), setAnchor(null), setOpen(false))}
                  className={cn(
                    "h-9 flex-1 cursor-pointer rounded-full text-[13px] transition-colors duration-150",
                    on ? "bg-lime text-black" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          <div>
            <p className="mb-2.5 px-1 text-sm">Oct – Nov 2026</p>
            <div className="grid grid-cols-7 gap-y-1 text-center" onMouseLeave={() => setHover(null)}>
              {WEEKDAYS.map((w) => <span key={w} className="pb-1.5 text-[11px] text-muted-foreground">{w}</span>)}
              {CELLS.map((d) => {
                const future = d < 0
                const inside = d <= shown.from && d >= shown.to
                const edge = d === shown.from || d === shown.to
                return (
                  <div
                    key={d}
                    className={cn(
                      "flex h-10 items-center justify-center",
                      inside && !future && "bg-lime/15",
                      (d === shown.from || (14 - d) % 7 === 0) && "rounded-l-full",
                      (d === shown.to || (14 - d) % 7 === 6) && "rounded-r-full"
                    )}
                  >
                    <button
                      type="button"
                      disabled={future}
                      onClick={() => pick(d)}
                      onMouseEnter={() => !future && setHover(d)}
                      onFocus={() => !future && setHover(d)}
                      aria-label={dayMonth(d)}
                      aria-pressed={inside}
                      className={cn(
                        "grid size-10 cursor-pointer place-items-center rounded-full text-sm tabular-nums transition-colors duration-150 disabled:cursor-default disabled:opacity-30",
                        edge ? "bg-lime text-black" : !future && "hover:bg-raised",
                        d === 0 && !edge && "ring-1 ring-lime/60"
                      )}
                    >
                      {9 - d > 0 ? 9 - d : 40 - d}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="px-1 text-xs text-muted-foreground">
            {anchor === null ? "Pehli tareekh chuniye, phir aakhri" : "Ab aakhri tareekh chuniye"}
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
