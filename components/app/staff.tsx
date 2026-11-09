"use client"

import * as React from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Dialog } from "radix-ui"

import { ArrowIcon, ChevronIcon, PencilIcon } from "@/components/app/icons"
import { ATT_DAYS, dateOf, inr, type Book } from "@/components/app/khata-data"
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
import { CornerButton, Dot, Swap } from "@/components/app/parts"
import { Segmented } from "@/components/segmented"
import { reduceMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"

type Person = Book["staff"][number]

type Show = "sab" | "advance" | "bina"
const SHOW: { value: Show; label: string }[] = [
  { value: "sab", label: "Sab" },
  { value: "advance", label: "Advance liya" },
  { value: "bina", label: "Bina advance" },
]
const CARDS = 4
const COLS = "grid grid-cols-[minmax(0,1.6fr)_90px_110px_120px_36px_36px] gap-4"

export function StaffScreen({
  book,
  saveStaff,
  markPresent,
  giveAdvance,
}: {
  book: Book
  saveStaff: (name: string, salary: number) => void
  markPresent: (name: string) => void
  giveAdvance: (name: string, val: number) => void
}) {
  const [query, setQuery] = React.useState("")
  const [show, setShow] = React.useState<Show>("sab")
  const [page, setPage] = React.useState(1)
  const [view, setView] = React.useState<View>("cards")
  const [editing, setEditing] = React.useState<Person | "new" | null>(null)
  const [ledgerOf, setLedgerOf] = React.useState<string | null>(null)
  const [lending, setLending] = React.useState<Person | null>(null)
  const { phone, narrow, compact } = useLayout()
  const open = book.staff.find((s) => s.name === ledgerOf)
  const q = query.trim().toLowerCase()
  const list = book.staff.filter(
    (s) =>
      (show === "sab" || (show === "advance") === s.advance > 0) &&
      (!q || s.name.toLowerCase().includes(q))
  )
  const size = view === "cards" ? CARDS : PAGE
  const { pages, current, shown } = paginate(list, page, size)
  const due = book.staff.reduce((a, s) => a + Math.max(0, s.pay - s.advance), 0)

  return (
    <div className={cn("flex flex-col", !compact && "h-full")}>
      <LedgerCard
        flip="main"
        className={cn(!phone && "pb-[92px]", !compact && "min-h-0 flex-1")}
        title="Staff"
        sub={`${book.staff.length} log · ₹${due.toLocaleString("en-IN")} baaki`}
        controls={
          <>
            <SearchField
              value={query}
              onChange={(v) => (setQuery(v), setPage(1))}
              placeholder="Naam dhoondo"
              label="Staff mein dhoondo"
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
            <AddButton label="Naya staff" onClick={() => setEditing("new")} />
          </>
        }
        compactControls={
          <>
            <NotchSearch
              value={query}
              onChange={(v) => (setQuery(v), setPage(1))}
              placeholder="Naam dhoondo"
              label="Staff mein dhoondo"
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
            <AddButton label="Naya staff" onClick={() => setEditing("new")} />
          </>
        }
        toolbar={null}
      >
        {view === "table" && phone ? (
          <div className="flex flex-col gap-1.5">
            {shown.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-3 rounded-[18px] bg-background py-3 pr-2.5 pl-3"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-raised">
                  {s.initial}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-sm font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.att}/14 din · {s.adv} advance
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[15px] font-light tabular-nums">
                    {s.due}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    baaki
                  </span>
                </span>
                <button
                  type="button"
                  title={`${s.name} ka poora hisaab`}
                  aria-label={`${s.name} ka poora hisaab`}
                  onClick={() => setLedgerOf(s.name)}
                  className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-raised"
                >
                  <ArrowIcon size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : view === "table" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto overscroll-contain">
            <div
              className={cn(
                COLS,
                "min-w-[620px] pr-2.5 pl-4 text-xs font-medium text-muted-foreground"
              )}
            >
              <span>Naam</span>
              <span className="text-right">Haazri</span>
              <span className="text-right">Advance</span>
              <span className="text-right">Baaki tankhwah</span>
              <span />
              <span />
            </div>
            {shown.map((s) => (
              <div
                key={s.name}
                className={cn(
                  COLS,
                  "group min-w-[620px] items-center rounded-[18px] bg-background py-3 pr-2.5 pl-4 transition-colors duration-150 hover:bg-raised"
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-raised group-hover:bg-card">
                    {s.initial}
                  </span>
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="truncate text-sm font-medium">
                      {s.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.salary} / mahina
                    </span>
                  </span>
                </span>
                <span className="text-right text-sm tabular-nums">
                  {s.att} <span className="text-muted-foreground">/ 14</span>
                </span>
                <span className="text-right text-[15px] font-light tabular-nums">
                  {s.adv}
                </span>
                <span className="text-right text-[15px] font-light tabular-nums">
                  {s.due}
                </span>
                <button
                  type="button"
                  title={`${s.name} ka poora hisaab`}
                  aria-label={`${s.name} ka poora hisaab`}
                  onClick={() => setLedgerOf(s.name)}
                  className="grid size-9 cursor-pointer place-items-center rounded-full bg-raised transition-transform duration-200 group-hover:bg-card hover:rotate-45"
                >
                  <ArrowIcon size={14} />
                </button>
                <button
                  type="button"
                  title={`${s.name} badlo`}
                  aria-label={`${s.name} badlo`}
                  onClick={() => setEditing(s)}
                  className="grid size-9 cursor-pointer place-items-center rounded-full bg-raised group-hover:bg-card"
                >
                  <PencilIcon size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-[10px]",
              !narrow && "grid-cols-2",
              !compact && "min-h-0 flex-1 grid-rows-2"
            )}
          >
            {shown.map((s) => (
              <StaffCard
                key={s.name}
                s={s}
                onEdit={() => setEditing(s)}
                onLedger={() => setLedgerOf(s.name)}
                onPresent={() => markPresent(s.name)}
                onAdvance={() => setLending(s)}
              />
            ))}
          </div>
        )}
        {list.length === 0 && (
          <p className="px-1 py-7 text-sm text-muted-foreground">
            Koi staff nahi mila.
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
      <FormDialog open={editing !== null} onClose={() => setEditing(null)}>
        {editing !== null && (
          <StaffForm
            key={editing === "new" ? "" : editing.name}
            person={editing === "new" ? null : editing}
            taken={book.staff.map((s) => s.name)}
            onSave={(name, salary) => (
              saveStaff(name, salary),
              setEditing(null)
            )}
          />
        )}
      </FormDialog>
      <FormDialog open={lending !== null} onClose={() => setLending(null)}>
        {lending && (
          <AdvanceForm
            person={lending}
            onSave={(val) => (giveAdvance(lending.name, val), setLending(null))}
          />
        )}
      </FormDialog>
      <FormDialog drawer open={!!open} onClose={() => setLedgerOf(null)}>
        {open && <StaffLedger key={open.name} person={open} />}
      </FormDialog>
    </div>
  )
}

/** Oldest first: every month the 15-day demo window touches. */
const MONTHS = [
  ...new Map(
    Array.from({ length: 15 }, (_, d) => {
      const t = dateOf(14 - d)
      return [
        `${t.getFullYear()}-${t.getMonth()}`,
        { y: t.getFullYear(), m: t.getMonth() },
      ] as const
    })
  ).values(),
]
const WEEKDAYS = ["So", "Ma", "Bu", "Gu", "Shu", "Sha", "Ra"]
type Mark = "present" | "absent" | "none" | "future"

function StaffLedger({ person }: { person: Person }) {
  const [mi, setMi] = React.useState(MONTHS.length - 1)
  const { y, m } = MONTHS[mi]
  const today = dateOf(0).getTime()
  const total = new Date(y, m + 1, 0).getDate()
  const lead = (new Date(y, m, 1).getDay() + 6) % 7
  const days = Array.from({ length: total }, (_, i) => {
    const d = Math.round((today - new Date(y, m, i + 1).getTime()) / 86_400_000)
    const mark: Mark =
      d < 0
        ? "future"
        : d >= ATT_DAYS
          ? "none"
          : person.present.includes(d)
            ? "present"
            : "absent"
    return { day: i + 1, d, mark }
  })
  const present = days.filter((x) => x.mark === "present").length
  const recorded = days.filter(
    (x) => x.mark === "present" || x.mark === "absent"
  ).length
  const moves = person.moves.filter((e) => {
    const t = dateOf(e.d)
    return t.getFullYear() === y && t.getMonth() === m
  })
  const advance = moves
    .filter((e) => !e.faded)
    .reduce((a, e) => a + e.rupees, 0)
  const label = new Date(y, m).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  })

  // Lead Flow's drawer timeline: on open (after the slide) and on each month, rows fade up in turn
  // and the calendar's days pop in.
  const ref = React.useRef<HTMLDivElement>(null)
  const opened = React.useRef(false)
  useGSAP(
    () => {
      if (reduceMotion()) return
      const delay = opened.current ? 0 : 0.12
      opened.current = true
      gsap.fromTo(
        ref.current!.querySelectorAll("[data-tl-item]"),
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power3.out",
          delay,
          stagger: 0.05,
          clearProps: "opacity,transform",
        }
      )
      gsap.fromTo(
        ref.current!.querySelectorAll("[data-tl-dot]"),
        { scale: 0.3, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.45,
          ease: "back.out(2.5)",
          delay,
          stagger: 0.012,
          clearProps: "opacity,transform",
        }
      )
    },
    { scope: ref, dependencies: [mi] }
  )

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <div className="flex items-center gap-3.5 pr-12">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-raised text-xl">
          {person.initial}
        </span>
        <div className="min-w-0">
          <Dialog.Title className="truncate text-[28px] font-light">
            {person.name}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            Tankhwah {person.salary} / mahina
          </Dialog.Description>
        </div>
      </div>

      <div
        role="group"
        aria-label="Mahina chuniye"
        className="flex h-[52px] items-center justify-between rounded-full bg-background p-1.5"
      >
        <MonthButton
          label="Pichhla mahina"
          disabled={mi === 0}
          onClick={() => setMi(mi - 1)}
        >
          <ChevronIcon left size={16} />
        </MonthButton>
        <span aria-live="polite" className="text-base">
          {label}
        </span>
        <MonthButton
          label="Agla mahina"
          disabled={mi === MONTHS.length - 1}
          onClick={() => setMi(mi + 1)}
        >
          <ChevronIcon size={16} />
        </MonthButton>
      </div>

      <div className="grid grid-cols-2 gap-[10px]">
        <Tile
          value={`${present} din`}
          label={
            recorded
              ? `haazri · ${recorded} din ka record`
              : "haazri · koi record nahi"
          }
          raised
        />
        <Tile value={inr(advance)} label="advance is mahine" raised />
        <Tile value={person.salary} label="tankhwah" raised />
        <Tile
          value={inr(person.pay - advance)}
          label="baaki, advance katke"
          paper
        />
      </div>

      <section
        aria-label="Haazri"
        className="flex flex-col gap-3 rounded-[28px] bg-background p-4"
      >
        <div className="flex items-baseline justify-between px-1">
          <h3 className="text-base">Haazri</h3>
          <span className="text-sm text-muted-foreground tabular-nums">
            {present} / {recorded} din
          </span>
        </div>
        <div className="grid grid-cols-7 gap-y-1.5 text-center">
          {WEEKDAYS.map((w) => (
            <span key={w} className="pb-1 text-[11px] text-muted-foreground">
              {w}
            </span>
          ))}
          {days.map((x, i) => (
            <span
              key={x.day}
              data-tl-dot
              style={i === 0 ? { gridColumnStart: lead + 1 } : undefined}
              title={
                x.mark === "present"
                  ? "Aaye"
                  : x.mark === "absent"
                    ? "Nahi aaye"
                    : x.mark === "none"
                      ? "Record nahi"
                      : undefined
              }
              className={cn(
                "mx-auto grid aspect-square w-full max-w-10 place-items-center rounded-full text-sm tabular-nums",
                x.mark === "present" && "bg-cyan text-black",
                x.mark === "absent" && "bg-raised",
                x.mark === "none" &&
                  "border border-dashed border-line text-muted-foreground",
                x.mark === "future" && "text-muted-foreground opacity-40",
                x.d === 0 &&
                  "ring-1 ring-lime ring-offset-2 ring-offset-background"
              )}
            >
              {x.day}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 px-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Dot color="var(--cyan)" size={8} />
            Aaye
          </span>
          <span className="flex items-center gap-1.5">
            <Dot color="var(--raised)" size={8} />
            Nahi aaye
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full border border-dashed border-muted-foreground" />
            Record nahi
          </span>
        </div>
      </section>

      <section
        aria-label="Is mahine ka hisaab"
        className="flex flex-col gap-1.5"
      >
        <h3 className="mb-1.5 text-sm text-muted-foreground">
          Is mahine ka hisaab
        </h3>
        {moves.map((e) => (
          <div
            key={e.id}
            data-tl-item
            className={cn(
              "flex items-center gap-3 rounded-[18px] bg-background px-4 py-3",
              e.faded && "opacity-50"
            )}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Dot color={e.dot} size={7} />
                {e.kindLabel}
              </span>
              <span className="text-xs text-muted-foreground">
                {e.idLabel} · {e.date} · {e.src}
                {e.tag && ` · ${e.tag}`}
              </span>
            </span>
            <span
              className={cn(
                "text-[15px] font-light tabular-nums",
                e.struck && "line-through"
              )}
            >
              {e.amt}
            </span>
          </div>
        ))}
        {moves.length === 0 && (
          <p className="rounded-[18px] bg-background px-4 py-5 text-sm text-muted-foreground">
            Is mahine koi advance nahi.
          </p>
        )}
      </section>
    </div>
  )
}

function MonthButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-10 cursor-pointer place-items-center rounded-full bg-lime text-black transition-transform duration-150 active:scale-[0.94] disabled:cursor-default disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function StaffCard({
  s,
  onEdit,
  onLedger,
  onPresent,
  onAdvance,
}: {
  s: Person
  onEdit: () => void
  onLedger: () => void
  onPresent: () => void
  onAdvance: () => void
}) {
  return (
    <div className="relative min-h-0 rounded-[32px] bg-raised">
      <div className="flex h-full flex-col justify-between gap-3 overflow-y-auto rounded-[32px] p-6 short:gap-2 short:p-5">
        <div className="flex items-center gap-3 pr-24">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-card text-lg short:size-10">
            {s.initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-2xl font-light short:text-xl">
              {s.name}
            </p>
            <p className="text-sm text-muted-foreground">
              Tankhwah {s.salary} / mahina
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-[10px]">
          <Tile
            value={String(s.att)}
            label="din haazri · 14 din"
            roll={`${s.name}-att`}
          />
          <Tile value={s.adv} label="advance liya" roll={`${s.name}-adv`} />
          <Tile
            value={s.due}
            label="baaki tankhwah"
            paper
            roll={`${s.name}-due`}
          />
        </div>
        <div role="group" aria-label="Haazri, pichhle 14 din">
          <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1">
            {s.days.map((d) => (
              <div key={d.label} className="flex flex-col items-center gap-1.5">
                <span
                  title={`${d.label}: ${d.present ? "aaye" : "nahi aaye"}`}
                  className={cn(
                    "aspect-square w-full max-w-6 rounded-full",
                    d.present ? "bg-cyan" : "bg-card"
                  )}
                />
                <span className="text-[10px] text-muted-foreground short:hidden">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-[10px]">
          <button
            type="button"
            onClick={onPresent}
            aria-pressed={s.today}
            title={s.today ? "Aaj ki haazri hatao" : "Aaj ki haazri lagao"}
            className={cn(
              "h-10 cursor-pointer rounded-full px-4 text-sm transition-colors duration-150 short:h-9",
              s.today ? "bg-lime text-black" : "bg-card"
            )}
          >
            <Swap on={s.today} off="Haazri lagao">
              Aaj aaye ✓
            </Swap>
          </button>
          <button
            type="button"
            onClick={onAdvance}
            disabled={s.pay - s.advance <= 0}
            title={
              s.pay - s.advance <= 0
                ? "Poori tankhwah advance mein ja chuki"
                : undefined
            }
            className="h-10 cursor-pointer rounded-full bg-card px-4 text-sm disabled:cursor-default disabled:opacity-40 short:h-9"
          >
            Advance diya
          </button>
          <button
            type="button"
            className="h-10 cursor-pointer rounded-full bg-card px-4 text-sm short:h-9"
          >
            Tankhwah di
          </button>
          <button
            type="button"
            onClick={onLedger}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-full bg-card px-4 text-sm short:h-9"
          >
            Poora hisaab
            <ArrowIcon size={14} />
          </button>
        </div>
      </div>
      <CornerButton
        title={`${s.name} badlo`}
        bg="var(--card)"
        className="bg-raised"
        onClick={onEdit}
      >
        <PencilIcon size={16} />
      </CornerButton>
    </div>
  )
}

function Tile({
  value,
  label,
  paper,
  raised,
  roll,
}: {
  value: string
  label: string
  /** data-roll key, when the figure changes in place */
  roll?: string
  paper?: boolean
  /** for tiles sitting on a card-coloured surface */
  raised?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-3xl px-4 py-3 short:py-2",
        paper ? "bg-paper text-black" : raised ? "bg-raised" : "bg-card"
      )}
    >
      <p
        data-roll={roll}
        className="text-[clamp(22px,2vw,28px)] leading-tight font-light whitespace-nowrap"
      >
        {value}
      </p>
      <p
        className={cn(
          "text-xs",
          paper ? "text-[#434343]" : "text-muted-foreground"
        )}
      >
        {label}
      </p>
    </div>
  )
}

function StaffForm({
  person,
  taken,
  onSave,
}: {
  person: Person | null
  taken: string[]
  onSave: (name: string, salary: number) => void
}) {
  const [error, setError] = React.useState("")

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const salary = Number(f.get("salary"))
    if (person) return onSave(person.name, salary)
    const name = String(f.get("name")).trim().replace(/\s+/g, " ")
    if (!name) return setError("Naam likhiye.")
    if (taken.some((t) => t.toLowerCase() === name.toLowerCase()))
      return setError(`"${name}" pehle se staff mein hai.`)
    onSave(name, salary)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <Dialog.Title className="text-2xl font-normal">
          {person ? person.name : "Naya staff"}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {person
            ? "Mahine ki tankhwah badliye. Haazri aur advance entries se hi badalte hain."
            : "Dukaan ke staff mein jodiye."}
        </Dialog.Description>
      </div>
      {!person && (
        <label className="flex flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">Naam</span>
          <input
            name="name"
            required
            maxLength={30}
            autoFocus
            placeholder="Jaise Mohan"
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
          Tankhwah (₹ / mahina)
        </span>
        <input
          name="salary"
          type="number"
          required
          min={0}
          max={1000000}
          defaultValue={person?.pay ?? 8000}
          inputMode="numeric"
          autoFocus={!!person}
          className={FIELD}
        />
      </label>
      <FormActions submit={person ? "Save karo" : "Jodo"} />
    </form>
  )
}

function AdvanceForm({
  person,
  onSave,
}: {
  person: Person
  onSave: (val: number) => void
}) {
  const [amount, setAmount] = React.useState("")
  const left = Math.max(0, person.pay - person.advance)
  const val = Math.max(0, Math.round(Number(amount) || 0))
  const over = val > left

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (val > 0 && !over) onSave(val)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <Dialog.Title className="text-2xl font-normal">
          {person.name} ko advance
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          Tankhwah {person.salary}, ab tak {person.adv} advance liya.
        </Dialog.Description>
      </div>
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
            max={Math.max(1, left)}
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
          `Tankhwah mein sirf ${inr(left)} baaki hai, usse zyada advance nahi de sakte.`
        ) : (
          <>
            <span>Baaki tankhwah</span>
            <span className="text-foreground">{inr(left - val)}</span>
          </>
        )}
      </p>
      <FormActions submit="Advance likho" />
    </form>
  )
}
