import { ArrowDownLeft, ArrowUpRight, PackageMinus, PackagePlus, UserCheck, Wallet } from "lucide-react"

import type { Entry, EntryKind } from "@/lib/demo"
import { describeEntry, relativeDay } from "@/lib/format"

const KIND: Record<EntryKind, { icon: typeof Wallet; label: string; dot?: string }> = {
  CREDIT_GIVEN: { icon: ArrowUpRight, label: "Udhaar", dot: "var(--chart-udhaar)" },
  PAYMENT_RECEIVED: { icon: ArrowDownLeft, label: "Vasooli", dot: "var(--chart-vasooli)" },
  STOCK_IN: { icon: PackagePlus, label: "Stock aaya" },
  STOCK_OUT: { icon: PackageMinus, label: "Stock gaya" },
  ATTENDANCE: { icon: UserCheck, label: "Haaziri" },
  STAFF_ADVANCE: { icon: Wallet, label: "Advance" },
  SALARY_PAID: { icon: Wallet, label: "Tankhwah" },
}

export function Entries({ entries }: { entries: Entry[] }) {
  return (
    <section data-rise aria-labelledby="entries-title" className="flex flex-col gap-4 rounded-xl bg-card p-6">
      <h2 id="entries-title" className="text-xl leading-tight font-normal">
        Haal ki entries
        <span className="block text-sm text-muted-foreground">Sabse nayi upar</span>
      </h2>
      <ul className="flex flex-col">
        {entries.slice(0, 6).map((entry) => {
          const { icon: Icon, label, dot } = KIND[entry.kind]
          return (
            <li key={entry.id} data-row className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0">
              <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-raised">
                <Icon aria-hidden className="size-4" />
                {dot && (
                  <span aria-hidden className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-card" style={{ background: dot }} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{describeEntry(entry)}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{relativeDay(entry.date)}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
