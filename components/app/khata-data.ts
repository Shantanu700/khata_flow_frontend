// Example data and rules for the KhataFlow app design (claude.ai/design "KhataFlow App"):
// the backend's demo seed for Gupta General Store plus two entries of the design's own,
// dated against its fixed day, Monday 9 November. No real people or contact details.

export type Kind = "CREDIT_GIVEN" | "PAYMENT_RECEIVED" | "STAFF_ADVANCE" | "STOCK_IN" | "STOCK_OUT" | "REVERSAL"

export type Row = {
  id: number
  /** days before 9 November */
  d: number
  kind: Kind
  name: string | null
  val: number | null
  /** the id this REVERSAL undoes */
  rev: number | null
  src: string
}

const C = "CREDIT_GIVEN", P = "PAYMENT_RECEIVED", A = "STAFF_ADVANCE", IN = "STOCK_IN", OUT = "STOCK_OUT", R = "REVERSAL"

export const CUSTOMERS: Record<string, string[]> = {
  "Sharma ji": ["sharma", "sharma uncle"],
  "Verma ji": ["verma", "varma"],
  "Gupta aunty": ["gupta", "gupta ji"],
  "Mishra ji": ["mishra", "mishra uncle"],
}
const STAFF: Record<string, { salary: number; att: number[] }> = {
  Ramu: { salary: 9000, att: [8, 7, 6, 5, 4, 3, 2, 1] },
  Shyam: { salary: 8000, att: [8, 7, 5, 4, 2, 1] },
}
export const UNITS = [
  { value: "Packet", label: "Packet", short: "pkt" }, { value: "Kilo", label: "Kilo", short: "kg" },
  { value: "Litre", label: "Litre", short: "L" }, { value: "Piece", label: "Piece", short: "pc" },
] as const
export type Unit = (typeof UNITS)[number]["value"]
/** `thr` is the level below which the item counts as running low. */
export type Product = { thr: number; unit: Unit }
const PRODUCTS: Record<string, Product> = Object.fromEntries(
  Object.entries({ "Aashirvaad Aata 5kg": 5, "Amul Butter 100g": 5, Maggi: 12, "Tata Salt": 8, "Fortune Oil 1L": 4, "Parle-G": 15 })
    .map(([name, thr]) => [name, { thr, unit: "Packet" as Unit }])
)
type SeedRow = [number, Kind, string | null, number | null, number?]
const SEED: SeedRow[] = [
  [14, IN, "Aashirvaad Aata 5kg", 20], [14, IN, "Amul Butter 100g", 15], [14, IN, "Maggi", 60], [14, IN, "Tata Salt", 25],
  [14, IN, "Fortune Oil 1L", 12], [14, IN, "Parle-G", 50], [13, C, "Sharma ji", 500], [12, C, "Verma ji", 1200],
  [12, OUT, "Maggi", 20], [11, C, "Gupta aunty", 400], [11, C, "Mishra ji", 2000], [10, OUT, "Aashirvaad Aata 5kg", 7],
  [9, C, "Sharma ji", 750], [9, OUT, "Parle-G", 18], [8, P, "Verma ji", 500], [8, OUT, "Tata Salt", 10],
  [7, OUT, "Amul Butter 100g", 6], [6, C, "Gupta aunty", 350], [6, A, "Ramu", 1000], [5, P, "Mishra ji", 2000],
  [5, OUT, "Maggi", 30], [4, OUT, "Fortune Oil 1L", 6], [4, A, "Shyam", 500], [3, C, "Sharma ji", 300],
  [3, OUT, "Tata Salt", 8], [2, P, "Gupta aunty", 200], [2, OUT, "Amul Butter 100g", 5], [1, P, "Sharma ji", 300],
  [1, OUT, "Aashirvaad Aata 5kg", 5], [1, OUT, "Parle-G", 12], [1, C, "Mishra ji", 2000], [1, R, "Mishra ji", null, 31],
  [0, C, "Sharma ji", 500],
]
export const SEED_ROWS: Row[] = SEED.map(([d, kind, name, val, rev], i) => ({
  id: i + 1, d, kind, name, val, rev: rev ?? null, src: i % 4 === 0 ? "Likha" : "Bola",
}))

const KIND_LABEL: Record<Kind, string> = {
  CREDIT_GIVEN: "Udhaar", PAYMENT_RECEIVED: "Vasooli", STOCK_IN: "Stock aaya", STOCK_OUT: "Stock gaya", STAFF_ADVANCE: "Advance", REVERSAL: "Palta",
}
const KIND_DOT: Record<Kind, string> = {
  CREDIT_GIVEN: "var(--chart-udhaar)", PAYMENT_RECEIVED: "var(--chart-vasooli)", STOCK_IN: "#6ba600", STOCK_OUT: "#808080", STAFF_ADVANCE: "#ffdd67", REVERSAL: "#5f5f5f",
}
const HEAT = ["#69ff67", "#a9ff66", "#ffdd67", "#ffa566", "#fe9695"]

/** The design shows amounts without a sign: the label says which way the money went. */
export const inr = (n: number) => "₹" + Math.round(Math.abs(n)).toLocaleString("en-IN")
/** "26 Oct" for any day of the 14-day window, never Aaj/Kal. */
export const dayMonth = (d: number) => (9 - d > 0 ? `${9 - d} Nov` : `${40 - d} Oct`)
/** The calendar date `d` days before 9 November 2026. */
export const dateOf = (d: number) => new Date(2026, 10, 9 - d)
/** Attendance is only on record for this many days, ending today. */
export const ATT_DAYS = 14
export const dateLabel = (d: number) => (d === 0 ? "Aaj" : d === 1 ? "Kal" : 9 - d > 0 ? `${9 - d} Nov` : `${40 - d} Oct`)

export type Stage = "COMMITTED" | "ANSWERED" | "NEEDS_CLARIFICATION" | "FAILED"
export const STAGE_DOT: Record<Stage, string> = { COMMITTED: "var(--chart-vasooli)", ANSWERED: "#66ffed", NEEDS_CLARIFICATION: "#ffdd67", FAILED: "#ef4949" }
export const STAGE_NAME: Record<Stage, string> = {
  COMMITTED: "Likh diya", ANSWERED: "Jawab diya", NEEDS_CLARIFICATION: "Poochh raha hai", FAILED: "Samajh nahi aaya",
}
/** Per-stage timings are the medians measured on real Gnani + Groq runs (backend README). */
export const DEMOS: { heard: string; reply: string; stage: Stage; ms: number[] }[] = [
  { heard: "Sharma ji ka paanch sau udhaar likh do", reply: "Theek hai. Sharma ji ka ₹500 udhaar likh diya. Ab kul baaki ₹1,750 hai.", stage: "COMMITTED", ms: [83, 457, 950, 10, 986] },
  { heard: "Kya kya saamaan kam hai?", reply: "Teen cheezein kam hain: Amul Butter 100g, Maggi aur Tata Salt.", stage: "ANSWERED", ms: [91, 430, 1120, 8, 1010] },
  { heard: "Varma ji ka teen sau udhaar", reply: "Verma ji ya Sharma ji?", stage: "NEEDS_CLARIFICATION", ms: [79, 470, 980, 12, 640] },
]

export type Screen = "dash" | "khata" | "stock" | "staff" | "entries" | "bolo"
/** The Flip ids each screen renders: these morph between screens. Keep in sync with the markup.
 *  `<owner>-<corner>` is a notch on that card. */
export const SCREEN_FLIP: Record<Screen, string[]> = {
  dash: ["main-card", "main-br", "side-card", "side-tr"],
  khata: ["main-card", "main-tr", "side-card", "side-tr"],
  stock: ["main-card", "main-tr", "main-bl", "main-b", "main-br"],
  staff: ["main-card", "main-tr", "main-bl", "main-b", "main-br"],
  entries: ["main-card", "main-tr"],
  bolo: ["main-card", "main-br", "side-card"],
}
export const LANGS = [
  { id: "hinglish", label: "Hinglish", search: "Likh ke bataiye: Sharma ji ka 500 udhaar" },
  { id: "hi", label: "हिंदी", search: "लिखकर बताइए: शर्मा जी का 500 उधार" },
  { id: "en", label: "English", search: "Type it: 500 credit for Sharma ji" },
] as const
export const TITLES: Record<(typeof LANGS)[number]["id"], Record<Screen, [string, string]>> = {
  hinglish: {
    dash: ["Dashboard", "Somvaar, 9 November"], khata: ["Khata", "Grahakon ka udhaar"], stock: ["Stock", "Dukaan ka saamaan"],
    staff: ["Staff", "Haazri, advance aur tankhwah"], entries: ["Entries", "Har entry, kuch mitta nahi"], bolo: ["Bolo", "Bolke likho, bolke poochho"],
  },
  hi: {
    dash: ["डैशबोर्ड", "सोमवार, 9 नवंबर"], khata: ["खाता", "ग्राहकों का उधार"], stock: ["स्टॉक", "दुकान का सामान"],
    staff: ["स्टाफ़", "हाज़िरी, एडवांस और तनख़्वाह"], entries: ["एंट्रीज़", "हर एंट्री, कुछ मिटा नहीं"], bolo: ["बोलो", "बोलके लिखो, बोलके पूछो"],
  },
  en: {
    dash: ["Dashboard", "Monday, 9 November"], khata: ["Ledger", "Customer credit"], stock: ["Stock", "Shop inventory"],
    staff: ["Staff", "Attendance, advances and salary"], entries: ["Entries", "Every entry, nothing deleted"], bolo: ["Speak", "Speak to record, speak to ask"],
  },
}

export type EntryView = {
  id: number
  kind: Kind
  /** days before today */
  d: number
  idLabel: string
  date: string
  name: string | null
  kindLabel: string
  dot: string
  amt: string
  src: string
  /** reversed entries and reversals are shown at half strength */
  faded: boolean
  struck: boolean
  tag: string
  canUndo: boolean
  /** rupees, for sorting; 0 for stock counts and reversals */
  rupees: number
  /** stock count, for sorting; 0 for money rows */
  qty: number
  running?: string
}

export const ENTRY_FILTERS: { id: string; label: string; kinds: Kind[] | null }[] = [
  { id: "all", label: "Sab", kinds: null }, { id: "c", label: "Udhaar", kinds: [C] }, { id: "p", label: "Vasooli", kinds: [P] },
  { id: "s", label: "Stock", kinds: [IN, OUT] }, { id: "st", label: "Staff", kinds: [A] }, { id: "r", label: "Palte hue", kinds: [R] },
]

/** Everything the screens show, derived from the rows (balances are never stored). */
/** `hired` maps a staff name to a monthly salary, for staff added in the app or a seed salary changed. */
/** `joined` maps a customer to their aliases, for customers added or edited in the app; null means removed. */
/** `here` lists the staff marked present today in the app. */
export function deriveBook(extra: Row[], selected: string, filter: string, added: Record<string, Product> = {}, hired: Record<string, number> = {}, removed: string[] = [], joined: Record<string, string[] | null> = {}, here: string[] = []) {
  const people = Object.fromEntries(Object.entries({ ...CUSTOMERS, ...joined }).filter((e): e is [string, string[]] => e[1] !== null))
  const catalog = { ...PRODUCTS, ...added }
  const short = (name: string | null) => UNITS.find((u) => u.value === catalog[name ?? ""]?.unit)?.short ?? "pkt"
  const rows = SEED_ROWS.concat(extra).map((r) => ({ ...r }))
  const byId = new Map(rows.map((r) => [r.id, r]))
  const reversedIds = new Set(rows.filter((r) => r.kind === R).map((r) => r.rev))
  for (const r of rows) if (r.kind === R) r.name = byId.get(r.rev!)?.name ?? null
  const isReversed = (r: Row) => reversedIds.has(r.id)
  const live = rows.filter((r) => r.kind !== R && !isReversed(r))

  const view = (r: Row): EntryView => ({
    id: r.id,
    kind: r.kind,
    d: r.d,
    idLabel: `#${r.id}`,
    date: dateLabel(r.d),
    name: r.name,
    kindLabel: KIND_LABEL[r.kind],
    dot: KIND_DOT[r.kind],
    amt: r.kind === R ? `#${r.rev}` : r.kind === IN || r.kind === OUT ? `${r.val} ${short(r.name)}` : inr(r.val ?? 0),
    src: r.src,
    faded: isReversed(r) || r.kind === R,
    struck: isReversed(r),
    tag: isReversed(r) ? "palat diya" : r.kind === R ? `entry #${r.rev} palti` : "",
    canUndo: r.kind !== R && !isReversed(r),
    rupees: r.kind === R || r.kind === IN || r.kind === OUT ? 0 : r.val ?? 0,
    qty: r.kind === IN || r.kind === OUT ? r.val ?? 0 : 0,
  })

  const balance: Record<string, number> = Object.fromEntries(Object.keys(people).map((n) => [n, 0]))
  const lastDay: Record<string, number> = {}
  for (const r of live) {
    if (!(r.name! in balance)) continue
    if (r.kind === C) balance[r.name!] += r.val!
    if (r.kind === P) balance[r.name!] -= r.val!
    if (r.kind === C || r.kind === P) lastDay[r.name!] = Math.min(lastDay[r.name!] ?? 99, r.d)
  }
  const total = Object.values(balance).reduce((a, b) => a + b, 0)
  const maxBalance = Math.max(...Object.values(balance), 1)
  const lastLabel = (n: string) => {
    const d = lastDay[n]
    return d === undefined ? "Koi entry nahi" : d === 0 ? "Aakhri entry aaj" : d === 1 ? "Aakhri entry kal" : `Aakhri entry ${d} din pehle`
  }
  const customers = Object.keys(people).sort((a, b) => balance[b] - balance[a])
  const debtors = customers.map((n) => {
    const level = balance[n] <= 0 ? 0 : Math.max(1, Math.round((balance[n] / maxBalance) * 5))
    return {
      name: n, initial: n[0].toUpperCase(), aliases: people[n], bal: balance[n] <= 0 ? "Saaf" : inr(balance[n]), last: lastLabel(n),
      dots: [0, 1, 2, 3, 4].map((i) => (i < level ? HEAT[i] : "var(--raised)")),
    }
  })

  let max = 1
  const days: [number, number, number][] = []
  for (let d = 13; d >= 0; d--) {
    const u = live.filter((r) => r.d === d && r.kind === C).reduce((a, r) => a + r.val!, 0)
    const v = live.filter((r) => r.d === d && r.kind === P).reduce((a, r) => a + r.val!, 0)
    max = Math.max(max, u, v)
    days.push([d, u, v])
  }
  const chart = days.map(([d, u, v]) => ({ label: d === 0 ? "Aaj" : dateLabel(d).split(" ")[0], uh: (u / max) * 100, vh: (v / max) * 100, u, v, d }))
  const week = (k: Kind) => live.filter((r) => r.d <= 7 && r.kind === k).reduce((a, r) => a + r.val!, 0)

  const level: Record<string, number> = Object.fromEntries(Object.keys(catalog).map((p) => [p, 0]))
  for (const r of live) {
    if (r.kind === IN) level[r.name!] += r.val!
    if (r.kind === OUT) level[r.name!] -= r.val!
  }
  const products = Object.entries(catalog).filter(([p]) => !removed.includes(p)).map(([p, { thr, unit }]) => {
    const low = level[p] < thr
    return { name: p, unit, level: level[p], thr, low, pct: Math.min(100, (level[p] / Math.max(1, thr * 2)) * 100) }
  })

  const staff = [...new Set([...Object.keys(STAFF), ...Object.keys(hired)])].map((n) => {
    const advance = live.filter((r) => r.kind === A && r.name === n).reduce((a, r) => a + r.val!, 0)
    const s = { att: [...(STAFF[n]?.att ?? []), ...(here.includes(n) ? [0] : [])], salary: hired[n] ?? STAFF[n].salary }
    return {
      name: n, initial: n[0].toUpperCase(), today: here.includes(n), pay: s.salary, advance, salary: inr(s.salary), adv: inr(advance), due: inr(s.salary - advance), att: s.att.length,
      /** days-before-today they were present */
      present: s.att,
      moves: rows.filter((r) => r.name === n && (r.kind === A || (r.kind === R && byId.get(r.rev!)?.kind === A))).reverse().map(view),
      days: Array.from({ length: ATT_DAYS }, (_, i) => {
        const d = ATT_DAYS - 1 - i
        return { present: s.att.includes(d), label: d === 0 ? "Aaj" : String(9 - d > 0 ? 9 - d : 40 - d) }
      }),
    }
  })

  let running = 0
  const ledger = rows
    .filter((r) => r.name === selected && (r.kind === C || r.kind === P || r.kind === R))
    .map((r) => {
      const v = view(r)
      if (r.kind !== R && !isReversed(r)) running += r.kind === C ? r.val! : -r.val!
      v.running = r.kind === R || isReversed(r) ? "" : inr(running)
      return v
    })
    .reverse()

  const kinds = ENTRY_FILTERS.find((f) => f.id === filter)?.kinds
  const entries = rows.filter((r) => !kinds || kinds.includes(r.kind)).reverse().map(view)

  return {
    balance,
    total,
    owingCount: customers.filter((n) => balance[n] > 0).length,
    weekUdhaar: week(C),
    weekVasooli: week(P),
    entryCount: live.length,
    debtors,
    chart,
    recent: live.slice().reverse().filter((r) => r.kind !== IN).slice(0, 6).map(view),
    customers: customers.map((n) => ({ name: n, initial: n[0].toUpperCase(), aliases: people[n], owed: balance[n], bal: balance[n] <= 0 ? "Saaf" : inr(balance[n]), last: lastLabel(n) })),
    selected: selected in people ? { name: selected, aliases: people[selected], owed: balance[selected], bal: inr(balance[selected]), balLabel: balance[selected] > 0 ? "lena hai" : "hisaab saaf", entries: ledger } : null,
    products,
    lowStock: products.filter((p) => p.low),
    stockMoves: live.filter((r) => r.kind === IN || r.kind === OUT).reverse().map(view),
    staff,
    entries,
  }
}

export type Book = ReturnType<typeof deriveBook>
