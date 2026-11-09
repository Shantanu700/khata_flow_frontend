"use client"

import * as React from "react"

import { DateRange, FULL, rangeLabel, type Range } from "@/components/app/date-range"
import { ENTRY_FILTERS, type Book, type EntryView } from "@/components/app/khata-data"
import { useLayout } from "@/components/app/layout"
import { FilterButton, LedgerCard, NotchSearch, Pager, SearchField, paginate } from "@/components/app/ledger"
import { useListMotion } from "@/components/app/list-motion"
import { Dot, UndoButton } from "@/components/app/parts"
import { Segmented } from "@/components/segmented"
import { cn } from "@/lib/utils"

const COLS = "grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_110px_36px] gap-3"

type Sort = "naye" | "raqam" | "naam"
const SORTS: { value: Sort; label: string }[] = [
  { value: "naye", label: "Naye" },
  { value: "raqam", label: "Raqam" },
  { value: "naam", label: "Naam" },
]
const ORDER: Record<Sort, ((a: EntryView, b: EntryView) => number) | null> = {
  naye: null,
  raqam: (a, b) => b.rupees - a.rupees,
  naam: (a, b) => (a.name ?? "").localeCompare(b.name ?? ""),
}

export function EntriesScreen({
  book,
  filter,
  setFilter,
  undo,
}: {
  book: Book
  filter: string
  setFilter: (id: string) => void
  undo: (id: number) => void
}) {
  const [sort, setSort] = React.useState<Sort>("naye")
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [range, setRange] = React.useState<Range>(FULL)
  const { phone, compact } = useLayout()
  const ref = React.useRef<HTMLDivElement>(null)
  const q = query.trim().toLowerCase()
  const rows = book.entries.filter((e) => e.d <= range.from && e.d >= range.to).filter((e) => !q || `${e.name} ${e.idLabel} ${e.kindLabel}`.toLowerCase().includes(q))
  const order = ORDER[sort]
  if (order) rows.sort(order)
  const { pages, current, shown } = paginate(rows, page)
  const label = ENTRY_FILTERS.find((f) => f.id === filter)?.label ?? "Sab"
  const { capture, chipFrom } = useListMotion(ref, [shown.map((e) => e.id).join(), filter])
  const ranged = range.from !== FULL.from || range.to !== FULL.to
  const reset = <T,>(set: (v: T) => void) => (v: T) => (capture(), set(v), setPage(1))

  return (
    <div ref={ref} className={cn("flex flex-col", !compact && "h-full")}>
      <LedgerCard
        flip="main"
        className={cn(!compact && "min-h-0 flex-1")}
        title="Saari entries"
        sub={`${label === "Sab" ? "Har kism" : label} · ${rangeLabel(range)} · ${rows.length}`}
        controls={
          <>
            <DateRange value={range} onChange={reset(setRange)} />
            <Segmented label="Kram" options={SORTS} value={sort} onChange={reset(setSort)} className="h-[52px] bg-card p-1.5" />
            <SearchField value={query} onChange={reset(setQuery)} placeholder="Naam ya # dhoondo" label="Entries mein dhoondo" />
            <Pager page={current} pages={pages} onPage={(p) => (capture(), setPage(p))} />
          </>
        }
        compactControls={
          <>
            <NotchSearch value={query} onChange={reset(setQuery)} placeholder="Naam ya # dhoondo" label="Entries mein dhoondo" />
            <FilterButton active={sort !== "naye" || ranged}>
              <Segmented label="Kram" options={SORTS} value={sort} onChange={reset(setSort)} className="h-[52px] bg-card p-1.5" itemClassName="flex-1" />
              <DateRange value={range} onChange={reset(setRange)} />
            </FilterButton>
            <Pager page={current} pages={pages} onPage={(p) => (capture(), setPage(p))} />
          </>
        }
        toolbar={
          <div
            className={cn(
              "relative flex items-center gap-2",
              phone ? "-mx-6 snap-x overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "flex-wrap"
            )}
            role="group"
            aria-label="Kism se chhaantiye"
          >
            {ENTRY_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={f.id === filter}
                onClick={(e) => (chipFrom(e.currentTarget.parentElement), capture(), setFilter(f.id), setPage(1))}
                className={cn(
                  "relative h-10 shrink-0 cursor-pointer snap-start rounded-full border px-[18px] text-sm transition-colors duration-300",
                  f.id === filter ? "border-transparent text-black" : "border-line bg-transparent text-foreground hover:bg-raised"
                )}
              >
                {f.id === filter && <span data-chip-pill aria-hidden className="absolute -inset-px rounded-full bg-lime" />}
                <span className="relative">{f.label}</span>
              </button>
            ))}
          </div>
        }
      >
        <div className={cn("flex flex-col gap-1.5 overscroll-contain", !compact && "min-h-0 flex-1 overflow-auto")}>
          {!phone && (
            <div className={cn(COLS, "min-w-[640px] pr-2.5 pl-4 text-xs font-medium text-muted-foreground")}>
              <span>Naam</span><span>Kism</span><span>Zariya</span><span className="text-right">Raqam</span><span />
            </div>
          )}
          {shown.map((e) =>
            phone ? (
              <div
                key={e.id}
                data-flip-id={`row-${e.id}`}
                className={cn("flex items-center gap-3 rounded-[18px] bg-background py-3 pr-2.5 pl-4", e.faded && "opacity-50")}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={cn("truncate text-sm font-medium", e.struck && "line-through")}>{e.name}</span>
                  <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2 py-[2px] font-medium text-foreground">
                      <Dot color={e.dot} size={6} />
                      {e.kindLabel}
                    </span>
                    {e.idLabel} · {e.date} · {e.src}
                  </span>
                </span>
                <span className={cn("shrink-0 text-[15px] font-light tabular-nums", e.struck && "line-through")}>{e.amt}</span>
                {e.canUndo ? <UndoButton onClick={() => undo(e.id)} className="size-11 shrink-0" /> : <span className="w-11 shrink-0" />}
              </div>
            ) : (
              <div
                key={e.id}
                data-flip-id={`row-${e.id}`}
                className={cn(
                  COLS,
                  "group min-w-[640px] items-center rounded-[18px] bg-background py-3 pr-2.5 pl-4 transition-colors duration-150 hover:bg-raised",
                  e.faded && "opacity-50"
                )}
              >
                <span className="flex min-w-0 flex-col gap-px">
                  <span className={cn("truncate text-sm font-medium", e.struck && "line-through")}>{e.name}</span>
                  <span className="text-xs text-muted-foreground">{e.idLabel} · {e.date}</span>
                </span>
                <span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-[3px] text-xs font-medium group-hover:bg-card">
                    <Dot color={e.dot} size={7} />
                    {e.kindLabel}
                  </span>
                </span>
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="truncate text-[13px]">{e.src}</span>
                  {e.tag && <span className="text-xs text-muted-foreground">{e.tag}</span>}
                </span>
                <span className={cn("text-right text-[15px] font-light tabular-nums", e.struck && "line-through")}>{e.amt}</span>
                {e.canUndo ? <UndoButton onClick={() => undo(e.id)} className="group-hover:bg-card coarse:size-11" /> : <span />}
              </div>
            )
          )}
          {rows.length === 0 && <p className="px-4 py-7 text-sm text-muted-foreground">Koi entry nahi mili.</p>}
        </div>
      </LedgerCard>
    </div>
  )
}
