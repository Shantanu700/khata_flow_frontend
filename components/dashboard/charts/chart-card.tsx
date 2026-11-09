"use client"

import * as React from "react"

import { Segmented } from "@/components/segmented"
import { cn } from "@/lib/utils"

export type LegendItem = { label: string; swatch: string; shape?: "rect" | "line" }

/** A chart panel: two-tone title, one legend, and a Chart / Table toggle so every value is
 *  reachable without hovering (dataviz: tooltips enhance, never gate). */
export function ChartCard({
  title,
  qualifier,
  legend,
  table,
  className,
  children,
}: {
  title: string
  qualifier: string
  legend?: LegendItem[]
  table: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  const [view, setView] = React.useState<"chart" | "table">("chart")
  return (
    <section data-rise className={cn("flex flex-col gap-5 rounded-xl bg-card p-6", className)}>
      <header className="flex items-start justify-between gap-4">
        <h2 className="text-xl leading-tight font-normal">
          {title}
          <span className="block text-sm text-muted-foreground">{qualifier}</span>
        </h2>
        <Segmented
          label={`${title}: chart or table`}
          value={view}
          onChange={setView}
          options={[
            { value: "chart", label: "Chart" },
            { value: "table", label: "Table" },
          ]}
          className="bg-canvas p-1"
          itemClassName="px-3 py-1 text-xs"
        />
      </header>
      {legend && view === "chart" && (
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className={item.shape === "line" ? "h-0.5 w-3.5 rounded-full" : "size-2.5 rounded-[3px]"}
                style={{ background: item.swatch }}
              />
              {item.label}
            </li>
          ))}
        </ul>
      )}
      {view === "chart" ? children : <div className="overflow-x-auto">{table}</div>}
    </section>
  )
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          {head.map((h, i) => (
            <th key={h} className={cn("pb-2 font-medium", i > 0 && "text-right")}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r} className="border-t border-border">
            {row.map((cell, i) => (
              <td key={i} className={cn("py-2", i > 0 && "text-right")}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Clean axis maximum and ticks: steps of 1, 2, 2.5 or 5 × 10^n, about three of them. */
export function niceTicks(max: number, count = 3): number[] {
  if (max <= 0) return [0]
  const raw = max / count
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw)!
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step)
}
