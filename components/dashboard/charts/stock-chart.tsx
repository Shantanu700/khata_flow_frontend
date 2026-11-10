"use client"

import * as React from "react"
import { TriangleAlert } from "lucide-react"

import { ChartCard, DataTable } from "@/components/dashboard/charts/chart-card"
import type { Product } from "@/lib/demo"
import { unitWord } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Stock per product against its low-stock threshold. Emphasis form: low items in the
 *  status red with an icon and "kam" label, the rest in the quiet grey. */
export function StockChart({ products }: { products: Product[] }) {
  const [active, setActive] = React.useState<string | null>(null)
  const max = Math.max(...products.map((p) => Math.max(p.stock, p.threshold)))
  const low = products.filter((p) => p.isLow).length

  return (
    <ChartCard
      title="Stock"
      qualifier={low ? `${low} cheezein threshold se neeche` : "Sab threshold se upar"}
      legend={[
        { label: "Kam stock", swatch: "var(--red)" },
        { label: "Theek", swatch: "var(--chart-quiet)" },
        { label: "Threshold", swatch: "rgb(255 255 255 / 60%)", shape: "line" },
      ]}
      table={
        <DataTable
          head={["Saamaan", "Stock", "Threshold", "Haal"]}
          rows={products.map((p) => [p.name, `${p.stock} ${unitWord(p.unit)}`, p.threshold, p.isLow ? "Kam" : "Theek"])}
        />
      }
    >
      <ul className="flex flex-col gap-3.5" onMouseLeave={() => setActive(null)}>
        {products.map((p) => (
          <li key={p.name}>
            <button
              type="button"
              onMouseEnter={() => setActive(p.name)}
              onFocus={() => setActive(p.name)}
              onBlur={() => setActive(null)}
              aria-label={`${p.name}: ${p.stock} ${unitWord(p.unit)}, threshold ${p.threshold}${p.isLow ? ", kam" : ""}`}
              className={cn(
                "grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-md px-1 py-0.5 text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,10.5rem)_1fr_5.5rem]",
                active === p.name && "bg-white/[0.04]"
              )}
            >
              <span className="truncate text-sm">{p.name}</span>
              <span className="relative order-last col-span-2 flex h-4 items-center sm:order-none sm:col-span-1 sm:h-6">
                <span
                  data-bar-h
                  className="h-3 rounded-r-[4px]"
                  style={{ width: `${(p.stock / max) * 100}%`, background: p.isLow ? "var(--red)" : "var(--chart-quiet)" }}
                />
                <span
                  aria-hidden
                  className="absolute top-0.5 bottom-0.5 w-0.5 -translate-x-1/2 rounded-full bg-white/60"
                  style={{ left: `${(p.threshold / max) * 100}%` }}
                />
              </span>
              <span className="flex items-center justify-end gap-1.5 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                {p.stock} {unitWord(p.unit)}
                {p.isLow && (
                  <span className="flex items-center gap-0.5 rounded-full bg-red/15 px-1.5 py-0.5 text-[10px] font-medium text-red-ink">
                    <TriangleAlert aria-hidden className="size-3" />
                    kam
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {active && (
        <p role="status" className="text-xs text-muted-foreground">
          {(() => {
            const p = products.find((x) => x.name === active)!
            return `${p.name}: ${p.stock} ${unitWord(p.unit)} bache, threshold ${p.threshold}`
          })()}
        </p>
      )}
    </ChartCard>
  )
}
