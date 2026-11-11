"use client"

import * as React from "react"
import { toast } from "sonner"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Dialog, DropdownMenu } from "radix-ui"
import {
  CalendarCheckIcon,
  CalendarDaysIcon,
  CheckIcon,
  LayersIcon,
  HandCoinsIcon,
  WalletIcon,
} from "lucide-react"

import {
  SIZE,
  useDebounced,
  useStaff,
  useStaffMonth,
  useStaffMoves,
  useSummary,
  write,
  type DayMark,
} from "@/components/app/data"
import { dayLabel, errorText, useI18n } from "@/components/app/i18n"
import { ChevronIcon, PencilIcon, TrashIcon } from "@/components/app/icons"
import { entryView, KIND_DOT } from "@/components/app/khata-data"
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
import {
  CornerButton,
  Dot,
  Tip,
  toasted,
  usePending,
} from "@/components/app/parts"
import {
  Face,
  PhotoField,
  photoSrc,
  savePhoto,
  type PhotoChange,
} from "@/components/app/photo"
import { useShell } from "@/components/app/shell"
import { Segmented } from "@/components/segmented"
import { inr, isoDay, type Party } from "@/lib/api"
import { reduceMotion } from "@/lib/motion"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type Show = "sab" | "yes" | "no"
const SHOW: { value: Show; key: string }[] = [
  { value: "sab", key: "staff.show.all" },
  { value: "yes", key: "staff.show.advance" },
  { value: "no", key: "staff.show.none" },
]
const COLS = "grid grid-cols-[minmax(0,1.6fr)_90px_110px_120px_36px] gap-4"
// The name is the button that opens someone's full account; its overlay stretches over the whole card or row, so a
// click anywhere opens it, while the card's own buttons sit above the overlay (relative z-10).
const OPENS = (round: string) =>
  `cursor-pointer text-left outline-none after:absolute after:inset-0 ${round} focus-visible:after:ring-2 focus-visible:after:ring-ring`

/** What can still be handed over this month, as advance or salary (the server refuses more). */
const salaryLeft = (p: Party) =>
  Math.max(
    0,
    (p.monthly_salary ?? 0) -
      (p.staff_due?.advances ?? 0) -
      (p.staff_due?.salary_paid ?? 0)
  )

const lastDays = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return isoDay(d)
  })

type Money = "STAFF_ADVANCE" | "SALARY_PAID"

export function StaffScreen() {
  const { t } = useI18n()
  const { run } = useShell()
  const [query, setQuery] = React.useState("")
  const [show, setShow] = React.useState<Show>("sab")
  const [page, setPage] = React.useState(1)
  const [view, setView] = React.useState<View>("cards")
  const [editing, setEditing] = React.useState<Party | "new" | null>(null)
  const [ledgerOf, setLedgerOf] = React.useState<Party | null>(null)
  const [paying, setPaying] = React.useState<{
    person: Party
    kind: Money
  } | null>(null)
  const { phone, narrow, compact } = useLayout()
  const q = useDebounced(query.trim())
  const size = view === "cards" ? SIZE.staffCards : SIZE.table
  const list = useStaff({
    q: q || undefined,
    advance: show === "sab" ? undefined : show,
    page,
    page_size: size,
  })
  const summary = useSummary()
  const shown = list.data?.results ?? []
  const count = list.data?.count ?? 0
  const pages = pagesOf(count, size)
  const due = (summary.data?.staff_dues ?? []).reduce(
    (a, s) => a + Math.max(0, s.due),
    0
  )
  const showOptions = SHOW.map((s) => ({ value: s.value, label: t(s.key) }))
  const markPresent = (s: Party) =>
    run(() =>
      s.present_today
        ? write.undo(s.present_today)
        : write.addEntry({ kind: "ATTENDANCE", party: s.id })
    )
      .then(
        toasted(
          t(s.present_today ? "toast.unmarked" : "toast.entry.ATTENDANCE", {
            name: s.name,
          })
        )
      )
      .catch((e) => toast.error(errorText(e, t)))

  return (
    <div className={cn("flex flex-col", !compact && "h-full")}>
      <LedgerCard
        flip="main"
        className={cn(!phone && "pb-[92px]", !compact && "min-h-0 flex-1")}
        title={t("staff.title")}
        sub={t("staff.sub", {
          count: summary.data?.staff_dues.length ?? 0,
          due: inr(due),
        })}
        controls={
          <>
            <SearchField
              value={query}
              onChange={(v) => (setQuery(v), setPage(1))}
              placeholder={t("staff.search")}
              label={t("staff.searchLabel")}
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
              label={t("staff.new")}
              onClick={() => setEditing("new")}
            />
          </>
        }
        compactControls={
          <>
            <NotchSearch
              value={query}
              onChange={(v) => (setQuery(v), setPage(1))}
              placeholder={t("staff.search")}
              label={t("staff.searchLabel")}
            />
            <FilterButton active={show !== "sab"}>
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
              label={t("staff.new")}
              onClick={() => setEditing("new")}
            />
          </>
        }
        toolbar={null}
      >
        {view === "table" && phone ? (
          <div className="flex flex-col gap-1.5">
            {shown.map((s) => (
              <div
                key={s.id}
                className="relative flex items-center gap-3 rounded-[18px] bg-background py-3 pr-3 pl-3 transition-colors duration-150 hover:bg-raised"
              >
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-raised">
                  <Face
                    name={s.name}
                    src={photoSrc(`parties/${s.id}`, s.photo_key)}
                  />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <button
                    type="button"
                    onClick={() => setLedgerOf(s)}
                    aria-label={t("staff.fullAccount", { name: s.name })}
                    className={cn(
                      "truncate text-sm font-medium",
                      OPENS("after:rounded-[18px]")
                    )}
                  >
                    {s.name}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {t("staff.rowMeta", {
                      days: s.attendance_14d?.length ?? 0,
                      advance: inr(s.staff_due?.advances),
                    })}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[15px] font-light tabular-nums">
                    {inr(salaryLeft(s))}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {t("staff.left")}
                  </span>
                </span>
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
              <span>{t("col.name")}</span>
              <span className="text-right">{t("staff.col.present")}</span>
              <span className="text-right">{t("staff.col.advance")}</span>
              <span className="text-right">{t("staff.col.left")}</span>
              <span />
            </div>
            {shown.map((s) => (
              <div
                key={s.id}
                className={cn(
                  COLS,
                  "group relative min-w-[620px] items-center rounded-[18px] bg-background py-3 pr-2.5 pl-4 transition-colors duration-150 hover:bg-raised"
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-raised group-hover:bg-card">
                    <Face
                      name={s.name}
                      src={photoSrc(`parties/${s.id}`, s.photo_key)}
                    />
                  </span>
                  <span className="flex min-w-0 flex-col gap-px">
                    <button
                      type="button"
                      onClick={() => setLedgerOf(s)}
                      aria-label={t("staff.fullAccount", { name: s.name })}
                      className={cn(
                        "truncate text-sm font-medium",
                        OPENS("after:rounded-[18px]")
                      )}
                    >
                      {s.name}
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {t("staff.perMonth", { salary: inr(s.monthly_salary) })}
                    </span>
                  </span>
                </span>
                <span className="text-right text-sm tabular-nums">
                  {s.attendance_14d?.length ?? 0}{" "}
                  <span className="text-muted-foreground">/ 14</span>
                </span>
                <span className="text-right text-[15px] font-light tabular-nums">
                  {inr(s.staff_due?.advances)}
                </span>
                <span className="text-right text-[15px] font-light tabular-nums">
                  {inr(salaryLeft(s))}
                </span>
                <Tip label={t("stock.edit", { name: s.name })}>
                  <button
                    type="button"
                    aria-label={t("stock.edit", { name: s.name })}
                    onClick={() => setEditing(s)}
                    className="relative z-10 grid size-9 cursor-pointer place-items-center rounded-full bg-raised group-hover:bg-card coarse:size-11"
                  >
                    <PencilIcon size={14} />
                  </button>
                </Tip>
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
                key={s.id}
                s={s}
                onEdit={() => setEditing(s)}
                onLedger={() => setLedgerOf(s)}
                onPresent={() => markPresent(s)}
                onPay={(kind) => setPaying({ person: s, kind })}
              />
            ))}
          </div>
        )}
        {list.isPending && <Loading />}
        {list.isError && <LoadError onRetry={() => list.refetch()} />}
        {list.data && count === 0 && (
          <p className="px-1 py-7 text-sm text-muted-foreground">
            {t("staff.none")}
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
          <StaffForm
            key={editing === "new" ? "" : editing.id}
            person={editing === "new" ? null : editing}
            onDone={(removed) => {
              setEditing(null)
              if (removed && ledgerOf?.id === removed) setLedgerOf(null)
            }}
          />
        )}
      </FormDialog>
      <FormDialog open={paying !== null} onClose={() => setPaying(null)}>
        {paying && (
          <PayForm
            key={paying.kind}
            person={paying.person}
            kind={paying.kind}
            onDone={() => setPaying(null)}
          />
        )}
      </FormDialog>
      <FormDialog
        drawer
        open={ledgerOf !== null}
        onClose={() => setLedgerOf(null)}
      >
        {ledgerOf && <StaffLedger key={ledgerOf.id} person={ledgerOf} />}
      </FormDialog>
    </div>
  )
}

type Mark = "present" | "half" | "absent" | "none" | "future"

function StaffLedger({ person }: { person: Party }) {
  const { t, locale } = useI18n()
  const today = isoDay()
  const [month, setMonth] = React.useState(today.slice(0, 7))
  const [y, m] = month.split("-").map(Number)
  const first = `${month}-01`
  const last = isoDay(new Date(y, m, 0))
  const data = useStaffMonth(person.id, month)
  const moves = useStaffMoves(person.id, first, last)
  const joined = person.created_at.slice(0, 10)
  const since = [joined, person.first_entry_on ?? joined].sort()[0]
  const present = new Set(data.data?.present_days ?? [])
  const half = new Set(data.data?.half_days ?? [])
  const setDay = useSetDay()
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const days = Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => {
    const iso = isoDay(new Date(y, m - 1, i + 1))
    const mark: Mark =
      iso > today
        ? "future"
        : present.has(iso)
          ? half.has(iso)
            ? "half"
            : "present"
          : iso < joined
            ? "none"
            : "absent"
    return { day: i + 1, iso, mark }
  })
  const recorded = days.filter(
    (x) => x.mark === "present" || x.mark === "half" || x.mark === "absent"
  ).length
  const rows = (moves.data?.results ?? []).map((e) => entryView(e, t, locale))
  const step = (by: number) => {
    const d = new Date(y, m - 1 + by, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }
  const label = new Date(y, m - 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  })
  const s = data.data

  // Lead Flow's drawer timeline: on open (after the slide) and on each month, rows fade up in turn
  // and the calendar's days pop in.
  const ref = React.useRef<HTMLDivElement>(null)
  const opened = React.useRef(false)
  const ready = Boolean(s && moves.data)
  useGSAP(
    () => {
      if (!ready || reduceMotion()) return
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
    { scope: ref, dependencies: [month, ready] }
  )

  return (
    <div ref={ref} className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center gap-3.5 pr-12">
        <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-raised text-xl">
          <Face
            name={person.name}
            src={photoSrc(`parties/${person.id}`, person.photo_key)}
          />
        </span>
        <div className="min-w-0">
          <Dialog.Title className="truncate text-[28px] font-light">
            {person.name}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            {t("staff.salaryLine", { salary: inr(person.monthly_salary) })}
          </Dialog.Description>
        </div>
      </div>

      <div
        role="group"
        aria-label={t("staff.pickMonth")}
        className="flex h-[52px] items-center justify-between rounded-full bg-background p-1.5"
      >
        <MonthButton
          label={t("range.prevMonth")}
          disabled={month <= since.slice(0, 7)}
          onClick={() => step(-1)}
        >
          <ChevronIcon left size={16} />
        </MonthButton>
        <span aria-live="polite" className="text-base">
          {label}
        </span>
        <MonthButton
          label={t("range.nextMonth")}
          disabled={month >= today.slice(0, 7)}
          onClick={() => step(1)}
        >
          <ChevronIcon size={16} />
        </MonthButton>
      </div>

      <div className="grid grid-cols-2 gap-[10px]">
        <Tile
          value={t("staff.days", { count: s?.days_present ?? 0 })}
          label={
            recorded
              ? t("staff.recorded", { count: recorded })
              : t("staff.noRecord")
          }
          raised
        />
        <Tile value={inr(s?.advances)} label={t("staff.advanceMonth")} raised />
        <Tile value={inr(s?.earned)} label={t("staff.earned")} raised />
        <Tile
          value={inr(Math.max(0, s?.due ?? 0))}
          label={t("staff.dueAfter")}
          paper
        />
      </div>

      <section
        aria-label={t("staff.attendance")}
        className="flex flex-col gap-3 rounded-[28px] bg-background p-4"
      >
        <div className="flex items-baseline justify-between px-1">
          <h3 className="text-base">{t("staff.attendance")}</h3>
          <span className="text-sm text-muted-foreground tabular-nums">
            {t("staff.presentOf", {
              present: s?.days_present ?? 0,
              count: recorded,
            })}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-y-3 text-center">
          {t("weekday.short")
            .split(",")
            .map((w) => (
              <span key={w} className="text-[11px] text-muted-foreground">
                {w}
              </span>
            ))}
          {days.map((x, i) => {
            const cell = (
              <span
                data-tl-dot
                style={i === 0 ? { gridColumnStart: lead + 1 } : undefined}
                className={cn(
                  "mx-auto grid aspect-square w-full max-w-8 place-items-center rounded-full text-[13px] tabular-nums",
                  x.mark === "present" && "bg-cyan text-black",
                  x.mark === "half" && cn(HALF_ON_RAISED, "text-black"),
                  x.mark === "absent" && "bg-raised",
                  x.mark === "none" &&
                    "border border-dashed border-line text-muted-foreground",
                  x.mark === "future" && "text-muted-foreground opacity-40",
                  x.iso === today &&
                    "ring-1 ring-lime ring-offset-2 ring-offset-background"
                )}
              >
                {x.day}
              </span>
            )
            const editable =
              x.iso >= editFrom() && x.mark !== "future" && x.mark !== "none"
            return editable ? (
              <DayMenu
                key={x.day}
                on={x.iso}
                current={x.mark as DayMark}
                onPick={(mark) => setDay(person, x.iso, mark)}
                className="mx-auto w-full max-w-8"
                style={i === 0 ? { gridColumnStart: lead + 1 } : undefined}
              >
                {cell}
              </DayMenu>
            ) : (
              <Tip
                key={x.day}
                label={
                  x.mark === "future" ? undefined : t(`staff.mark.${x.mark}`)
                }
              >
                {cell}
              </Tip>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-4 px-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Dot color="var(--cyan)" size={8} />
            {t("staff.mark.present")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", HALF_ON_RAISED)} />
            {t("staff.mark.half")}
          </span>
          <span className="flex items-center gap-1.5">
            <Dot color="var(--raised)" size={8} />
            {t("staff.mark.absent")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full border border-dashed border-muted-foreground" />
            {t("staff.mark.none")}
          </span>
        </div>
      </section>

      {/* The month's entries take the space left and scroll on their own; everything above stays put. */}
      <section
        aria-label={t("staff.monthAccount")}
        className="flex min-h-[160px] flex-1 flex-col gap-1.5"
      >
        <h3 className="mb-1.5 text-sm text-muted-foreground">
          {t("staff.monthAccount")}
        </h3>
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain">
          {rows.map((e) => (
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
          {moves.data && rows.length === 0 && (
            <p className="rounded-[18px] bg-background px-4 py-5 text-sm text-muted-foreground">
              {t("staff.monthNone")}
            </p>
          )}
        </div>
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
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className="grid size-10 cursor-pointer place-items-center rounded-full bg-lime text-black transition-transform duration-150 active:scale-[0.94] disabled:cursor-default disabled:opacity-40"
      >
        {children}
      </button>
    </Tip>
  )
}

// A half day: the dot half filled, on the card's and the calendar's ground.
const HALF_ON_CARD =
  "bg-[linear-gradient(90deg,var(--cyan)_50%,var(--background)_50%)]"
const HALF_ON_RAISED =
  "bg-[linear-gradient(90deg,var(--cyan)_50%,var(--raised)_50%)]"

/** The first day attendance can be changed: the 1st of last month (the server holds the same line). */
const editFrom = () => {
  const now = new Date()
  return isoDay(new Date(now.getFullYear(), now.getMonth() - 1, 1))
}

function useSetDay() {
  const { run } = useShell()
  const { t, locale } = useI18n()
  return (s: Party, on: string, mark: DayMark) =>
    run(() => write.setAttendance(s.id, on, mark))
      .then(
        toasted(
          t("toast.attendanceSet", {
            name: s.name,
            date: dayLabel(on, t, locale),
            mark: t(`staff.mark.${mark}`),
          })
        )
      )
      .catch((e) => toast.error(errorText(e, t)))
}

const DAY_MARKS: DayMark[] = ["present", "half", "absent"]

/** A day you can change: tap it for Present, Half day or Absent. */
function DayMenu({
  on,
  current,
  onPick,
  className,
  style,
  children,
}: {
  on: string
  current: DayMark
  onPick: (mark: DayMark) => void
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  const { t, locale } = useI18n()
  const label = dayLabel(on, t, locale)
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={`${t("staff.changeDay", { date: label })}: ${t(`staff.mark.${current}`)}`}
        style={style}
        className={cn(
          "relative z-10 cursor-pointer rounded-full transition-transform duration-150 outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-lime data-[state=open]:scale-110",
          className
        )}
      >
        {children}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          collisionPadding={12}
          className="z-50 min-w-44 animate-in rounded-[20px] bg-card p-1.5 text-foreground shadow-xl ring-1 ring-foreground/10 duration-150 fade-in-0 zoom-in-95"
        >
          <DropdownMenu.Label className="px-3 pt-1.5 pb-1 text-xs text-muted-foreground">
            {t("staff.changeDay", { date: label })}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={current}
            onValueChange={(v) => v !== current && onPick(v as DayMark)}
          >
            {DAY_MARKS.map((mark) => (
              <DropdownMenu.RadioItem
                key={mark}
                value={mark}
                className="flex cursor-pointer items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-sm outline-none select-none data-[highlighted]:bg-raised"
              >
                <span
                  className={cn(
                    "size-3 rounded-full",
                    mark === "present" && "bg-cyan",
                    mark === "half" && HALF_ON_RAISED,
                    mark === "absent" && "bg-raised ring-1 ring-foreground/20"
                  )}
                />
                {t(`staff.mark.${mark}`)}
                <DropdownMenu.ItemIndicator className="ml-auto">
                  <CheckIcon size={14} />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function StaffCard({
  s,
  onEdit,
  onLedger,
  onPresent,
  onPay,
}: {
  s: Party
  onEdit: () => void
  onLedger: () => void
  onPresent: () => unknown
  onPay: (kind: Money) => void
}) {
  const { t } = useI18n()
  const { phone } = useLayout()
  const [marking, mark] = usePending()
  const here = s.present_today !== null
  const present = new Set(s.attendance_14d ?? [])
  const half = new Set(s.half_days_14d ?? [])
  const setDay = useSetDay()
  const left = salaryLeft(s)
  const salary = s.monthly_salary ?? 0
  const advances = s.staff_due?.advances ?? 0
  const paid = s.staff_due?.salary_paid ?? 0
  const days = lastDays(14)
  // What has gone out of this month's salary, as one rounded fill: advance, then salary paid.
  const given =
    salary > 0 ? Math.min(100, ((advances + paid) / salary) * 100) : 0
  const fill =
    advances > 0 && paid > 0
      ? `linear-gradient(90deg, ${KIND_DOT.STAFF_ADVANCE}, ${KIND_DOT.SALARY_PAID})`
      : advances > 0
        ? KIND_DOT.STAFF_ADVANCE
        : KIND_DOT.SALARY_PAID
  return (
    <div className="relative min-h-0 rounded-[32px] bg-raised transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--raised)_92%,var(--foreground))]">
      <div
        className={cn(
          "@container flex h-full flex-col justify-between gap-[5px] overflow-y-auto rounded-[32px] p-4 tall:gap-3 tall:p-6",
          phone && "gap-3"
        )}
      >
        <div className="flex items-center gap-3 pr-20">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-card text-lg tall:size-12">
            <Face
              name={s.name}
              src={photoSrc(`parties/${s.id}`, s.photo_key)}
            />
          </span>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onLedger}
              aria-label={t("staff.fullAccount", { name: s.name })}
              className={cn(
                "block max-w-full truncate text-lg leading-tight font-medium tall:text-2xl",
                OPENS("after:rounded-[32px]")
              )}
            >
              {s.name}
            </button>
            <p className="text-sm text-muted-foreground">
              {t("staff.perMonth", { salary: inr(s.monthly_salary) })}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1 tall:gap-2.5">
          <div
            className={cn(
              "flex items-center gap-x-4 gap-y-2",
              phone ? "justify-between" : "flex-wrap"
            )}
          >
            <p
              className={cn(
                "flex",
                phone ? "flex-col" : "items-baseline gap-2"
              )}
            >
              <span
                data-roll={`staff-${s.id}-left`}
                className={cn(
                  "leading-none font-light whitespace-nowrap",
                  phone
                    ? "text-[clamp(36px,11.5vw,48px)]"
                    : "text-[clamp(26px,2.4vw,32px)] tall:text-[clamp(32px,3vw,46px)]"
                )}
              >
                {inr(left)}
              </span>
              <span
                className={cn(
                  "text-muted-foreground",
                  phone ? "text-base leading-none" : "text-xs tall:text-sm"
                )}
              >
                {t("staff.leftShort")}
              </span>
            </p>
            <span
              className={cn(
                "contents",
                phone &&
                  (advances > 0 || paid > 0) &&
                  "flex flex-col gap-2 border-l border-line pl-4"
              )}
            >
              {advances > 0 && (
                <Given
                  bare={phone}
                  icon={<LayersIcon size={16} />}
                  color={KIND_DOT.STAFF_ADVANCE}
                  value={inr(advances)}
                  label={t("staff.advanceLabel")}
                  roll={`staff-${s.id}-adv`}
                />
              )}
              {paid > 0 && (
                <Given
                  bare={phone}
                  icon={<WalletIcon size={16} />}
                  color={KIND_DOT.SALARY_PAID}
                  value={inr(paid)}
                  label={t("staff.paidLabel")}
                  roll={`staff-${s.id}-paid`}
                />
              )}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="h-2 flex-1 rounded-full bg-card tall:h-2.5"
            >
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${given}%`, background: fill }}
              />
            </div>
          </div>
        </div>

        <div
          role="group"
          aria-label={t("staff.last14")}
          hidden={phone}
          className="flex flex-col gap-1.5 rounded-[20px] bg-card/50 px-3 py-1.5 tall:gap-2.5 tall:px-4 tall:py-3"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium tall:text-base">
              <CalendarDaysIcon size={16} aria-hidden />
              {t("staff.attendance")}
            </span>
            <span
              data-roll={`staff-${s.id}-att`}
              className="text-xs text-muted-foreground tabular-nums tall:text-sm"
            >
              {t("staff.presentOf", {
                present: present.size - half.size / 2,
                count: 14,
              })}
            </span>
          </div>
          <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] items-center justify-items-center gap-1.5">
            {days.map((iso, i) => (
              <DayMenu
                key={iso}
                on={iso}
                current={
                  present.has(iso)
                    ? half.has(iso)
                      ? "half"
                      : "present"
                    : "absent"
                }
                onPick={(mark) => setDay(s, iso, mark)}
                className="w-full max-w-5 tall:max-w-7"
              >
                <span
                  className={cn(
                    "block aspect-square w-full rounded-full",
                    present.has(iso)
                      ? half.has(iso)
                        ? HALF_ON_CARD
                        : "bg-cyan"
                      : "bg-background",
                    i === 13 &&
                      !present.has(iso) &&
                      "bg-transparent shadow-[inset_0_0_0_2px_color-mix(in_oklch,var(--foreground)_55%,transparent)]",
                    i === 13 &&
                      present.has(iso) &&
                      "shadow-[0_0_0_2px_color-mix(in_oklch,var(--foreground)_55%,transparent)]"
                  )}
                />
              </DayMenu>
            ))}
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-2">
          <Tip label={here ? t("staff.unmarkTitle") : t("staff.markTitle")}>
            <button
              type="button"
              onClick={() => mark(onPresent)}
              aria-pressed={here}
              aria-busy={marking}
              disabled={marking}
              className={cn(
                ACTION,
                phone && ACTION_PHONE,
                here
                  ? "bg-transparent text-foreground shadow-[inset_0_0_0_1.5px_var(--lime)]"
                  : "bg-lime text-black"
              )}
            >
              {marking ? (
                <Spinner className="size-4" />
              ) : here ? (
                <CheckIcon size={16} aria-hidden />
              ) : (
                <CalendarCheckIcon size={16} aria-hidden />
              )}
              <span className="min-w-0 truncate">
                {here
                  ? t("staff.btn.attendanceDone")
                  : t("staff.btn.attendance")}
              </span>
            </button>
          </Tip>
          <Tip
            label={left <= 0 ? t("staff.salaryGone") : t("staff.gaveAdvance")}
          >
            <span tabIndex={left <= 0 ? 0 : undefined} className="grid">
              <button
                type="button"
                onClick={() => onPay("STAFF_ADVANCE")}
                disabled={left <= 0}
                className={cn(ACTION, phone && ACTION_PHONE, SECONDARY)}
              >
                <HandCoinsIcon size={16} aria-hidden />
                {t("staff.btn.advance")}
              </button>
            </span>
          </Tip>
          <Tip
            label={left <= 0 ? t("staff.salaryGone") : t("staff.paidSalary")}
          >
            <span tabIndex={left <= 0 ? 0 : undefined} className="grid">
              <button
                type="button"
                onClick={() => onPay("SALARY_PAID")}
                disabled={left <= 0}
                className={cn(ACTION, phone && ACTION_PHONE, SECONDARY)}
              >
                <WalletIcon size={16} aria-hidden />
                {t("staff.btn.salary")}
              </button>
            </span>
          </Tip>
        </div>
      </div>
      <CornerButton
        title={t("stock.edit", { name: s.name })}
        bg="var(--card)"
        className="bg-raised"
        onClick={onEdit}
      >
        <PencilIcon size={16} />
      </CornerButton>
    </div>
  )
}

/** One amount given this month, beside the figure: its icon on a tint of its colour, then the amount and label. */
function Given({
  icon,
  color,
  value,
  label,
  roll,
  bare,
}: {
  /** no divider before it: it sits in a stacked column that has its own */
  bare?: boolean
  icon: React.ReactNode
  color: string
  value: string
  label: string
  roll: string
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-2.5",
        !bare && "border-l border-line pl-4"
      )}
    >
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-xl tall:size-10"
        style={{
          color,
          background: `color-mix(in oklch, ${color} 18%, transparent)`,
        }}
      >
        {icon}
      </span>
      <span className="leading-tight">
        <span
          data-roll={roll}
          className="block text-sm tabular-nums tall:text-base"
        >
          {value}
        </span>
        <span className="block text-xs text-muted-foreground tall:text-sm">
          {label}
        </span>
      </span>
    </span>
  )
}

/** The card's action buttons, in the app's own pill styles: lime for the main action, card-coloured for the rest. */
const ACTION =
  "flex h-10 w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full px-3 text-[14px] [&_svg]:shrink-0 whitespace-nowrap transition-transform duration-150 active:scale-[0.97] disabled:cursor-default disabled:opacity-40 tall:h-12 tall:text-[15px]"
const SECONDARY = "bg-card text-foreground"
// Three buttons share a phone-width card: less inner room, so "Present" and "Salary" fit whole.
const ACTION_PHONE = "gap-1.5 px-2 text-[13px]"

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
  onDone,
}: {
  person: Party | null
  /** `removed`: the id of the staff member just removed. */
  onDone: (removed?: number) => void
}) {
  const { t } = useI18n()
  const { run } = useShell()
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [photo, setPhoto] = React.useState<PhotoChange>()
  const [confirming, setConfirming] = React.useState(false)

  if (person && confirming)
    return (
      <div className="flex flex-col gap-5">
        <div>
          <Dialog.Title className="text-2xl font-normal">
            {t("stock.deleteTitle", { name: person.name })}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            {t("staff.deleteBody")}
          </Dialog.Description>
        </div>
        <FormError error={error} />
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setError("")
            try {
              await run(() => write.deleteParty(person.id))
              toast.success(t("toast.removed", { name: person.name }))
              onDone(person.id)
            } catch (err) {
              setError(errorText(err, t, { name: person.name }))
            } finally {
              setBusy(false)
            }
          }}
          className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-danger-soft text-base font-medium text-black transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? <Spinner className="size-[18px]" /> : <TrashIcon size={18} />}
          {t("form.confirmDelete")}
        </button>
      </div>
    )

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const salary = Number(f.get("salary"))
    const name =
      person?.name ?? String(f.get("name")).trim().replace(/\s+/g, " ")
    if (!name) return setError(t("form.nameMissing"))
    setBusy(true)
    setError("")
    try {
      await run(async () => {
        const saved = await write.saveParty(
          {
            name,
            aliases: person?.aliases ?? [],
            kind: "STAFF",
            monthly_salary: salary,
            is_active: person?.is_active ?? true,
          },
          person?.id
        )
        await savePhoto(`parties/${saved.id}`, photo)
      })
      toast.success(t(person ? "toast.updated" : "toast.added", { name }))
      onDone()
    } catch (err) {
      setError(errorText(err, t, { name }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <Dialog.Title className="text-2xl font-normal">
          {person ? person.name : t("staff.new")}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {person ? t("staff.editBody") : t("staff.newBody")}
        </Dialog.Description>
      </div>
      <PhotoField
        name={person?.name ?? ""}
        src={person ? photoSrc(`parties/${person.id}`, person.photo_key) : null}
        change={photo}
        onChange={setPhoto}
      />
      {!person && (
        <label className="flex flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">
            {t("form.name")}
          </span>
          <input
            name="name"
            required
            maxLength={30}
            autoFocus
            placeholder={t("staff.namePlaceholder")}
            onChange={() => setError("")}
            className={FIELD}
            aria-invalid={!!error}
          />
        </label>
      )}
      <label className="flex flex-col gap-2">
        <span className="text-[13px] text-muted-foreground">
          {t("staff.salaryLabel")}
        </span>
        <input
          name="salary"
          type="number"
          required
          min={0}
          max={1000000}
          defaultValue={person?.monthly_salary ?? 8000}
          inputMode="numeric"
          autoFocus={!!person}
          className={FIELD}
        />
      </label>
      <FormError error={error} />
      <FormActions
        busy={busy}
        submit={person ? t("form.save") : t("form.add")}
        onDelete={person ? () => setConfirming(true) : undefined}
      />
    </form>
  )
}

/** Advance (STAFF_ADVANCE) or salary payment (SALARY_PAID): both come out of this month's salary. */
function PayForm({
  person,
  kind,
  onDone,
}: {
  person: Party
  kind: Money
  onDone: () => void
}) {
  const { t } = useI18n()
  const { run } = useShell()
  const [amount, setAmount] = React.useState("")
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const left = salaryLeft(person)
  const earnedDue = Math.max(0, Math.min(left, person.staff_due?.due ?? 0))
  const val = Math.max(0, Math.round(Number(amount) || 0))
  const over = val > left
  const advance = kind === "STAFF_ADVANCE"

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (val <= 0 || over) return
    setBusy(true)
    setError("")
    try {
      await run(() => write.addEntry({ kind, party: person.id, amount: val }))
      toast.success(
        t(`toast.entry.${kind}`, { name: person.name, amount: inr(val) })
      )
      onDone()
    } catch (err) {
      setError(errorText(err, t, { amount: inr(left) }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <Dialog.Title className="text-2xl font-normal">
          {t(advance ? "staff.advanceTitle" : "staff.salaryTitle", {
            name: person.name,
          })}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {t("staff.payBody", {
            salary: inr(person.monthly_salary),
            advance: inr(person.staff_due?.advances),
            paid: inr(person.staff_due?.salary_paid),
          })}
        </Dialog.Description>
      </div>
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
        <span
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-400 ease-drawer motion-reduce:transition-opacity",
            !advance && earnedDue > 0
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          )}
        >
          <span className="min-h-0 overflow-hidden">
            <button
              type="button"
              tabIndex={!advance && earnedDue > 0 ? 0 : -1}
              onClick={() => setAmount(String(earnedDue))}
              className="w-fit cursor-pointer rounded-full bg-raised px-4 py-2 text-[13px] transition-colors duration-150 hover:bg-background"
            >
              {t("staff.payEarned", { amount: inr(earnedDue) })}
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
          t("error.EXCEEDS_SALARY", { amount: inr(left) })
        ) : (
          <>
            <span>{t("staff.leftAfter")}</span>
            <span className="text-foreground">{inr(left - val)}</span>
          </>
        )}
      </p>
      <FormError error={error} />
      <FormActions
        busy={busy}
        submit={t(advance ? "staff.writeAdvance" : "staff.writeSalary")}
      />
    </form>
  )
}
