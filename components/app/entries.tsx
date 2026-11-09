"use client"

import * as React from "react"

import { SIZE, useDebounced, useEntries, write } from "@/components/app/data"
import {
  DateRange,
  rangeLabel,
  rangeParams,
  type Range,
} from "@/components/app/date-range"
import { useI18n } from "@/components/app/i18n"
import { entryView } from "@/components/app/khata-data"
import { useLayout } from "@/components/app/layout"
import {
  FilterButton,
  LedgerCard,
  LoadError,
  NotchSearch,
  Pager,
  SearchField,
  pagesOf,
} from "@/components/app/ledger"
import { useListMotion } from "@/components/app/list-motion"
import { Dot, UndoButton } from "@/components/app/parts"
import { useShell } from "@/components/app/shell"
import { Segmented } from "@/components/segmented"
import { cn } from "@/lib/utils"

const COLS =
  "grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_110px_36px] gap-3"

type Sort = "-id" | "-amount" | "party__name"
const SORTS: { value: Sort; key: string }[] = [
  { value: "-id", key: "sort.newest" },
  { value: "-amount", key: "sort.amount" },
  { value: "party__name", key: "sort.name" },
]

/** The kind chips and the API kinds each one asks for (null: every kind). */
const KINDS: { id: string; key: string; kinds: string | null }[] = [
  { id: "all", key: "entries.kind.all", kinds: null },
  { id: "c", key: "kind.CREDIT_GIVEN", kinds: "CREDIT_GIVEN" },
  { id: "p", key: "kind.PAYMENT_RECEIVED", kinds: "PAYMENT_RECEIVED" },
  { id: "s", key: "entries.kind.stock", kinds: "STOCK_IN,STOCK_OUT" },
  {
    id: "st",
    key: "entries.kind.staff",
    kinds: "ATTENDANCE,STAFF_ADVANCE,SALARY_PAID",
  },
  { id: "r", key: "entries.kind.undone", kinds: "REVERSAL" },
]

export function EntriesScreen() {
  const { t, locale } = useI18n()
  const { run } = useShell()
  const [filter, setFilter] = React.useState("all")
  const [sort, setSort] = React.useState<Sort>("-id")
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [range, setRange] = React.useState<Range>(null)
  const { phone, compact } = useLayout()
  const ref = React.useRef<HTMLDivElement>(null)
  const q = useDebounced(query.trim())
  const chip = KINDS.find((f) => f.id === filter) ?? KINDS[0]
  const list = useEntries({
    kind: chip.kinds ?? undefined,
    q: q || undefined,
    ordering: sort,
    page,
    ...rangeParams(range),
  })
  const rows = (list.data?.results ?? []).map((e) => entryView(e, t, locale))
  const count = list.data?.count ?? 0
  const pages = pagesOf(count, SIZE.table)
  const { capture, chipFrom } = useListMotion(ref, [
    rows.map((e) => e.id).join(),
    filter,
  ])
  const reset =
    <V,>(set: (v: V) => void) =>
    (v: V) => (capture(), set(v), setPage(1))
  const toPage = (p: number) => (capture(), setPage(p))
  const undo = (id: number) => run(() => write.undo(id)).catch(() => undefined)

  const sorts = SORTS.map((s) => ({ value: s.value, label: t(s.key) }))

  return (
    <div ref={ref} className={cn("flex flex-col", !compact && "h-full")}>
      <LedgerCard
        flip="main"
        className={cn(!compact && "min-h-0 flex-1")}
        title={t("entries.title")}
        sub={t("entries.sub", {
          kind: t(chip.key),
          range: rangeLabel(range, t, locale),
          count,
        })}
        controls={
          <>
            <DateRange value={range} onChange={reset(setRange)} />
            <Segmented
              label={t("sort.label")}
              options={sorts}
              value={sort}
              onChange={reset(setSort)}
              className="h-[52px] bg-card p-1.5"
            />
            <SearchField
              value={query}
              onChange={reset(setQuery)}
              placeholder={t("entries.search")}
              label={t("entries.searchLabel")}
            />
            <Pager page={page} pages={pages} onPage={toPage} />
          </>
        }
        compactControls={
          <>
            <NotchSearch
              value={query}
              onChange={reset(setQuery)}
              placeholder={t("entries.search")}
              label={t("entries.searchLabel")}
            />
            <FilterButton active={sort !== "-id" || range !== null}>
              <Segmented
                label={t("sort.label")}
                options={sorts}
                value={sort}
                onChange={reset(setSort)}
                className="h-[52px] bg-card p-1.5"
                itemClassName="flex-1"
              />
              <DateRange value={range} onChange={reset(setRange)} />
            </FilterButton>
            <Pager page={page} pages={pages} onPage={toPage} />
          </>
        }
        toolbar={
          <div
            className={cn(
              "relative flex items-center gap-2",
              phone
                ? "-mx-6 snap-x [scrollbar-width:none] overflow-x-auto px-6 [&::-webkit-scrollbar]:hidden"
                : "flex-wrap"
            )}
            role="group"
            aria-label={t("entries.kindLabel")}
          >
            {KINDS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={f.id === filter}
                onClick={(e) => (
                  chipFrom(e.currentTarget.parentElement),
                  capture(),
                  setFilter(f.id),
                  setPage(1)
                )}
                className={cn(
                  "relative h-10 shrink-0 cursor-pointer snap-start rounded-full border px-[18px] text-sm transition-colors duration-300",
                  f.id === filter
                    ? "border-transparent text-black"
                    : "border-line bg-transparent text-foreground hover:bg-raised"
                )}
              >
                {f.id === filter && (
                  <span
                    data-chip-pill
                    aria-hidden
                    className="absolute -inset-px rounded-full bg-lime"
                  />
                )}
                <span className="relative">{t(f.key)}</span>
              </button>
            ))}
          </div>
        }
      >
        <div
          className={cn(
            "flex flex-col gap-1.5 overscroll-contain",
            !compact && "min-h-0 flex-1 overflow-auto"
          )}
        >
          {!phone && (
            <div
              className={cn(
                COLS,
                "min-w-[640px] pr-2.5 pl-4 text-xs font-medium text-muted-foreground"
              )}
            >
              <span>{t("col.name")}</span>
              <span>{t("col.kind")}</span>
              <span>{t("col.source")}</span>
              <span className="text-right">{t("col.amount")}</span>
              <span />
            </div>
          )}
          {rows.map((e) =>
            phone ? (
              <div
                key={e.id}
                data-flip-id={`row-${e.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-[18px] bg-background py-3 pr-2.5 pl-4",
                  e.faded && "opacity-50"
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span
                    className={cn(
                      "truncate text-sm font-medium",
                      e.struck && "line-through"
                    )}
                  >
                    {e.name}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2 py-[2px] font-medium text-foreground">
                      <Dot color={e.dot} size={6} />
                      {e.kindLabel}
                    </span>
                    {e.idLabel} · {e.date} · {e.src}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-[15px] font-light tabular-nums",
                    e.struck && "line-through"
                  )}
                >
                  {e.amt}
                </span>
                {e.canUndo ? (
                  <UndoButton
                    onClick={() => undo(e.id)}
                    className="size-11 shrink-0"
                  />
                ) : (
                  <span className="w-11 shrink-0" />
                )}
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
                  <span
                    className={cn(
                      "truncate text-sm font-medium",
                      e.struck && "line-through"
                    )}
                  >
                    {e.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {e.idLabel} · {e.date}
                  </span>
                </span>
                <span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-[3px] text-xs font-medium group-hover:bg-card">
                    <Dot color={e.dot} size={7} />
                    {e.kindLabel}
                  </span>
                </span>
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="truncate text-[13px]">{e.src}</span>
                  {e.tag && (
                    <span className="text-xs text-muted-foreground">
                      {e.tag}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-right text-[15px] font-light tabular-nums",
                    e.struck && "line-through"
                  )}
                >
                  {e.amt}
                </span>
                {e.canUndo ? (
                  <UndoButton
                    onClick={() => undo(e.id)}
                    className="group-hover:bg-card coarse:size-11"
                  />
                ) : (
                  <span />
                )}
              </div>
            )
          )}
          {list.isError && <LoadError onRetry={() => list.refetch()} />}
          {list.data && count === 0 && (
            <p className="px-4 py-7 text-sm text-muted-foreground">
              {t("entries.none")}
            </p>
          )}
        </div>
      </LedgerCard>
    </div>
  )
}
