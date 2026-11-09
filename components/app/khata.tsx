"use client"

import * as React from "react"
import { Dialog } from "radix-ui"

import { DateRange, FULL, type Range } from "@/components/app/date-range"
import {
  ChevronIcon,
  MicIcon,
  PencilIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/app/icons"
import { inr, type Book, type Screen } from "@/components/app/khata-data"
import { useLayout } from "@/components/app/layout"
import {
  AddButton,
  FIELD,
  FilterButton,
  FormActions,
  FormDialog,
  Pager,
  RoundButton,
  ViewToggle,
  clearNotch,
  paginate,
  useNotchBox,
  type View,
} from "@/components/app/ledger"
import { useListMotion } from "@/components/app/list-motion"
import { AliasChip, Dot, Swap, UndoButton } from "@/components/app/parts"
import { Notch, notchRadius } from "@/components/notch"
import { Segmented } from "@/components/segmented"
import { cn } from "@/lib/utils"

export type NewCustomer = { name: string; aliases: string[]; opening: number }
export type Money = "CREDIT_GIVEN" | "PAYMENT_RECEIVED"

type Customer = Book["customers"][number]
type Selected = NonNullable<Book["selected"]>

const COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_100px_100px_36px] gap-3"
const LIST = 8

type Show = "sab" | "baaki" | "saaf"
const SHOW: { value: Show; label: string }[] = [
  { value: "sab", label: "Sab" },
  { value: "baaki", label: "Baaki hai" },
  { value: "saaf", label: "Saaf" },
]
const MONEY: { value: Money; label: React.ReactNode }[] = [
  {
    value: "CREDIT_GIVEN",
    label: (
      <span className="flex items-center gap-2">
        <Dot color="var(--chart-udhaar)" size={8} />
        Udhaar
      </span>
    ),
  },
  {
    value: "PAYMENT_RECEIVED",
    label: (
      <span className="flex items-center gap-2">
        <Dot color="var(--chart-vasooli)" size={8} />
        Vasooli
      </span>
    ),
  },
]
const KINDS: { value: Money | "sab"; label: React.ReactNode }[] = [
  { value: "sab", label: "Sab" },
  ...MONEY,
]

export function KhataScreen({
  book,
  pickCustomer,
  undo,
  go,
  saveCustomer,
  deleteCustomer,
  record,
}: {
  book: Book
  pickCustomer: (name: string) => void
  undo: (id: number) => void
  go: (s: Screen) => void
  saveCustomer: (c: NewCustomer) => void
  deleteCustomer: (name: string) => void
  record: (name: string, kind: Money, val: number) => void
}) {
  const [query, setQuery] = React.useState("")
  const [show, setShow] = React.useState<Show>("sab")
  const [page, setPage] = React.useState(1)
  const [view, setView] = React.useState<View>("table")
  const [editing, setEditing] = React.useState<Customer | "new" | null>(null)
  const [writing, setWriting] = React.useState<Money | null>(null)
  // Phones and portrait tablets show the list or one customer's ledger, not both.
  const [opened, setOpened] = React.useState(false)
  const { phone, narrow } = useLayout()
  const listRef = React.useRef<HTMLElement>(null)
  const box = useNotchBox(listRef)
  const sel = book.selected
  const q = query.trim().toLowerCase()
  const list = book.customers.filter(
    (c) =>
      (show === "sab" || (show === "baaki") === c.owed > 0) &&
      (!q || [c.name, ...c.aliases].some((n) => n.toLowerCase().includes(q)))
  )
  const { pages, current, shown } = paginate(list, page, LIST)
  const pick = (name: string) => (pickCustomer(name), setOpened(true))
  const single = narrow && opened && sel

  return (
    <div
      className={cn(
        "grid gap-[10px]",
        narrow
          ? "grid-cols-1"
          : "min-h-full grid-cols-[minmax(300px,420px)_minmax(0,1fr)]"
      )}
    >
      {!single && (
        <section
          ref={listRef}
          data-panel
          data-flip-id="side-card"
          data-shape=""
          className="relative flex flex-col gap-1.5 rounded-[32px] bg-card p-4"
        >
          <div
            className="min-h-[52px] px-2 pt-1"
            style={clearNotch(box, phone, 16, 130)}
          >
            <h2 data-roll="side-title" className="text-2xl font-normal">
              Grahak
            </h2>
            <p data-roll="side-sub" className="text-sm text-muted-foreground">
              {book.customers.length} log · {book.owingCount} par baaki
            </p>
          </div>
          <Notch
            corner="tr"
            r={notchRadius(phone ? 44 : 52)}
            gap={10}
            data-flip-id="side-tr"
            data-shape=""
            className="flex items-center gap-[10px]"
          >
            <Pager page={current} pages={pages} onPage={setPage} />
            <AddButton label="Naya grahak" onClick={() => setEditing("new")} />
          </Notch>
          <label className="mt-2 flex h-12 items-center gap-[10px] rounded-full bg-raised px-[18px] text-muted-foreground">
            <SearchIcon size={16} />
            <input
              value={query}
              onChange={(e) => (setQuery(e.target.value), setPage(1))}
              placeholder="Naam ya alias se dhoondo"
              aria-label="Grahak dhoondo"
              className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
            />
          </label>
          <div className="mb-2 flex gap-[10px]">
            <Segmented
              label="Dikhao"
              options={SHOW}
              value={show}
              onChange={(v) => (setShow(v), setPage(1))}
              className="h-12 min-w-0 flex-1 bg-raised p-1.5"
              itemClassName={cn("flex-1", phone && "px-2.5")}
            />
            <ViewToggle
              value={view}
              onChange={setView}
              className="h-12 shrink-0 bg-raised"
            />
          </div>
          {view === "cards" ? (
            <div className="grid grid-cols-2 gap-[10px]">
              {shown.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => pick(c.name)}
                  aria-pressed={!narrow && c.name === sel?.name}
                  className={cn(
                    "flex min-w-0 cursor-pointer flex-col gap-4 rounded-[24px] p-4 text-left transition-colors duration-150",
                    !narrow && c.name === sel?.name
                      ? "bg-raised ring-2 ring-lime ring-inset"
                      : "bg-background/60 hover:bg-raised"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card">
                      {c.initial}
                    </span>
                    {c.owed > 0 && <Dot color="var(--chart-udhaar)" size={8} />}
                  </span>
                  <span
                    className={cn(
                      "truncate leading-none font-light tracking-[-0.02em]",
                      phone ? "text-2xl" : "text-[28px]"
                    )}
                  >
                    <span data-roll={`bal-${c.name}`} className="block">
                      {c.bal}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{c.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.last}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="flex justify-between px-3 text-xs text-muted-foreground">
                <span>Grahak</span>
                <span>Baaki</span>
              </div>
              {shown.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => pick(c.name)}
                  aria-pressed={!narrow && c.name === sel?.name}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-3xl p-3 text-left transition-colors duration-150",
                    !narrow && c.name === sel?.name
                      ? "bg-raised"
                      : "bg-transparent hover:bg-raised/50"
                  )}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-background">
                    {c.initial}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base">{c.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {c.last}
                    </span>
                  </span>
                  <span
                    data-roll={`bal-${c.name}`}
                    className="text-lg font-light"
                  >
                    {c.bal}
                  </span>
                </button>
              ))}
            </>
          )}
          {list.length === 0 && (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              {book.customers.length
                ? "Koi grahak nahi mila."
                : "Abhi koi grahak nahi. + se jodiye."}
            </p>
          )}
          <div className="mt-auto flex justify-between border-t border-line px-3 pt-3.5 pb-1 text-sm text-muted-foreground">
            <span>Kul baaki</span>
            <span className="text-foreground">{inr(book.total)}</span>
          </div>
        </section>
      )}

      {sel && (!narrow || single) ? (
        <CustomerLedger
          key={sel.name}
          sel={sel}
          undo={undo}
          go={go}
          onBack={narrow ? () => setOpened(false) : undefined}
          onEdit={() =>
            setEditing(book.customers.find((c) => c.name === sel.name)!)
          }
          onWrite={setWriting}
        />
      ) : !narrow ? (
        <section
          data-panel
          data-flip-id="main-card"
          data-shape=""
          className="grid min-h-[320px] place-items-center rounded-[32px] bg-card p-7 text-center text-muted-foreground"
        >
          Grahak chuniye, ya + se naya jodiye.
        </section>
      ) : null}

      <FormDialog open={editing !== null} onClose={() => setEditing(null)}>
        {editing !== null && (
          <CustomerForm
            key={editing === "new" ? "" : editing.name}
            item={editing === "new" ? null : editing}
            taken={book.customers.map((c) => c.name)}
            onSave={(c) => (saveCustomer(c), setEditing(null))}
            onDelete={(n) => (
              deleteCustomer(n),
              setEditing(null),
              setOpened(false)
            )}
          />
        )}
      </FormDialog>
      <FormDialog open={writing !== null} onClose={() => setWriting(null)}>
        {writing !== null && sel && (
          <EntryForm
            who={sel.name}
            owed={sel.owed}
            start={writing}
            onSave={(kind, val) => (
              record(sel.name, kind, val),
              setWriting(null)
            )}
          />
        )}
      </FormDialog>
    </div>
  )
}

function CustomerLedger({
  sel,
  undo,
  go,
  onBack,
  onEdit,
  onWrite,
}: {
  sel: Selected
  undo: (id: number) => void
  go: (s: Screen) => void
  /** Phones: back to the customer list. */
  onBack?: () => void
  onEdit: () => void
  onWrite: (kind: Money) => void
}) {
  const [kind, setKind] = React.useState<Money | "sab">("sab")
  const [range, setRange] = React.useState<Range>(FULL)
  const [page, setPage] = React.useState(1)
  const { phone, cw, compact } = useLayout()
  const ref = React.useRef<HTMLElement>(null)
  const box = useNotchBox(ref)
  const rows = sel.entries.filter(
    (e) =>
      (kind === "sab" || e.kind === kind) &&
      e.d <= range.from &&
      e.d >= range.to
  )
  const { pages, current, shown } = paginate(rows, page)
  const { capture } = useListMotion(ref, [shown.map((e) => e.id).join()])
  const ranged = range.from !== FULL.from || range.to !== FULL.to
  const filters = (
    <>
      <Segmented
        label="Kism"
        options={KINDS}
        value={kind}
        onChange={(v) => (capture(), setKind(v), setPage(1))}
        className="h-[52px] bg-card p-1.5"
        itemClassName={phone ? "flex-1" : undefined}
      />
      <DateRange
        value={range}
        onChange={(r) => (capture(), setRange(r), setPage(1))}
      />
    </>
  )
  // The notch keeps the filters inline only when the card is wide enough for them beside the name.
  const inline = cw >= 1530
  const stacked = compact

  return (
    <section
      ref={ref}
      data-panel
      data-flip-id="main-card"
      data-shape=""
      className={cn(
        "relative flex flex-col gap-6 rounded-[32px] bg-card",
        phone ? "p-5" : "p-7"
      )}
    >
      {onBack && (
        // In the card's corner, 10px in like the notches, so its curve follows the card's corner.
        <button
          type="button"
          title="Saare grahak"
          aria-label="Saare grahak"
          onClick={onBack}
          className={cn(
            "absolute top-[10px] left-[10px] grid cursor-pointer place-items-center rounded-full bg-raised transition-transform duration-150 active:scale-[0.94]",
            phone ? "size-11" : "size-[52px]"
          )}
        >
          <ChevronIcon left size={18} />
        </button>
      )}
      <div
        className="min-h-[52px] min-w-0"
        style={clearNotch(box, phone, phone ? 20 : 28, onBack ? Infinity : 140)}
      >
        <h2
          data-roll="card-title"
          className={cn(
            "min-w-0 truncate font-light tracking-[-0.02em]",
            phone ? "text-[28px]" : compact ? "text-[32px]" : "text-[40px]"
          )}
        >
          {sel.name}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Bolte hain</span>
          {sel.aliases.length ? (
            sel.aliases.map((a) => <AliasChip key={a}>{a}</AliasChip>)
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </div>
      <Notch
        corner="tr"
        r={notchRadius(phone ? 44 : 52)}
        gap={10}
        data-flip-id="main-tr"
        data-shape=""
        className="flex items-center gap-[10px]"
      >
        {inline ? (
          <span className="flex items-center gap-[10px]">{filters}</span>
        ) : (
          <FilterButton active={kind !== "sab" || ranged}>
            {filters}
          </FilterButton>
        )}
        <Pager
          page={current}
          pages={pages}
          onPage={(p) => (capture(), setPage(p))}
        />
        <RoundButton
          title={`${sel.name} badlo`}
          onClick={onEdit}
          className="bg-lime text-black"
        >
          <PencilIcon size={16} />
        </RoundButton>
      </Notch>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div
          className={cn(
            "flex flex-wrap gap-[10px]",
            phone && "order-last w-full"
          )}
        >
          <button
            type="button"
            onClick={() => onWrite("CREDIT_GIVEN")}
            className={cn(
              "flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full bg-raised px-5 text-sm transition-transform duration-150 active:scale-[0.97]",
              phone && "flex-1"
            )}
          >
            <Dot color="var(--chart-udhaar)" />
            {phone ? "Udhaar" : "Udhaar likho"}
          </button>
          <button
            type="button"
            onClick={() => onWrite("PAYMENT_RECEIVED")}
            disabled={sel.owed <= 0}
            title={sel.owed <= 0 ? "Kuch baaki nahi hai" : undefined}
            className={cn(
              "flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full bg-raised px-5 text-sm transition-transform duration-150 active:scale-[0.97] disabled:cursor-default disabled:opacity-40 disabled:active:scale-100",
              phone && "flex-1"
            )}
          >
            <Dot color="var(--chart-vasooli)" />
            {phone ? "Vasooli" : "Vasooli likho"}
          </button>
          <button
            type="button"
            onClick={() => go("bolo")}
            title="Bolke likho"
            aria-label="Bolke likho"
            className="flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full border border-line px-5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-raised hover:text-foreground"
          >
            <MicIcon size={16} />
            {!phone && "Bolke likho"}
          </button>
        </div>
        <div className={cn(!phone && "ml-auto text-right")}>
          <p
            data-roll="big"
            className={cn(
              "leading-none font-light tracking-[-0.03em]",
              phone ? "text-5xl" : compact ? "text-[56px]" : "text-[64px]"
            )}
          >
            {sel.bal}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">{sel.balLabel}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {!stacked && (
          <div
            className={cn(
              COLUMNS,
              "pr-2.5 pl-4 text-xs font-medium text-muted-foreground"
            )}
          >
            <span>Tareekh</span>
            <span>Kism</span>
            <span>Zariya</span>
            <span className="text-right">Raqam</span>
            <span className="text-right">Baaki</span>
            <span />
          </div>
        )}
        {shown.map((e) =>
          stacked ? (
            <div
              key={e.id}
              data-flip-id={`row-${e.id}`}
              className={cn(
                "flex items-center gap-3 rounded-[18px] bg-background py-3 pr-2.5 pl-4",
                e.faded && "opacity-50"
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-[3px] text-xs font-medium">
                    <Dot color={e.dot} size={7} />
                    {e.kindLabel}
                  </span>
                  <span className="truncate text-sm">{e.date}</span>
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {e.idLabel} · {e.src}
                  {e.tag && ` · ${e.tag}`}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span
                  className={cn(
                    "block text-[15px] font-light tabular-nums",
                    e.struck && "line-through"
                  )}
                >
                  {e.amt}
                </span>
                {e.running && (
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    baaki {e.running}
                  </span>
                )}
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
                COLUMNS,
                "group items-center rounded-[18px] bg-background py-3 pr-2.5 pl-4 transition-colors duration-150 hover:bg-raised",
                e.faded && "opacity-50"
              )}
            >
              <span className="flex min-w-0 flex-col gap-px">
                <span className="truncate text-sm font-medium">{e.date}</span>
                <span className="text-xs text-muted-foreground">
                  {e.idLabel}
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
                  <span className="text-xs text-muted-foreground">{e.tag}</span>
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
              <span className="text-right text-sm text-muted-foreground tabular-nums">
                {e.running}
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
        {rows.length === 0 && (
          <p className="px-4 py-7 text-sm text-muted-foreground">
            {sel.entries.length
              ? "Is chhaanti mein koi entry nahi."
              : "Abhi koi entry nahi. Udhaar likho se shuru kariye."}
          </p>
        )}
      </div>
    </section>
  )
}

function EntryForm({
  who,
  owed,
  start,
  onSave,
}: {
  who: string
  owed: number
  start: Money
  onSave: (kind: Money, val: number) => void
}) {
  const [kind, setKind] = React.useState(start)
  const [amount, setAmount] = React.useState("")
  const val = Math.max(0, Math.round(Number(amount) || 0))
  const paying = kind === "PAYMENT_RECEIVED"
  const next = owed + (paying ? -val : val)
  const over = paying && val > owed

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (val > 0 && !over) onSave(kind, val)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <Dialog.Title className="text-2xl font-normal">{who}</Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {owed > 0 ? `Abhi ${inr(owed)} baaki hai.` : "Abhi hisaab saaf hai."}
        </Dialog.Description>
      </div>
      <Segmented
        label="Kya likhna hai"
        options={MONEY}
        value={kind}
        onChange={setKind}
        className="w-full bg-raised p-1.5"
        itemClassName="flex-1 justify-center"
      />
      <label className="flex flex-col gap-2">
        <span className="text-[13px] text-muted-foreground">Raqam</span>
        <span
          className={cn(
            FIELD,
            "flex items-center gap-2 focus-within:ring-2 focus-within:ring-ring",
            over &&
              "ring-2 ring-[var(--red-ink)] focus-within:ring-[var(--red-ink)]"
          )}
        >
          <span className="text-muted-foreground">₹</span>
          <input
            name="amount"
            type="number"
            required
            min={1}
            max={paying ? Math.max(1, owed) : 1000000}
            step={1}
            inputMode="numeric"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            aria-invalid={over}
            className="min-w-0 flex-1 [appearance:textfield] bg-transparent text-2xl font-light outline-none placeholder:text-muted-foreground [&::-webkit-inner-spin-button]:appearance-none"
          />
        </span>
        <span
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-400 ease-drawer motion-reduce:transition-opacity",
            paying && owed > 0
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          )}
        >
          <span className="min-h-0 overflow-hidden">
            <button
              type="button"
              tabIndex={paying && owed > 0 ? 0 : -1}
              onClick={() => setAmount(String(owed))}
              className="w-fit cursor-pointer rounded-full bg-raised px-4 py-2 text-[13px] transition-colors duration-150 hover:bg-background"
            >
              Poora {inr(owed)}
            </button>
          </span>
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
          `Baaki sirf ${inr(owed)} hai, usse zyada vasooli nahi likh sakte.`
        ) : (
          <>
            <span>Naya baaki</span>
            <span className="text-foreground">
              {next <= 0 ? "Hisaab saaf" : inr(next)}
            </span>
          </>
        )}
      </p>
      <FormActions
        submit={
          <Swap on={paying} off="Udhaar likho">
            Vasooli likho
          </Swap>
        }
      />
    </form>
  )
}

const parseAliases = (raw: string) => [
  ...new Set(
    raw
      .split(",")
      .map((a) => a.trim().toLowerCase().replace(/\s+/g, " "))
      .filter(Boolean)
  ),
]

function CustomerForm({
  item,
  taken,
  onSave,
  onDelete,
}: {
  item: Customer | null
  taken: string[]
  onSave: (c: NewCustomer) => void
  onDelete: (name: string) => void
}) {
  const [error, setError] = React.useState("")
  const [confirming, setConfirming] = React.useState(false)
  const clear = item ? item.owed <= 0 : false

  if (item && confirming)
    return (
      <div className="flex flex-col gap-5">
        <div>
          <Dialog.Title className="text-2xl font-normal">
            {item.name} hatayein?
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Yeh list se hat jayenge. Inka purana hisaab Entries mein rahega,
            kuch mitega nahi.
          </Dialog.Description>
        </div>
        <button
          type="button"
          onClick={() => onDelete(item.name)}
          className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#fe9695] text-base font-medium text-black transition-transform duration-150 hover:scale-[1.02]"
        >
          <TrashIcon size={18} />
          Haan, hatao
        </button>
      </div>
    )

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const aliases = parseAliases(String(f.get("aliases")))
    if (item) return onSave({ name: item.name, aliases, opening: 0 })
    const name = String(f.get("name")).trim().replace(/\s+/g, " ")
    if (!name) return setError("Naam likhiye.")
    if (taken.some((t) => t.toLowerCase() === name.toLowerCase()))
      return setError(`"${name}" pehle se list mein hain.`)
    onSave({ name, aliases, opening: Number(f.get("opening")) })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <Dialog.Title className="text-2xl font-normal">
          {item ? item.name : "Naya grahak"}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {!item
            ? "Khate mein jodiye. Pehle ka udhaar ho to woh bhi likh denge."
            : clear
              ? "Bolne waale naam badliye. Baaki entries se hi badalta hai."
              : `Bolne waale naam badliye. ${inr(item.owed)} baaki hai, hisaab saaf hone par hi hata sakte hain.`}
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
            placeholder="Jaise Pandey ji"
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
      <label className="flex flex-col gap-2">
        <span className="text-[13px] text-muted-foreground">
          Aur kis naam se bulate hain
        </span>
        <input
          name="aliases"
          maxLength={120}
          autoFocus={!!item}
          defaultValue={item?.aliases.join(", ")}
          placeholder="Jaise pandey, pandey uncle"
          className={FIELD}
        />
        <span className="px-1 text-xs text-muted-foreground">
          Comma se alag kariye. Bolke likhte waqt in naamon se pehchanenge.
        </span>
      </label>
      {!item && (
        <label className="flex flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">
            Pehle ka udhaar (₹)
          </span>
          <input
            name="opening"
            type="number"
            required
            min={0}
            max={1000000}
            defaultValue={0}
            inputMode="numeric"
            className={FIELD}
          />
        </label>
      )}
      <FormActions
        submit={item ? "Save karo" : "Jodo"}
        onDelete={clear ? () => setConfirming(true) : undefined}
      />
    </form>
  )
}
