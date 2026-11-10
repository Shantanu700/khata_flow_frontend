"use client"

import * as React from "react"
import { toast } from "sonner"
import { Dialog } from "radix-ui"

import {
  SIZE,
  useCustomer,
  useCustomers,
  useDebounced,
  useLedger,
  useSummary,
  write,
} from "@/components/app/data"
import { DateRange, rangeParams, type Range } from "@/components/app/date-range"
import { errorText, useI18n } from "@/components/app/i18n"
import {
  ChevronIcon,
  MicIcon,
  PencilIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/app/icons"
import { entryView, initial, lastLabel } from "@/components/app/khata-data"
import { useLayout } from "@/components/app/layout"
import {
  AddButton,
  FIELD,
  FilterButton,
  FormActions,
  FormDialog,
  FormError,
  LoadError,
  Pager,
  RoundButton,
  ViewToggle,
  clearNotch,
  pagesOf,
  useNotchBox,
  type View,
} from "@/components/app/ledger"
import { useListMotion } from "@/components/app/list-motion"
import {
  AliasChip,
  Dot,
  Swap,
  UndoButton,
  Tip,
  toasted,
} from "@/components/app/parts"
import { useShell } from "@/components/app/shell"
import { Notch, notchRadius } from "@/components/notch"
import { Segmented } from "@/components/segmented"
import { inr, type Party } from "@/lib/api"
import { cn } from "@/lib/utils"

type Money = "CREDIT_GIVEN" | "PAYMENT_RECEIVED"

const COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_100px_100px_36px] gap-3"

type Show = "sab" | "owing" | "clear"
const SHOW: { value: Show; key: string }[] = [
  { value: "sab", key: "khata.show.all" },
  { value: "owing", key: "khata.show.owing" },
  { value: "clear", key: "khata.show.clear" },
]

export function KhataScreen() {
  const { t } = useI18n()
  const { customerId, setCustomerId } = useShell()
  const [query, setQuery] = React.useState("")
  const [show, setShow] = React.useState<Show>("sab")
  const [page, setPage] = React.useState(1)
  const [view, setView] = React.useState<View>("table")
  const [editing, setEditing] = React.useState<Party | "new" | null>(null)
  const [writing, setWriting] = React.useState<Money | null>(null)
  // Phones and portrait tablets show the list or one customer's ledger, not both.
  const [opened, setOpened] = React.useState(customerId !== null)
  const { phone, narrow } = useLayout()
  const listRef = React.useRef<HTMLElement>(null)
  const box = useNotchBox(listRef)
  const q = useDebounced(query.trim())
  const list = useCustomers({
    q: q || undefined,
    balance: show === "sab" ? undefined : show,
    ordering: "-balance",
    page,
    page_size: SIZE.list,
  })
  const summary = useSummary()
  const shown = list.data?.results ?? []
  const pages = pagesOf(list.data?.count, SIZE.list)
  // Wide screens always show someone: the first customer until one is picked.
  const selectedId = customerId ?? (narrow ? null : (shown[0]?.id ?? null))
  const selected = useCustomer(selectedId)
  const sel = selected.data
  const pick = (id: number) => (setCustomerId(id), setOpened(true))
  const single = narrow && opened && selectedId !== null
  const showOptions = SHOW.map((s) => ({ value: s.value, label: t(s.key) }))

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
              {t("khata.listTitle")}
            </h2>
            <p data-roll="side-sub" className="text-sm text-muted-foreground">
              {t("khata.listSub", {
                count: summary.data?.customer_count ?? 0,
                owing: summary.data?.owing_count ?? 0,
              })}
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
            <Pager page={page} pages={pages} onPage={setPage} />
            <AddButton
              label={t("khata.new")}
              onClick={() => setEditing("new")}
            />
          </Notch>
          <label className="mt-2 flex h-12 items-center gap-[10px] rounded-full bg-raised px-[18px] text-muted-foreground">
            <SearchIcon size={16} />
            <input
              value={query}
              onChange={(e) => (setQuery(e.target.value), setPage(1))}
              placeholder={t("khata.search")}
              aria-label={t("khata.searchLabel")}
              className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
            />
          </label>
          <div className="mb-2 flex gap-[10px]">
            <Segmented
              label={t("stock.showLabel")}
              options={showOptions}
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
                  key={c.id}
                  type="button"
                  onClick={() => pick(c.id)}
                  aria-pressed={!narrow && c.id === selectedId}
                  className={cn(
                    "flex min-w-0 cursor-pointer flex-col gap-4 rounded-[24px] p-4 text-left transition-colors duration-150",
                    !narrow && c.id === selectedId
                      ? "bg-raised ring-2 ring-lime ring-inset"
                      : "bg-background/60 hover:bg-raised"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card">
                      {initial(c.name)}
                    </span>
                    {(c.balance ?? 0) > 0 && (
                      <Dot color="var(--chart-udhaar)" size={8} />
                    )}
                  </span>
                  <span
                    className={cn(
                      "truncate leading-none font-light tracking-[-0.02em]",
                      phone ? "text-2xl" : "text-[28px]"
                    )}
                  >
                    <span data-roll={`bal-${c.id}`} className="block">
                      {balanceText(c, t)}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{c.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {lastLabel(c.last_entry_on, t)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="flex justify-between px-3 text-xs text-muted-foreground">
                <span>{t("khata.listTitle")}</span>
                <span>{t("col.balance")}</span>
              </div>
              {shown.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pick(c.id)}
                  aria-pressed={!narrow && c.id === selectedId}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-3xl p-3 text-left transition-colors duration-150",
                    !narrow && c.id === selectedId
                      ? "bg-raised"
                      : "bg-transparent hover:bg-raised/50"
                  )}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-background">
                    {initial(c.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base">{c.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {lastLabel(c.last_entry_on, t)}
                    </span>
                  </span>
                  <span
                    data-roll={`bal-${c.id}`}
                    className="text-lg font-light"
                  >
                    {balanceText(c, t)}
                  </span>
                </button>
              ))}
            </>
          )}
          {list.isError && <LoadError onRetry={() => list.refetch()} />}
          {list.data && shown.length === 0 && (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              {q || show !== "sab" ? t("khata.noneFound") : t("khata.noneYet")}
            </p>
          )}
          <div className="mt-auto flex justify-between border-t border-line px-3 pt-3.5 pb-1 text-sm text-muted-foreground">
            <span>{t("khata.total")}</span>
            <span data-roll="khata-total" className="text-foreground">
              {inr(summary.data?.total_outstanding)}
            </span>
          </div>
        </section>
      )}

      {sel && (!narrow || single) ? (
        <CustomerLedger
          key={sel.id}
          sel={sel}
          onBack={narrow ? () => setOpened(false) : undefined}
          onEdit={() => setEditing(sel)}
          onWrite={setWriting}
        />
      ) : !narrow ? (
        <section
          data-panel
          data-flip-id="main-card"
          data-shape=""
          className="grid min-h-[320px] place-items-center rounded-[32px] bg-card p-7 text-center text-muted-foreground"
        >
          {selected.isError ? (
            <LoadError onRetry={() => selected.refetch()} />
          ) : list.data && shown.length === 0 ? (
            t("khata.pickOrAdd")
          ) : null}
        </section>
      ) : null}

      <FormDialog open={editing !== null} onClose={() => setEditing(null)}>
        {editing !== null && (
          <CustomerForm
            key={editing === "new" ? "" : editing.id}
            item={editing === "new" ? null : editing}
            onDone={(id) => {
              setEditing(null)
              if (id === null) {
                setCustomerId(null)
                setOpened(false)
              } else if (editing === "new") pick(id)
            }}
          />
        )}
      </FormDialog>
      <FormDialog open={writing !== null} onClose={() => setWriting(null)}>
        {writing !== null && sel && (
          <EntryForm
            who={sel}
            start={writing}
            onDone={() => setWriting(null)}
          />
        )}
      </FormDialog>
    </div>
  )
}

const balanceText = (c: Party, t: (k: string) => string) =>
  (c.balance ?? 0) <= 0 ? t("khata.clear") : inr(c.balance)

function CustomerLedger({
  sel,
  onBack,
  onEdit,
  onWrite,
}: {
  sel: Party
  /** Phones: back to the customer list. */
  onBack?: () => void
  onEdit: () => void
  onWrite: (kind: Money) => void
}) {
  const { t, locale } = useI18n()
  const { go, run } = useShell()
  const [kind, setKind] = React.useState<Money | "sab">("sab")
  const [range, setRange] = React.useState<Range>(null)
  const [page, setPage] = React.useState(1)
  const { phone, cw, compact } = useLayout()
  const ref = React.useRef<HTMLElement>(null)
  const box = useNotchBox(ref)
  const ledger = useLedger(sel.id, {
    kind: kind === "sab" ? "CREDIT_GIVEN,PAYMENT_RECEIVED,REVERSAL" : kind,
    page,
    ...rangeParams(range),
  })
  const rows = (ledger.data?.results ?? []).map((e) => entryView(e, t, locale))
  const pages = pagesOf(ledger.data?.count, SIZE.table)
  const { capture } = useListMotion(ref, [rows.map((e) => e.id).join()])
  const owed = sel.balance ?? 0
  const undo = (id: number) =>
    run(() => write.undo(id))
      .then(toasted(t("toast.undone")))
      .catch((e) => toast.error(errorText(e, t)))
  const kinds = [
    { value: "sab" as const, label: t("khata.kind.all") },
    ...(["CREDIT_GIVEN", "PAYMENT_RECEIVED"] as const).map((k) => ({
      value: k,
      label: (
        <span className="flex items-center gap-2">
          <Dot
            color={
              k === "CREDIT_GIVEN"
                ? "var(--chart-udhaar)"
                : "var(--chart-vasooli)"
            }
            size={8}
          />
          {t(`kind.${k}`)}
        </span>
      ),
    })),
  ]
  const filters = (
    <>
      <Segmented
        label={t("col.kind")}
        options={kinds}
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
        <Tip label={t("khata.back")}>
          <button
            type="button"
            aria-label={t("khata.back")}
            onClick={onBack}
            className={cn(
              "absolute top-[10px] left-[10px] grid cursor-pointer place-items-center rounded-full bg-raised transition-transform duration-150 active:scale-[0.94]",
              phone ? "size-11" : "size-[52px]"
            )}
          >
            <ChevronIcon left size={18} />
          </button>
        </Tip>
      )}
      <div
        className="min-h-[52px] min-w-0"
        style={clearNotch(box, phone, phone ? 20 : 28, onBack ? Infinity : 140)}
      >
        <h2
          data-roll="card-title"
          className={cn(
            "truncate font-light tracking-[-0.02em]",
            phone ? "text-[28px]" : compact ? "text-[32px]" : "text-[40px]"
          )}
        >
          {sel.name}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t("customer.aliases")}
          </span>
          {sel.aliases?.length ? (
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
          <FilterButton active={kind !== "sab" || range !== null}>
            {filters}
          </FilterButton>
        )}
        <Pager
          page={page}
          pages={pages}
          onPage={(p) => (capture(), setPage(p))}
        />
        <RoundButton
          title={t("stock.edit", { name: sel.name })}
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
            {phone ? t("kind.CREDIT_GIVEN") : t("khata.writeCredit")}
          </button>
          <Tip label={owed <= 0 ? t("khata.nothingOwed") : undefined}>
            <span
              tabIndex={owed <= 0 ? 0 : undefined}
              className={cn("flex", phone && "flex-1")}
            >
              <button
                type="button"
                onClick={() => onWrite("PAYMENT_RECEIVED")}
                disabled={owed <= 0}
                className={cn(
                  "flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full bg-raised px-5 text-sm transition-transform duration-150 active:scale-[0.97] disabled:cursor-default disabled:opacity-40 disabled:active:scale-100",
                  phone && "w-full"
                )}
              >
                <Dot color="var(--chart-vasooli)" />
                {phone ? t("kind.PAYMENT_RECEIVED") : t("khata.writePayment")}
              </button>
            </span>
          </Tip>
          <Tip label={t("dash.speak")}>
            <button
              type="button"
              onClick={() => go("bolo")}
              aria-label={t("dash.speak")}
              className="flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full border border-line px-5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-raised hover:text-foreground"
            >
              <MicIcon size={16} />
              {!phone && t("dash.speak")}
            </button>
          </Tip>
        </div>
        <div className={cn(!phone && "ml-auto text-right")}>
          <p
            data-roll="big"
            className={cn(
              "leading-none font-light tracking-[-0.03em]",
              phone ? "text-5xl" : compact ? "text-[56px]" : "text-[64px]"
            )}
          >
            {inr(owed)}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {owed > 0 ? t("khata.toCollect") : t("khata.settled")}
          </p>
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
            <span>{t("col.date")}</span>
            <span>{t("col.kind")}</span>
            <span>{t("col.source")}</span>
            <span className="text-right">{t("col.amount")}</span>
            <span className="text-right">{t("col.balance")}</span>
            <span />
          </div>
        )}
        {rows.map((e) =>
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
                    {t("khata.runningShort", { amount: e.running })}
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
        {ledger.isError && <LoadError onRetry={() => ledger.refetch()} />}
        {ledger.data && rows.length === 0 && (
          <p className="px-4 py-7 text-sm text-muted-foreground">
            {kind !== "sab" || range
              ? t("khata.noneInFilter")
              : t("khata.noEntriesYet")}
          </p>
        )}
      </div>
    </section>
  )
}

function EntryForm({
  who,
  start,
  onDone,
}: {
  who: Party
  start: Money
  onDone: () => void
}) {
  const { t } = useI18n()
  const { run } = useShell()
  const [kind, setKind] = React.useState(start)
  const [amount, setAmount] = React.useState("")
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const owed = who.balance ?? 0
  const val = Math.max(0, Math.round(Number(amount) || 0))
  const paying = kind === "PAYMENT_RECEIVED"
  const next = owed + (paying ? -val : val)
  const over = paying && val > owed
  const money = (["CREDIT_GIVEN", "PAYMENT_RECEIVED"] as const).map((k) => ({
    value: k,
    label: (
      <span className="flex items-center gap-2">
        <Dot
          color={
            k === "CREDIT_GIVEN"
              ? "var(--chart-udhaar)"
              : "var(--chart-vasooli)"
          }
          size={8}
        />
        {t(`kind.${k}`)}
      </span>
    ),
  }))

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (val <= 0 || over) return
    setBusy(true)
    setError("")
    try {
      await run(() => write.addEntry({ kind, party: who.id, amount: val }))
      toast.success(
        t(`toast.entry.${kind}`, { name: who.name, amount: inr(val) })
      )
      onDone()
    } catch (err) {
      setError(errorText(err, t, { amount: inr(owed) }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <Dialog.Title className="text-2xl font-normal">{who.name}</Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {owed > 0
            ? t("khata.owesNow", { amount: inr(owed) })
            : t("khata.clearNow")}
        </Dialog.Description>
      </div>
      <Segmented
        label={t("khata.whatToWrite")}
        options={money}
        value={kind}
        onChange={setKind}
        className="w-full bg-raised p-1.5"
        itemClassName="flex-1 justify-center"
      />
      <label className="flex flex-col gap-2">
        <span className="text-[13px] text-muted-foreground">
          {t("col.amount")}
        </span>
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
              {t("khata.payAll", { amount: inr(owed) })}
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
          t("error.OVERPAYMENT", { amount: inr(owed) })
        ) : (
          <>
            <span>{t("khata.newBalance")}</span>
            <span className="text-foreground">
              {next <= 0 ? t("khata.settledShort") : inr(next)}
            </span>
          </>
        )}
      </p>
      <FormError error={error} />
      <FormActions
        busy={busy}
        submit={
          <Swap on={paying} off={t("khata.writeCredit")}>
            {t("khata.writePayment")}
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

/** Add or edit a customer. `onDone(id)`: the saved customer, or null once deleted. */
function CustomerForm({
  item,
  onDone,
}: {
  item: Party | null
  onDone: (id: number | null) => void
}) {
  const { t } = useI18n()
  const { run } = useShell()
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const owed = item?.balance ?? 0
  const clear = item ? owed <= 0 : false

  const save = async (work: () => Promise<number | null>, name?: string) => {
    setBusy(true)
    setError("")
    try {
      onDone(await run(work))
    } catch (err) {
      setError(errorText(err, t, { name }))
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
            {t("khata.deleteBody")}
          </Dialog.Description>
        </div>
        <FormError error={error} />
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            save(() =>
              write
                .deleteParty(item.id)
                .then(toasted(t("toast.removed", { name: item.name })))
                .then(() => null)
            )
          }
          className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-danger-soft text-base font-medium text-black transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
        >
          <TrashIcon size={18} />
          {t("form.confirmDelete")}
        </button>
      </div>
    )

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const aliases = parseAliases(String(f.get("aliases")))
    if (item)
      return save(() =>
        write
          .saveParty(
            {
              name: item.name,
              aliases,
              kind: "CUSTOMER",
              is_active: item.is_active ?? true,
            },
            item.id
          )
          .then(toasted(t("toast.updated", { name: item.name })))
          .then((p) => p.id)
      )
    const name = String(f.get("name")).trim().replace(/\s+/g, " ")
    if (!name) return setError(t("form.nameMissing"))
    const opening = Number(f.get("opening"))
    save(async () => {
      const party = await write.saveParty({ name, aliases, kind: "CUSTOMER" })
      if (opening > 0)
        await write.addEntry({
          kind: "CREDIT_GIVEN",
          party: party.id,
          amount: opening,
        })
      toast.success(t("toast.added", { name }))
      return party.id
    }, name)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <Dialog.Title className="text-2xl font-normal">
          {item ? item.name : t("khata.new")}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {!item
            ? t("khata.newBody")
            : clear
              ? t("khata.editBody")
              : t("khata.editBodyOwing", { amount: inr(owed) })}
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
            placeholder={t("khata.namePlaceholder")}
            onChange={() => setError("")}
            className={FIELD}
            aria-invalid={!!error}
          />
        </label>
      )}
      <label className="flex flex-col gap-2">
        <span className="text-[13px] text-muted-foreground">
          {t("khata.aliasesLabel")}
        </span>
        <input
          name="aliases"
          maxLength={120}
          autoFocus={!!item}
          defaultValue={item?.aliases?.join(", ")}
          placeholder={t("khata.aliasesPlaceholder")}
          className={FIELD}
        />
        <span className="px-1 text-xs text-muted-foreground">
          {t("khata.aliasesHint")}
        </span>
      </label>
      {!item && (
        <label className="flex flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">
            {t("khata.opening")}
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
      <FormError error={error} />
      <FormActions
        busy={busy}
        submit={item ? t("form.save") : t("form.add")}
        onDelete={clear ? () => setConfirming(true) : undefined}
      />
    </form>
  )
}
