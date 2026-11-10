import type { Entry, Unit } from "@/lib/demo"

/** ₹1,25,000 (Indian grouping), paise only when non-zero, like the backend's format_inr. */
export function inr(amount: number): string {
  const sign = amount < 0 ? "-" : ""
  const [rupees, paise] = Math.abs(amount).toFixed(2).split(".")
  const grouped = rupees.replace(/(\d)(?=(\d{2})*\d{3}$)/g, "$1,")
  return `${sign}₹${grouped}${paise === "00" ? "" : `.${paise}`}`
}

/** Axis ticks: ₹1.5K up to a lakh, then ₹1.2L. */
export function inrTick(amount: number): string {
  if (amount >= 100000) return `₹${+(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${+(amount / 1000).toFixed(1)}K`
  return `₹${amount}`
}

const UNIT_WORDS: Record<Unit, string> = { PACKET: "packet", KG: "kilo", LITRE: "litre", PIECE: "piece" }
export const unitWord = (unit: Unit) => UNIT_WORDS[unit]

const DAY = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" })
export const shortDate = (date: Date) => DAY.format(date)

export function relativeDay(date: Date, today = new Date()): string {
  const days = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - date.getTime()) / 86_400_000
  )
  if (days <= 0) return "Aaj"
  if (days === 1) return "Kal"
  return `${days} din pehle`
}

/** The same Hinglish wording as the backend's reply templates. */
export function describeEntry(entry: Entry): string {
  const { kind, name, value } = entry
  switch (kind) {
    case "CREDIT_GIVEN":
      return `${name} ka ${inr(value)} udhaar`
    case "PAYMENT_RECEIVED":
      return `${name} se ${inr(value)} mile`
    case "STOCK_IN":
      return `${name} ke ${value} aaye`
    case "STOCK_OUT":
      return `${name} ke ${value} nikle`
    case "ATTENDANCE":
      return `${name} ki haaziri`
    case "STAFF_ADVANCE":
      return `${name} ko ${inr(value)} advance`
    case "SALARY_PAID":
      return `${name} ko ${inr(value)} tankhwah`
  }
}
