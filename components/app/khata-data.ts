// Labels, colours and adapters that turn API rows into what the screens show. All data comes from the
// API (components/app/data.ts); nothing here is stored.

import { dayLabel, qty, type T } from "@/components/app/i18n"
import {
  daysAgo,
  inr,
  type Entry,
  type EntryKind,
  type Product,
} from "@/lib/api"

export type Screen = "dash" | "khata" | "stock" | "staff" | "entries" | "bolo"

/** The Flip ids each screen renders: these morph between screens. Keep in sync with the markup.
 *  `<owner>-<corner>` is a notch on that card. */
export const SCREEN_FLIP: Record<Screen, string[]> = {
  dash: ["main-card", "main-br", "side-card", "side-tr"],
  khata: ["main-card", "main-tr", "side-card", "side-tr"],
  stock: ["main-card", "main-tr", "main-bl", "main-b", "main-br"],
  staff: ["main-card", "main-tr", "main-bl", "main-b", "main-br"],
  entries: ["main-card", "main-tr"],
  bolo: ["main-card", "main-tr", "side-card"],
}

/** Each tab's URL, so a refresh stays on it. One catch-all route serves them all, keeping the shell mounted
 *  for the morph between tabs. */
export const SCREEN_PATH: Record<Screen, string> = {
  dash: "/",
  khata: "/khata",
  stock: "/stock",
  staff: "/staff",
  entries: "/entries",
  bolo: "/bolo",
}

export const screenAt = (pathname: string): Screen => {
  const path = pathname.replace(/\/+$/, "") || "/"
  return (
    (Object.keys(SCREEN_PATH) as Screen[]).find(
      (s) => SCREEN_PATH[s] === path
    ) ?? "dash"
  )
}

export type Unit = Product["unit"]
export const UNITS: Unit[] = ["PACKET", "KG", "LITRE", "PIECE"]

export const KIND_DOT: Record<EntryKind, string> = {
  CREDIT_GIVEN: "var(--chart-udhaar)",
  PAYMENT_RECEIVED: "var(--chart-vasooli)",
  STOCK_IN: "var(--chart-single)",
  STOCK_OUT: "var(--chart-quiet)",
  ATTENDANCE: "var(--cyan)",
  STAFF_ADVANCE: "var(--heat-3)",
  SALARY_PAID: "var(--heat-2)",
  REVERSAL: "var(--hairline)",
}

export type Stage = "COMMITTED" | "ANSWERED" | "NEEDS_CLARIFICATION" | "FAILED"
export const STAGE_DOT: Record<string, string> = {
  COMMITTED: "var(--chart-vasooli)",
  ANSWERED: "var(--cyan)",
  NEEDS_CLARIFICATION: "var(--heat-3)",
  FAILED: "var(--red)",
  CANCELLED: "var(--hairline)",
}

/** The five money-heat dots on a debtor card: more filled the more they owe against the biggest debtor. */
const HEAT = [
  "var(--heat-5)",
  "var(--heat-4)",
  "var(--heat-3)",
  "var(--heat-2)",
  "var(--heat-1)",
]
export const heat = (balance: number, max: number) => {
  const level =
    balance <= 0 ? 0 : Math.max(1, Math.round((balance / Math.max(max, 1)) * 5))
  return [0, 1, 2, 3, 4].map((i) => (i < level ? HEAT[i] : "var(--raised)"))
}

export const initial = (name: string) => name.trim().charAt(0).toUpperCase()

/** "Aakhri entry aaj / kal / 3 din pehle" from a customer's last udhaar or vasooli date. */
export const lastLabel = (iso: string | null | undefined, t: T) => {
  if (!iso) return t("customer.noEntries")
  const ago = daysAgo(iso)
  return ago === 0
    ? t("customer.lastToday")
    : ago === 1
      ? t("customer.lastYesterday")
      : t("customer.lastDaysAgo", { days: ago })
}

export type EntryView = {
  id: number
  kind: EntryKind
  idLabel: string
  date: string
  name: string
  kindLabel: string
  dot: string
  amt: string
  src: string
  /** undone entries and the undos themselves are shown at half strength */
  faded: boolean
  struck: boolean
  tag: string
  canUndo: boolean
  running: string
  /** the running balance is below zero: the customer has paid ahead */
  advance: boolean
}

export function entryView(e: Entry, t: T, locale: string): EntryView {
  const undo = e.kind === "REVERSAL"
  const stock = e.quantity !== null && e.product !== null
  return {
    id: e.id,
    kind: e.kind,
    idLabel: `#${e.id}`,
    date: dayLabel(e.occurred_on, t, locale),
    name: e.party_name || e.product_name || "",
    kindLabel: t(`kind.${e.kind}`),
    dot: KIND_DOT[e.kind],
    amt: undo
      ? `#${e.reverses}`
      : stock
        ? `${qty(e.quantity)} ${t(`unit.${e.product_unit}.short`)}`
        : e.kind === "ATTENDANCE"
          ? t("entry.present")
          : inr(e.amount),
    src: t(`src.${e.voice_command_input_mode || "MANUAL"}`),
    faded: e.is_reversed || undo,
    struck: e.is_reversed,
    tag: e.is_reversed
      ? t("entry.undone")
      : undo
        ? t("entry.undid", { id: e.reverses })
        : "",
    canUndo: !undo && !e.is_reversed,
    running: e.running_balance === null ? "" : inr(e.running_balance),
    // Below zero the customer has paid ahead: shown as a green +₹.
    advance: (e.running_balance ?? 0) < 0,
  }
}
