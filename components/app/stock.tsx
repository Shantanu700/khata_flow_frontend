"use client"

import * as React from "react"
import { Dialog, Select } from "radix-ui"

import {
  DateRange,
  FULL,
  rangeLabel,
  type Range,
} from "@/components/app/date-range"
import {
  BoxIcon,
  ChevronIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/app/icons"
import {
  UNITS,
  type Book,
  type EntryView,
  type Unit,
} from "@/components/app/khata-data"
import {
  AddButton,
  CornerPager,
  FIELD,
  FilterButton,
  FormActions,
  FormDialog,
  LedgerCard,
  NotchSearch,
  PAGE,
  Pager,
  SearchField,
  ViewToggle,
  paginate,
  type View,
} from "@/components/app/ledger"
import { useLayout } from "@/components/app/layout"
import { CornerButton, Dot } from "@/components/app/parts"
import { Segmented } from "@/components/segmented"
import { cn } from "@/lib/utils"

export type NewProduct = {
  name: string
  unit: Unit
  thr: number
  opening: number
}

const COLS =
  "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_110px] gap-3"
const ALL = "all"

type Sort = "naye" | "maatra" | "naam"
const SORTS: { value: Sort; label: string }[] = [
  { value: "naye", label: "Naye" },
  { value: "maatra", label: "Maatra" },
  { value: "naam", label: "Naam" },
]
const ORDER: Record<Sort, ((a: EntryView, b: EntryView) => number) | null> = {
  naye: null,
  maatra: (a, b) => b.qty - a.qty,
  naam: (a, b) => (a.name ?? "").localeCompare(b.name ?? ""),
}

type Show = "sab" | "kam" | "theek"
const SHOW: { value: Show; label: string }[] = [
  { value: "sab", label: "Sab" },
  { value: "kam", label: "Kam hai" },
  { value: "theek", label: "Theek hai" },
]
const CARDS = 8
const PCOLS =
  "grid grid-cols-[minmax(0,1.6fr)_90px_90px_minmax(0,1.4fr)_36px] gap-4"

type Item = Book["products"][number]

export function StockScreen({
  book,
  saveProduct,
  deleteProduct,
}: {
  book: Book
  saveProduct: (p: NewProduct) => void
  deleteProduct: (name: string) => void
}) {
  const [query, setQuery] = React.useState("")
  const [show, setShow] = React.useState<Show>("sab")
  const [page, setPage] = React.useState(1)
  const [view, setView] = React.useState<View>("cards")
  const [editing, setEditing] = React.useState<Item | "new" | null>(null)
  const { phone } = useLayout()
  const q = query.trim().toLowerCase()
  const list = book.products.filter(
    (p) =>
      (show === "sab" || (show === "kam") === p.low) &&
      (!q || p.name.toLowerCase().includes(q))
  )
  const size = view === "cards" ? CARDS : PAGE
  const { pages, current, shown } = paginate(list, page, size)

  return (
    <div className="flex flex-col gap-[10px]">
      <LedgerCard
        flip="main"
        className={cn(!phone && "pb-[92px]")}
        title="Saamaan"
        sub={`${book.products.length} cheezein · ${book.lowStock.length} kam`}
        controls={
          <>
            <SearchField
              value={query}
              onChange={(v) => (setQuery(v), setPage(1))}
              placeholder="Saamaan dhoondo"
              label="Saamaan dhoondo"
            />
            <Segmented
              label="Dikhao"
              options={SHOW}
              value={show}
              onChange={(v) => (setShow(v), setPage(1))}
              className="h-[52px] bg-card p-1.5"
            />
            <ViewToggle
              value={view}
              onChange={(v) => (setView(v), setPage(1))}
            />
            <AddButton label="Naya saamaan" onClick={() => setEditing("new")} />
          </>
        }
        compactControls={
          <>
            <NotchSearch
              value={query}
              onChange={(v) => (setQuery(v), setPage(1))}
              placeholder="Saamaan dhoondo"
              label="Saamaan dhoondo"
            />
            <FilterButton active={show !== "sab"}>
              <Segmented
                label="Dikhao"
                options={SHOW}
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
            {phone && <Pager page={current} pages={pages} onPage={setPage} />}
            <AddButton label="Naya saamaan" onClick={() => setEditing("new")} />
          </>
        }
        toolbar={null}
      >
        {view === "table" && phone ? (
          <div className="flex flex-col gap-1.5">
            {shown.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-3 rounded-[18px] bg-background py-3 pr-2.5 pl-4"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {p.name}
                    </span>
                    <span className="text-xl font-light tabular-nums">
                      {p.level}
                    </span>
                  </span>
                  <span
                    role="img"
                    aria-label={`${p.level} bache, seema ${p.thr}`}
                    className="h-1.5 overflow-hidden rounded-full bg-raised"
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${p.pct}%`,
                        background: p.low ? "#ef4949" : "#6ba600",
                      }}
                    />
                  </span>
                  <span className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {p.unit} · seema {p.thr}
                    </span>
                    <span
                      style={{ color: p.low ? "var(--red-ink)" : undefined }}
                    >
                      {p.low ? "Kam hai" : "Theek hai"}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  title={`${p.name} badlo`}
                  aria-label={`${p.name} badlo`}
                  onClick={() => setEditing(p)}
                  className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-raised"
                >
                  <PencilIcon size={14} />
                </button>
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
              <span>Saamaan</span>
              <span className="text-right">Bache</span>
              <span className="text-right">Seema</span>
              <span>Haalat</span>
              <span />
            </div>
            {shown.map((p) => (
              <div
                key={p.name}
                className={cn(
                  PCOLS,
                  "group min-w-[620px] items-center rounded-[18px] bg-background py-3 pr-2.5 pl-4 transition-colors duration-150 hover:bg-raised"
                )}
              >
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.unit}
                  </span>
                </span>
                <span className="text-right text-xl font-light tabular-nums">
                  {p.level}
                </span>
                <span className="text-right text-sm text-muted-foreground tabular-nums">
                  {p.thr}
                </span>
                <span className="flex items-center gap-3">
                  <span
                    role="img"
                    aria-label={`${p.level} bache, seema ${p.thr}`}
                    className="h-2 flex-1 overflow-hidden rounded-full bg-raised group-hover:bg-card"
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${p.pct}%`,
                        background: p.low ? "#ef4949" : "#6ba600",
                      }}
                    />
                  </span>
                  <span
                    className="w-16 text-xs"
                    style={{
                      color: p.low
                        ? "var(--red-ink)"
                        : "var(--muted-foreground)",
                    }}
                  >
                    {p.low ? "Kam hai" : "Theek hai"}
                  </span>
                </span>
                <button
                  type="button"
                  title={`${p.name} badlo`}
                  aria-label={`${p.name} badlo`}
                  onClick={() => setEditing(p)}
                  className="grid size-9 cursor-pointer place-items-center rounded-full bg-raised group-hover:bg-card"
                >
                  <PencilIcon size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-[10px] @min-[480px]/content:grid-cols-2 @min-[1000px]/content:grid-cols-4">
            {shown.map((p) => (
              <div
                key={p.name}
                className="relative flex min-h-[200px] flex-col gap-[18px] rounded-[32px] bg-raised p-6"
              >
                <div className="pr-24">
                  <p className="text-lg">{p.name}</p>
                  <p className="text-[13px] text-muted-foreground">{p.unit}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    data-roll={`level-${p.name}`}
                    className="text-[64px] leading-none font-light tracking-[-0.03em]"
                  >
                    {p.level}
                  </span>
                  <span className="text-sm text-muted-foreground">bache</span>
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  <div
                    role="img"
                    aria-label={`${p.level} bache, seema ${p.thr}`}
                    className="h-2 overflow-hidden rounded-full bg-card"
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${p.pct}%`,
                        background: p.low ? "#ef4949" : "#6ba600",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Seema {p.thr}</span>
                    <span
                      style={{ color: p.low ? "var(--red-ink)" : undefined }}
                    >
                      {p.low ? "Kam hai" : "Theek hai"}
                    </span>
                  </div>
                </div>
                <CornerButton
                  title={`${p.name} badlo`}
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
        {list.length === 0 && (
          <p className="px-1 py-7 text-sm text-muted-foreground">
            Koi saamaan nahi mila.
          </p>
        )}
        <CornerPager
          flip="main"
          total={list.length}
          size={size}
          page={current}
          pages={pages}
          onPage={setPage}
        />
      </LedgerCard>
      <ProductDialog
        editing={editing}
        onClose={() => setEditing(null)}
        taken={book.products.map((p) => p.name)}
        onSave={saveProduct}
        onDelete={deleteProduct}
      />
      <StockLedger book={book} />
    </div>
  )
}

function StockLedger({ book }: { book: Book }) {
  const [sort, setSort] = React.useState<Sort>("naye")
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [range, setRange] = React.useState<Range>(FULL)
  const [product, setProduct] = React.useState(ALL)
  const { phone } = useLayout()
  const q = query.trim().toLowerCase()
  const rows = book.stockMoves
    .filter(
      (e) =>
        e.d <= range.from &&
        e.d >= range.to &&
        (product === ALL || e.name === product)
    )
    .filter(
      (e) =>
        !q || `${e.name} ${e.idLabel} ${e.kindLabel}`.toLowerCase().includes(q)
    )
  const order = ORDER[sort]
  if (order) rows.sort(order)
  const { pages, current, shown } = paginate(rows, page)
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => (set(v), setPage(1))

  return (
    <LedgerCard
      title="Stock aaya-gaya"
      sub={`${product === ALL ? "Saara saamaan" : product} · ${rangeLabel(range)} · ${rows.length}`}
      controls={
        <>
          <DateRange value={range} onChange={reset(setRange)} />
          <Segmented
            label="Kram"
            options={SORTS}
            value={sort}
            onChange={reset(setSort)}
            className="h-[52px] bg-card p-1.5"
          />
          <SearchField
            value={query}
            onChange={reset(setQuery)}
            placeholder="Naam ya # dhoondo"
            label="Stock mein dhoondo"
          />
          <Pager page={current} pages={pages} onPage={setPage} />
        </>
      }
      compactControls={
        <>
          <NotchSearch
            value={query}
            onChange={reset(setQuery)}
            placeholder="Naam ya # dhoondo"
            label="Stock mein dhoondo"
          />
          <FilterButton
            active={
              sort !== "naye" ||
              range.from !== FULL.from ||
              range.to !== FULL.to
            }
          >
            <Segmented
              label="Kram"
              options={SORTS}
              value={sort}
              onChange={reset(setSort)}
              className="h-[52px] bg-card p-1.5"
              itemClassName="flex-1"
            />
            <DateRange value={range} onChange={reset(setRange)} />
          </FilterButton>
          <Pager page={current} pages={pages} onPage={setPage} />
        </>
      }
      toolbar={
        <ProductSelect
          value={product}
          onChange={reset(setProduct)}
          names={book.products.map((p) => p.name)}
        />
      }
    >
      <div className="flex flex-col gap-1.5 overflow-x-auto">
        <div
          hidden={phone}
          className={cn(
            COLS,
            "min-w-[560px] px-4 text-xs font-medium text-muted-foreground"
          )}
        >
          <span>Saamaan</span>
          <span>Kism</span>
          <span>Zariya</span>
          <span className="text-right">Maatra</span>
        </div>
        {shown.map((e) =>
          phone ? (
            <div
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-[18px] bg-background px-4 py-3"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-sm font-medium">{e.name}</span>
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2 py-[2px] font-medium text-foreground">
                    <Dot color={e.dot} size={6} />
                    {e.kindLabel}
                  </span>
                  {e.idLabel} · {e.date} · {e.src}
                </span>
              </span>
              <span className="shrink-0 text-[15px] font-light tabular-nums">
                {e.amt}
              </span>
            </div>
          ) : (
            <div
              key={e.id}
              className={cn(
                COLS,
                "group min-w-[560px] items-center rounded-[18px] bg-background px-4 py-3 transition-colors duration-150 hover:bg-raised"
              )}
            >
              <span className="flex min-w-0 flex-col gap-px">
                <span className="truncate text-sm font-medium">{e.name}</span>
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
              <span className="text-right text-[15px] font-light tabular-nums">
                {e.amt}
              </span>
            </div>
          )
        )}
        {rows.length === 0 && (
          <p className="px-4 py-7 text-sm text-muted-foreground">
            Koi stock entry nahi mili.
          </p>
        )}
      </div>
    </LedgerCard>
  )
}

function ProductSelect({
  value,
  onChange,
  names,
}: {
  value: string
  onChange: (v: string) => void
  names: string[]
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        aria-label="Saamaan se chhaantiye"
        className="flex h-10 w-fit cursor-pointer items-center gap-2.5 rounded-full border border-line px-[18px] text-sm outline-none hover:bg-raised focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-raised"
      >
        <BoxIcon size={16} className="text-muted-foreground" />
        <Select.Value />
        <Select.Icon>
          <ChevronIcon size={14} className="rotate-90 text-muted-foreground" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={8}
          className="kf-app z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[24px] bg-card p-1.5 text-foreground shadow-[0_24px_60px_rgb(0_0_0/0.35)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <Select.Viewport className="flex flex-col gap-0.5">
            {[ALL, ...names].map((n) => (
              <Select.Item
                key={n}
                value={n}
                className="flex h-10 cursor-pointer items-center rounded-full px-4 text-sm outline-none select-none data-[highlighted]:bg-raised data-[state=checked]:bg-lime data-[state=checked]:text-black"
              >
                <Select.ItemText>
                  {n === ALL ? "Saara saamaan" : n}
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

function ProductDialog({
  editing,
  onClose,
  taken,
  onSave,
  onDelete,
}: {
  editing: Item | "new" | null
  onClose: () => void
  taken: string[]
  onSave: (p: NewProduct) => void
  onDelete: (name: string) => void
}) {
  return (
    <FormDialog open={editing !== null} onClose={onClose}>
      {editing !== null && (
        <ProductForm
          key={editing === "new" ? "" : editing.name}
          item={editing === "new" ? null : editing}
          taken={taken}
          onSave={(p) => (onSave(p), onClose())}
          onDelete={(name) => (onDelete(name), onClose())}
        />
      )}
    </FormDialog>
  )
}

function ProductForm({
  item,
  taken,
  onSave,
  onDelete,
}: {
  item: Item | null
  taken: string[]
  onSave: (p: NewProduct) => void
  onDelete: (name: string) => void
}) {
  const [unit, setUnit] = React.useState<Unit>(item?.unit ?? "Packet")
  const [error, setError] = React.useState("")
  const [confirming, setConfirming] = React.useState(false)

  if (item && confirming)
    return (
      <div className="flex flex-col gap-5">
        <div>
          <Dialog.Title className="text-2xl font-normal">
            {item.name} hatayein?
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Yeh list se hat jayega. Iska purana stock hisaab Entries mein
            rahega, kuch mitega nahi.
          </Dialog.Description>
        </div>
        <div className="flex gap-[10px] pt-1">
          <button
            type="button"
            onClick={() => onDelete(item.name)}
            className="flex h-14 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#fe9695] text-base font-medium text-black transition-transform duration-150 hover:scale-[1.02]"
          >
            <TrashIcon size={18} />
            Haan, hatao
          </button>
        </div>
      </div>
    )

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const thr = Number(f.get("thr"))
    if (item) return onSave({ name: item.name, unit, thr, opening: 0 })
    const name = String(f.get("name")).trim().replace(/\s+/g, " ")
    if (!name) return setError("Naam likhiye.")
    if (taken.some((t) => t.toLowerCase() === name.toLowerCase()))
      return setError(`"${name}" pehle se list mein hai.`)
    onSave({ name, unit, thr, opening: Number(f.get("opening")) })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <Dialog.Title className="text-2xl font-normal">
          {item ? item.name : "Naya saamaan"}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {item
            ? "Ikai aur kam ki seema badliye. Stock entries se hi badalta hai."
            : "Dukaan ki list mein jodiye. Abhi jitna hai, utna stock aaya likh denge."}
        </Dialog.Description>
      </div>
      {!item && (
        <label className="flex flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">Naam</span>
          <input
            name="name"
            required
            maxLength={40}
            autoFocus
            placeholder="Jaise Surf Excel 1kg"
            onChange={() => setError("")}
            className={FIELD}
            aria-invalid={!!error}
          />
          {error && (
            <span
              role="alert"
              className="px-1 text-[13px] text-[var(--red-ink)]"
            >
              {error}
            </span>
          )}
        </label>
      )}
      <div className="flex flex-col gap-2">
        <span className="text-[13px] text-muted-foreground">Ikai</span>
        <Segmented
          label="Ikai"
          options={UNITS}
          value={unit}
          onChange={setUnit}
          className="w-fit bg-raised p-1.5"
        />
      </div>
      <div className={cn("grid gap-[10px]", !item && "grid-cols-2")}>
        {!item && (
          <label className="flex flex-col gap-2">
            <span className="text-[13px] text-muted-foreground">
              Abhi kitna hai
            </span>
            <input
              name="opening"
              type="number"
              required
              min={0}
              max={100000}
              defaultValue={0}
              inputMode="numeric"
              className={FIELD}
            />
          </label>
        )}
        <label className="flex flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">
            Kam ki seema
          </span>
          <input
            name="thr"
            type="number"
            required
            min={0}
            max={100000}
            defaultValue={item?.thr ?? 5}
            inputMode="numeric"
            autoFocus={!!item}
            className={FIELD}
          />
        </label>
      </div>
      <FormActions
        submit={item ? "Save karo" : "Jodo"}
        onDelete={item ? () => setConfirming(true) : undefined}
      />
    </form>
  )
}
