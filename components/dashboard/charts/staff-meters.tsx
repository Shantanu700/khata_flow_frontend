"use client"

import { ChartCard, DataTable } from "@/components/dashboard/charts/chart-card"
import type { StaffDue } from "@/lib/demo"
import { inr } from "@/lib/format"

/** Each staff member's month so far: a thin segmented bar of what they earned, split into
 *  advance already given and what is still due. The figures sit beside it as text. */
export function StaffMeters({ staff, className }: { staff: StaffDue[]; className?: string }) {
  return (
    <ChartCard
      className={className}
      title="Staff khata"
      qualifier="Is mahine ab tak"
      legend={[
        { label: "Advance diya", swatch: "var(--chart-quiet)" },
        { label: "Dena baaki", swatch: "var(--chart-single)" },
      ]}
      table={
        <DataTable
          head={["Naam", "Din aaye", "Bane", "Advance", "Baaki"]}
          rows={staff.map((s) => [s.name, s.daysPresent, inr(s.earned), inr(s.advances), inr(s.due)])}
        />
      }
    >
      <ul className="grid gap-x-10 gap-y-5 md:grid-cols-2">
        {staff.map((s) => {
          const paid = Math.min(s.advances, s.earned)
          return (
            <li key={s.name} data-row className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-base">
                  {s.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {s.daysPresent} din aaye · {inr(s.salary)}/mahina
                  </span>
                </span>
                <span className="text-lg font-light">{inr(s.due)}</span>
              </div>
              <div
                role="img"
                aria-label={`${s.name}: ${inr(s.earned)} bane, ${inr(s.advances)} advance, ${inr(s.due)} dena baaki`}
                className="flex h-2 gap-[2px]"
              >
                {paid > 0 && (
                  <span data-bar-h className="h-full rounded-full bg-chart-quiet" style={{ flexGrow: paid }} />
                )}
                {s.due > 0 && (
                  <span data-bar-h className="h-full rounded-full bg-chart-single" style={{ flexGrow: s.due }} />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {inr(s.earned)} bane · {inr(s.advances)} advance gaya
              </p>
            </li>
          )
        })}
      </ul>
    </ChartCard>
  )
}
