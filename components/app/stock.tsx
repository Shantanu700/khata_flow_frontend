"use client"

import * as React from "react"
import { toast } from "sonner"
import { Dialog, Select } from "radix-ui"
import { MinusIcon, PlusIcon } from "lucide-react"

import {
  SIZE,
  useDebounced,
  useProductNames,
  useProducts,
  useStockMoves,
  useSummary,
  write,
} from "@/components/app/data"
import {
  DateRange,
  rangeLabel,
  rangeParams,
  type Range,
} from "@/components/app/date-range"
import { errorText, qty, useI18n } from "@/components/app/i18n"
import {
  BoxIcon,
  ChevronIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/app/icons"
import { UNITS, entryView, type Unit } from "@/components/app/khata-data"
import { useLayout } from "@/components/app/layout"
import {
  AddButton,
  CornerPager,
  FIELD,
  FilterButton,
  FormActions,
  FormDialog,
  FormError,
  LedgerCard,
  LoadError,
  NotchSearch,
  Pager,
  SearchField,
  ViewToggle,
  pagesOf,
  type View,
  Loading,
} from "@/components/app/ledger"
import { useListMotion } from "@/components/app/list-motion"
import { CornerButton, Dot, Tip, toasted } from "@/components/app/parts"
import { useShell } from "@/components/app/shell"
import { Segmented } from "@/components/segmented"
import type { Product } from "@/lib/api"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

const COLS =
  "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_110px] gap-3"
const PCOLS =
  "grid grid-cols-[minmax(0,1.6fr)_90px_90px_minmax(0,1.4fr)_124px] gap-4"
const ALL = "all"

type Sort = "-id" | "-quantity" | "product__name"
const SORTS: { value: Sort; key: string }[] = [
  { value: "-id", key: "sort.newest" },
  { value: "-quantity", key: "sort.quantity" },
  { value: "product__name", key: "sort.name" },
]

type Show = "sab" | "kam" | "theek"
const SHOW: { value: Show; key: string }[] = [
  { value: "sab", key: "stock.show.all" },
  { value: "kam", key: "stock.show.low" },
  { value: "theek", key: "stock.show.ok" },
]

/** How full the bar is: the threshold sits at half. */
const fill = (p: Product) =>
  Math.min(100, (p.stock_level / Math.max(1, p.low_stock_threshold * 2)) * 100)

export function StockScreen() {
  const { t } = useI18n()
  const [query, setQuery] = React.useState("")
  const [show, setShow] = React.useState<Show>("sab")
  const [page, setPage] = React.useState(1)
  const [view, setView] = React.useState<View>("cards")
  const [editing, setEditing] = React.useState<Product | "new" | null>(null)
  const [moving, setMoving] = React.useState<{
    item: Product
    kind: Move
  } | null>(null)
  const move = (item: Product, kind: Move) => setMoving({ item, kind })
  const { phone } = useLayout()
  const q = useDebounced(query.trim())
  const size = view === "cards" ? SIZE.cards : SIZE.table
  const list = useProducts({
    q: q || undefined,
    low: show === "sab" ? undefined : show === "kam",
    page,
    page_size: size,
  })
  const all = useProducts({ page: 1, page_size: 1 })
  const summary = useSummary()
  const shown = list.data?.results ?? []
  const count = list.data?.count ?? 0
  const pages = pagesOf(count, size)
  const showOptions = SHOW.map((s) => ({ value: s.value, label: t(s.key) }))
  const status = (p: Product) => (p.is_low ? t("stock.low") : t("stock.ok"))

  return (
    <div className="flex flex-col gap-[10px]">
      <LedgerCard
        flip="main"
        className={cn(!phone && "pb-[92px]")}
        title={t("stock.title")}
        sub={t("stock.sub", {
          count: all.data?.count ?? 0,
          low: summary.data?.low_stock.length ?? 0,
        })}
        controls={
          <>
            <SearchField
              value={query}
              onChange={(v) => (setQuery(v), setPage(1))}
              placeholder={t("stock.search")}
              label={t("stock.search")}
            />
            <Segmented
              label={t("stock.showLabel")}
              options={showOptions}
              value={show}
              onChange={(v) => (setShow(v), setPage(1))}
              className="h-[52px] bg-card p-1.5"
            />
            <ViewToggle
              value={view}
              onChange={(v) => (setView(v), setPage(1))}
            />
            <AddButton
              label={t("stock.new")}
              onClick={() => setEditing("new")}
            />
          </>
        }
        compactControls={
          <>
            {!phone && (
              <NotchSearch
                value={query}
                onChange={(v) => (setQuery(v), setPage(1))}
                placeholder={t("stock.search")}
                label={t("stock.search")}
              />
            )}
            <FilterButton
              active={show !== "sab"}
              search={
                phone
                  ? {
                      value: query,
                      onChange: (v) => (setQuery(v), setPage(1)),
                      placeholder: t("stock.search"),
                      label: t("stock.search"),
                    }
                  : undefined
              }
            >
              <Segmented
                label={t("stock.showLabel")}
                options={showOptions}
                value={show}
                onChange={(v) => (setShow(v), setPage(1))}
                className="h-[52px] bg-card p-1.5"
                itemClassName="flex-1"
              />
              <ViewToggle
                value={view}
                onChange={(v) => (setView(v), setPage(1))}
                className="w-fit"
              />
            </FilterButton>
            {phone && <Pager page={page} pages={pages} onPage={setPage} />}
            <AddButton
              label={t("stock.new")}
              onClick={() => setEditing("new")}
            />
          </>
        }
        toolbar={null}
      >
        {view === "table" && phone ? (
          <div className="flex flex-col gap-1.5">
            {shown.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-[18px] bg-background py-3 pr-2.5 pl-4"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {p.name}
                    </span>
                    <span className="text-xl font-light tabular-nums">
                      {qty(p.stock_level)}
                    </span>
                  </span>
                  <Meter p={p} className="h-1.5 bg-raised" />
                  <span className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {t(`unit.${p.unit}`)} ·{" "}
                      {t("stock.threshold", {
                        value: qty(p.low_stock_threshold),
                      })}
                    </span>
                    <span
                      style={{ color: p.is_low ? "var(--red-ink)" : undefined }}
                    >
                      {status(p)}
                    </span>
                  </span>
                </span>
                <Steps p={p} onMove={move} className="bg-raised" />
                <Tip label={t("stock.edit", { name: p.name })}>
                  <button
                    type="button"
                    aria-label={t("stock.edit", { name: p.name })}
                    onClick={() => setEditing(p)}
                    className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-raised"
                  >
                    <PencilIcon size={14} />
                  </button>
                </Tip>
              </div>
            ))}
          </div>
        ) : view === "table" ? (
          <div className="flex flex-col gap-1.5 overflow-x-auto">
            <div
              className={cn(
                PCOLS,
                "min-w-[620px] pr-2.5 pl-4 text-xs font-medium text-muted-foreground"
              )}
            >
              <span>{t("col.item")}</span>
              <span className="text-right">{t("stock.col.left")}</span>
              <span className="text-right">{t("stock.col.threshold")}</span>
              <span>{t("stock.col.status")}</span>
              <span />
            </div>
            {shown.map((p) => (
              <div
                key={p.id}
                className={cn(
                  PCOLS,
                  "group min-w-[620px] items-center rounded-[18px] bg-background py-3 pr-2.5 pl-4 transition-colors duration-150 hover:bg-raised"
                )}
              >
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {t(`unit.${p.unit}`)}
                  </span>
                </span>
                <span className="text-right text-xl font-light tabular-nums">
                  {qty(p.stock_level)}
                </span>
                <span className="text-right text-sm text-muted-foreground tabular-nums">
                  {qty(p.low_stock_threshold)}
                </span>
                <span className="flex items-center gap-3">
                  <Meter
                    p={p}
                    className="h-2 flex-1 bg-raised group-hover:bg-card"
                  />
                  <span
                    className="w-20 text-xs"
                    style={{
                      color: p.is_low
                        ? "var(--red-ink)"
                        : "var(--muted-foreground)",
                    }}
                  >
                    {status(p)}
                  </span>
                </span>
                <span className="flex justify-end gap-1.5">
                  <Steps
                    p={p}
                    onMove={move}
                    className="bg-raised group-hover:bg-card"
                  />
                  <Tip label={t("stock.edit", { name: p.name })}>
                    <button
                      type="button"
                      aria-label={t("stock.edit", { name: p.name })}
                      onClick={() => setEditing(p)}
                      className="grid size-9 cursor-pointer place-items-center rounded-full bg-raised group-hover:bg-card coarse:size-11"
                    >
                      <PencilIcon size={14} />
                    </button>
                  </Tip>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-[10px] @min-[480px]/content:grid-cols-2 @min-[1000px]/content:grid-cols-4">
            {shown.map((p) => (
              <div
                key={p.id}
                className="relative flex min-h-[200px] flex-col gap-[18px] rounded-[32px] bg-raised p-6"
              >
                <div className="pr-24">
                  <p className="truncate text-lg">{p.name}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {t(`unit.${p.unit}`)}
                  </p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    data-roll={`level-${p.id}`}
                    className="text-[64px] leading-none font-light tracking-[-0.03em]"
                  >
                    {qty(p.stock_level)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t("stock.left")}
                  </span>
                  <Steps
                    p={p}
                    onMove={move}
                    className="size-11 bg-card"
                    wrapClassName="ml-auto self-center"
                  />
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  <Meter p={p} className="h-2 bg-card" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {t("stock.threshold", {
                        value: qty(p.low_stock_threshold),
                      })}
                    </span>
                    <span
                      style={{ color: p.is_low ? "var(--red-ink)" : undefined }}
                    >
                      {status(p)}
                    </span>
                  </div>
                </div>
                <CornerButton
                  title={t("stock.edit", { name: p.name })}
                  bg="var(--card)"
                  className="bg-raised"
                  onClick={() => setEditing(p)}
                >
                  <PencilIcon size={16} />
                </CornerButton>
              </div>
            ))}
          </div>
        )}
        {list.isPending && <Loading />}
        {list.isError && <LoadError onRetry={() => list.refetch()} />}
        {list.data && count === 0 && (
          <p className="px-1 py-7 text-sm text-muted-foreground">
            {t("stock.none")}
          </p>
        )}
        <CornerPager
          flip="main"
          total={count}
          size={size}
          page={page}
          pages={pages}
          onPage={setPage}
        />
      </LedgerCard>
      <FormDialog open={editing !== null} onClose={() => setEditing(null)}>
        {editing !== null && (
          <ProductForm
            key={editing === "new" ? "" : editing.id}
            item={editing === "new" ? null : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </FormDialog>
      <FormDialog open={moving !== null} onClose={() => setMoving(null)}>
        {moving !== null && (
          <MoveForm
            key={moving.item.id}
            item={moving.item}
            start={moving.kind}
            onDone={() => setMoving(null)}
          />
        )}
      </FormDialog>
      <StockLedger />
    </div>
  )
}

type Move = "STOCK_IN" | "STOCK_OUT"

/** − and + for an item: open the stock out / stock in form. */
function Steps({
  p,
  onMove,
  className,
  wrapClassName,
}: {
  p: Product
  onMove: (p: Product, kind: Move) => void
  className?: string
  wrapClassName?: string
}) {
  const { t } = useI18n()
  return (
    <span className={cn("flex shrink-0 gap-1.5", wrapClassName)}>
      {(["STOCK_OUT", "STOCK_IN"] as const).map((k) => (
        <Tip key={k} label={t(`kind.${k}`)}>
          <button
            type="button"
            aria-label={`${t(`kind.${k}`)}: ${p.name}`}
            onClick={() => onMove(p, k)}
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-full transition-transform duration-150 active:scale-[0.94] coarse:size-11",
              className
            )}
          >
            {k === "STOCK_IN" ? (
              <PlusIcon size={16} />
            ) : (
              <MinusIcon size={16} />
            )}
          </button>
        </Tip>
      ))}
    </span>
  )
}

// Quantities to three decimals, so 2.3 − 0.1 reads 2.2.
const round3 = (n: number) => Math.round(n * 1000) / 1000

function MoveForm({
  item,
  start,
  onDone,
}: {
  item: Product
  start: Move
  onDone: () => void
}) {
  const { t } = useI18n()
  const { run } = useShell()
  const [kind, setKind] = React.useState(start)
  const [amount, setAmount] = React.useState("")
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const level = Number(item.stock_level ?? 0)
  const val = Math.max(0, Number(amount) || 0)
  const out = kind === "STOCK_OUT"
  const over = out && val > level
  const unit = t(`unit.${item.unit}.short`)
  const moves = (["STOCK_IN", "STOCK_OUT"] as const).map((k) => ({
    value: k,
    label: t(`kind.${k}`),
  }))

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (val <= 0 || over) return
    setBusy(true)
    setError("")
    try {
      await run(() => write.addEntry({ kind, product: item.id, quantity: val }))
      toast.success(
        t(`toast.entry.${kind}`, {
          name: item.name,
          qty: `${qty(val)} ${unit}`,
        })
      )
      onDone()
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <Dialog.Title className="text-2xl font-normal">
          {item.name}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {t("stock.meter", {
            level: `${qty(level)} ${unit}`,
            threshold: qty(item.low_stock_threshold),
          })}
        </Dialog.Description>
      </div>
      <Segmented
        label={t("moves.title")}
        options={moves}
        value={kind}
        onChange={setKind}
        className="w-full bg-raised p-1.5"
        itemClassName="flex-1 justify-center"
      />
      <label className="flex flex-col gap-2">
        <span className="text-[13px] text-muted-foreground">
          {t("col.quantity")}
        </span>
        <span
          className={cn(
            FIELD,
            "flex items-center gap-2 focus-within:ring-2 focus-within:ring-ring",
            over &&
              "ring-2 ring-[var(--red-ink)] focus-within:ring-[var(--red-ink)]"
          )}
        >
          <input
            name="quantity"
            type="number"
            required
            min={0.001}
            max={100000}
            step="any"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            aria-invalid={over}
            className="min-w-0 flex-1 [appearance:textfield] bg-transparent text-2xl font-light outline-none placeholder:text-muted-foreground [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-muted-foreground">{unit}</span>
        </span>
      </label>
      <p
        role={over ? "alert" : undefined}
        aria-live="polite"
        className={cn(
          "flex justify-between rounded-[20px] bg-background px-5 py-4 text-sm",
          over ? "text-[var(--red-ink)]" : "text-muted-foreground"
        )}
      >
        {over ? (
          t("error.NEGATIVE_STOCK")
        ) : (
          <>
            <span>{t("stock.after")}</span>
            <span className="text-foreground tabular-nums">
              {qty(round3(level + (out ? -val : val)))} {unit}
            </span>
          </>
        )}
      </p>
      <FormError error={error} />
      <FormActions busy={busy} submit={t(`kind.${kind}`)} />
    </form>
  )
}

function Meter({ p, className }: { p: Product; className: string }) {
  const { t } = useI18n()
  return (
    <span
      role="img"
      aria-label={t("stock.meter", {
        level: qty(p.stock_level),
        threshold: qty(p.low_stock_threshold),
      })}
      className={cn("block overflow-hidden rounded-full", className)}
    >
      <span
        className="block h-full rounded-full"
        style={{
          width: `${fill(p)}%`,
          background: p.is_low ? "var(--red)" : "var(--chart-single)",
        }}
      />
    </span>
  )
}

function StockLedger() {
  const { t, locale } = useI18n()
  const [sort, setSort] = React.useState<Sort>("-id")
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [range, setRange] = React.useState<Range>(null)
  const [product, setProduct] = React.useState(ALL)
  const { phone } = useLayout()
  const ref = React.useRef<HTMLElement>(null)
  const q = useDebounced(query.trim())
  const names = useProductNames()
  const list = useStockMoves({
    q: q || undefined,
    product: product === ALL ? undefined : Number(product),
    ordering: sort,
    page,
    ...rangeParams(range),
  })
  const rows = (list.data?.results ?? []).map((e) => entryView(e, t, locale))
  const count = list.data?.count ?? 0
  const pages = pagesOf(count, SIZE.table)
  const { capture } = useListMotion(ref, [rows.map((e) => e.id).join()])
  const reset =
    <V,>(set: (v: V) => void) =>
    (v: V) => (capture(), set(v), setPage(1))
  const toPage = (p: number) => (capture(), setPage(p))
  const sorts = SORTS.map((s) => ({ value: s.value, label: t(s.key) }))
  const productName = names.data?.find((p) => String(p.id) === product)?.name

  return (
    <section ref={ref}>
      <LedgerCard
        title={t("moves.title")}
        sub={t("moves.sub", {
          item: productName ?? t("moves.allItems"),
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
              label={t("moves.searchLabel")}
            />
            <Pager page={page} pages={pages} onPage={toPage} />
          </>
        }
        compactControls={
          <>
            {!phone && (
              <NotchSearch
                value={query}
                onChange={reset(setQuery)}
                placeholder={t("entries.search")}
                label={t("moves.searchLabel")}
              />
            )}
            <FilterButton
              active={sort !== "-id" || range !== null}
              search={
                phone
                  ? {
                      value: query,
                      onChange: reset(setQuery),
                      placeholder: t("entries.search"),
                      label: t("moves.searchLabel"),
                    }
                  : undefined
              }
            >
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
          <ProductSelect
            value={product}
            onChange={reset(setProduct)}
            products={names.data ?? []}
          />
        }
      >
        <div className="flex flex-col gap-1.5 overflow-x-auto">
          {!phone && (
            <div
              className={cn(
                COLS,
                "min-w-[560px] px-4 text-xs font-medium text-muted-foreground"
              )}
            >
              <span>{t("col.item")}</span>
              <span>{t("col.kind")}</span>
              <span>{t("col.source")}</span>
              <span className="text-right">{t("col.quantity")}</span>
            </div>
          )}
          {rows.map((e) =>
            phone ? (
              <div
                key={e.id}
                data-flip-id={`row-${e.id}`}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-[18px] bg-background px-4 py-3",
                  e.faded && "opacity-50"
                )}
              >
                <span className="flex min-w-0 flex-col gap-1">
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
              </div>
            ) : (
              <div
                key={e.id}
                data-flip-id={`row-${e.id}`}
                className={cn(
                  COLS,
                  "group min-w-[560px] items-center rounded-[18px] bg-background px-4 py-3 transition-colors duration-150 hover:bg-raised",
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
                <span className="truncate text-[13px]">{e.src}</span>
                <span
                  className={cn(
                    "text-right text-[15px] font-light tabular-nums",
                    e.struck && "line-through"
                  )}
                >
                  {e.amt}
                </span>
              </div>
            )
          )}
          {list.isPending && <Loading />}
          {list.isError && <LoadError onRetry={() => list.refetch()} />}
          {list.data && count === 0 && (
            <p className="px-4 py-7 text-sm text-muted-foreground">
              {t("moves.none")}
            </p>
          )}
        </div>
      </LedgerCard>
    </section>
  )
}

function ProductSelect({
  value,
  onChange,
  products,
}: {
  value: string
  onChange: (v: string) => void
  products: Product[]
}) {
  const { t } = useI18n()
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        aria-label={t("moves.byItem")}
        className="flex h-10 w-fit max-w-full cursor-pointer items-center gap-2.5 rounded-full border border-line px-[18px] text-sm outline-none hover:bg-raised focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-raised"
      >
        <BoxIcon size={16} className="shrink-0 text-muted-foreground" />
        <span className="truncate">
          <Select.Value />
        </span>
        <Select.Icon>
          <ChevronIcon size={14} className="rotate-90 text-muted-foreground" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={8}
          collisionPadding={12}
          className="kf-app z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[24px] bg-card p-1.5 text-foreground shadow-[0_24px_60px_rgb(0_0_0/0.35)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <Select.Viewport className="flex flex-col gap-0.5">
            {[
              { id: ALL, name: t("moves.allItems") },
              ...products.map((p) => ({ id: String(p.id), name: p.name })),
            ].map((p) => (
              <Select.Item
                key={p.id}
                value={p.id}
                className="flex h-10 cursor-pointer items-center rounded-full px-4 text-sm outline-none select-none data-[highlighted]:bg-raised data-[state=checked]:bg-lime data-[state=checked]:text-black"
              >
                <Select.ItemText>{p.name}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

function ProductForm({
  item,
  onDone,
}: {
  item: Product | null
  onDone: () => void
}) {
  const { t } = useI18n()
  const { run } = useShell()
  const [unit, setUnit] = React.useState<Unit>(item?.unit ?? "PACKET")
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const nameRef = React.useRef("")
  const units = UNITS.map((u) => ({ value: u, label: t(`unit.${u}`) }))

  const save = async (work: () => Promise<unknown>) => {
    setBusy(true)
    setError("")
    try {
      await run(work)
      onDone()
    } catch (e) {
      setError(errorText(e, t, { name: item?.name ?? nameRef.current }))
    } finally {
      setBusy(false)
    }
  }

  if (item && confirming)
    return (
      <div className="flex flex-col gap-5">
        <div>
          <Dialog.Title className="text-2xl font-normal">
            {t("stock.deleteTitle", { name: item.name })}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            {t("stock.deleteBody")}
          </Dialog.Description>
        </div>
        <FormError error={error} />
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            save(() =>
              write
                .deleteProduct(item.id)
                .then(toasted(t("toast.removed", { name: item.name })))
            )
          }
          className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-danger-soft text-base font-medium text-black transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? <Spinner className="size-[18px]" /> : <TrashIcon size={18} />}
          {t("form.confirmDelete")}
        </button>
      </div>
    )

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const threshold = Number(f.get("thr"))
    if (item)
      return save(() =>
        write
          .saveProduct(
            {
              name: item.name,
              aliases: item.aliases ?? [],
              unit,
              low_stock_threshold: threshold,
              is_active: item.is_active,
            },
            item.id
          )
          .then(toasted(t("toast.updated", { name: item.name })))
      )
    const name = String(f.get("name")).trim().replace(/\s+/g, " ")
    if (!name) return setError(t("form.nameMissing"))
    nameRef.current = name
    const opening = Number(f.get("opening"))
    save(async () => {
      const product = await write.saveProduct({
        name,
        aliases: [],
        unit,
        low_stock_threshold: threshold,
      })
      if (opening > 0)
        await write.addEntry({
          kind: "STOCK_IN",
          product: product.id,
          quantity: opening,
        })
      toast.success(t("toast.added", { name }))
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <Dialog.Title className="text-2xl font-normal">
          {item ? item.name : t("stock.new")}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {item ? t("stock.editBody") : t("stock.newBody")}
        </Dialog.Description>
      </div>
      {!item && (
        <label className="flex flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">
            {t("form.name")}
          </span>
          <input
            name="name"
            required
            maxLength={40}
            autoFocus
            placeholder={t("stock.namePlaceholder")}
            onChange={() => setError("")}
            className={FIELD}
            aria-invalid={!!error}
          />
        </label>
      )}
      <div className="flex flex-col gap-2">
        <span className="text-[13px] text-muted-foreground">
          {t("stock.unit")}
        </span>
        <Segmented
          label={t("stock.unit")}
          options={units}
          value={unit}
          onChange={setUnit}
          className="w-fit bg-raised p-1.5"
        />
      </div>
      <div className={cn("grid gap-[10px]", !item && "grid-cols-2")}>
        {!item && (
          <label className="flex flex-col gap-2">
            <span className="text-[13px] text-muted-foreground">
              {t("stock.opening")}
            </span>
            <input
              name="opening"
              type="number"
              required
              min={0}
              max={100000}
              step="any"
              defaultValue={0}
              inputMode="decimal"
              className={FIELD}
            />
          </label>
        )}
        <label className="flex flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">
            {t("stock.thresholdLabel")}
          </span>
          <input
            name="thr"
            type="number"
            required
            min={0}
            max={100000}
            step="any"
            defaultValue={item?.low_stock_threshold ?? 5}
            inputMode="decimal"
            autoFocus={!!item}
            className={FIELD}
          />
        </label>
      </div>
      <FormError error={error} />
      <FormActions
        busy={busy}
        submit={item ? t("form.save") : t("form.add")}
        onDelete={item ? () => setConfirming(true) : undefined}
      />
    </form>
  )
}
