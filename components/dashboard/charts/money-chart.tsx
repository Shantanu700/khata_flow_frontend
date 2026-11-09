"use client"

import * as React from "react"

import { ChartCard, DataTable, niceTicks } from "@/components/dashboard/charts/chart-card"
import type { Day } from "@/lib/demo"
import { inr, inrTick, shortDate } from "@/lib/format"
import { cn } from "@/lib/utils"

const PLOT_H = 176
const SERIES = [
  { key: "udhaar", label: "Udhaar diya", color: "var(--chart-udhaar)" },
  { key: "vasooli", label: "Vasooli", color: "var(--chart-vasooli)" },
] as const

/** Udhaar given vs payments received per day: grouped columns on one axis. */
export function MoneyChart({ days }: { days: Day[] }) {
  const [active, setActive] = React.useState<number | null>(null)
  const ticks = niceTicks(Math.max(...days.flatMap((d) => [d.udhaar, d.vasooli])))
  const top = ticks.at(-1)!
  // Direct-label only each series' peak (dataviz: label selectively).
  const peaks = Object.fromEntries(
    SERIES.map(({ key }) => [key, days.reduce((best, d, i) => (d[key] > days[best][key] ? i : best), 0)])
  )
  const totals = SERIES.map(({ key }) => days.reduce((t, d) => t + d[key], 0))

  return (
    <ChartCard
      title="Udhaar vs vasooli"
      qualifier={`Pichhle 14 din · ${inr(totals[0])} diya, ${inr(totals[1])} mila`}
      legend={SERIES.map((s) => ({ label: s.label, swatch: s.color }))}
      table={
        <DataTable
          head={["Din", "Udhaar diya", "Vasooli"]}
          rows={days.map((d) => [shortDate(d.date), inr(d.udhaar), inr(d.vasooli)])}
        />
      }
    >
      <div className="mt-3 flex gap-3">
        <div className="relative w-10 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums" style={{ height: PLOT_H }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
              {inrTick(t)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: PLOT_H }} onMouseLeave={() => setActive(null)}>
            {ticks.map((t) => (
              <span
                key={t}
                aria-hidden
                className="absolute inset-x-0 h-px bg-chart-grid"
                style={{ bottom: `${(t / top) * 100}%` }}
              />
            ))}
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
              {days.map((d, i) => (
                <button
                  key={d.date.toISOString()}
                  type="button"
                  aria-label={`${shortDate(d.date)}: udhaar ${inr(d.udhaar)}, vasooli ${inr(d.vasooli)}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className={cn(
                    "relative flex items-end justify-center gap-[2px] rounded-md outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                    active === i && "bg-white/[0.04]"
                  )}
                >
                  {SERIES.map(({ key, color }) => (
                    <span
                      key={key}
                      data-bar-v
                      className="relative w-full max-w-[10px] rounded-t-[4px]"
                      style={{ height: `${(d[key] / top) * 100}%`, background: color }}
                    >
                      {peaks[key] === i && d[key] > 0 && (
                        <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-[11px] whitespace-nowrap text-muted-foreground">
                          {inrTick(d[key])}
                        </span>
                      )}
                    </span>
                  ))}
                </button>
              ))}
            </div>
            {active !== null && <Tooltip day={days[active]} index={active} count={days.length} />}
          </div>
          <div className="mt-2 grid text-[11px] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
            {days.map((d, i) => (
              <span key={i} className="text-center whitespace-nowrap">
                {(days.length - 1 - i) % 3 === 0 ? shortDate(d.date) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </ChartCard>
  )
}

function Tooltip({ day, index, count }: { day: Day; index: number; count: number }) {
  const left = ((index + 0.5) / count) * 100
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 w-40 rounded-md bg-raised p-3 text-xs shadow-lg"
      style={{ left: `${left}%`, transform: `translateX(${left > 60 ? "-105%" : "5%"})` }}
    >
      <p className="mb-2 text-muted-foreground">{shortDate(day.date)}</p>
      {SERIES.map(({ key, label, color }) => (
        <p key={key} className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: color }} />
          <span className="font-semibold">{inr(day[key])}</span>
          <span className="text-muted-foreground">{label}</span>
        </p>
      ))}
    </div>
  )
}
