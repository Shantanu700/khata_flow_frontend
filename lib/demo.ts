// Example data only: the same two synthetic merchants and history as the backend's seed_demo,
// so the dashboard shows the numbers the API would return. No real people or contact details.

export type EntryKind =
  | "CREDIT_GIVEN"
  | "PAYMENT_RECEIVED"
  | "STOCK_IN"
  | "STOCK_OUT"
  | "ATTENDANCE"
  | "STAFF_ADVANCE"
  | "SALARY_PAID"

export type Unit = "PACKET" | "KG" | "LITRE" | "PIECE"

// [days ago, kind, party or product, amount (₹) or quantity]
type HistoryRow = [number, EntryKind, string, number]

type MerchantSeed = {
  id: "gupta" | "patel"
  owner: string
  shop: string
  customers: Record<string, string[]>
  staff: Record<string, number>
  products: Record<string, [unit: Unit, threshold: number]>
  history: HistoryRow[]
  attendance: Record<string, number[]>
  voice: VoiceDemo[]
}

export type VoiceDemo = { heard: string; reply: string; stage: "COMMITTED" | "ANSWERED" | "NEEDS_CLARIFICATION" }

const C = "CREDIT_GIVEN", P = "PAYMENT_RECEIVED", A = "STAFF_ADVANCE", IN = "STOCK_IN", OUT = "STOCK_OUT"

const SEEDS: MerchantSeed[] = [
  {
    id: "gupta",
    owner: "gupta_store",
    shop: "Gupta General Store",
    customers: {
      "Sharma ji": ["sharma", "sharma uncle"],
      "Verma ji": ["verma", "varma"],
      "Gupta aunty": ["gupta", "gupta ji"],
      "Mishra ji": ["mishra", "mishra uncle"],
    },
    staff: { Ramu: 9000, Shyam: 8000 },
    products: {
      "Aashirvaad Aata 5kg": ["PACKET", 5],
      "Amul Butter 100g": ["PACKET", 5],
      Maggi: ["PACKET", 12],
      "Tata Salt": ["PACKET", 8],
      "Fortune Oil 1L": ["PACKET", 4],
      "Parle-G": ["PACKET", 15],
    },
    history: [
      [14, IN, "Aashirvaad Aata 5kg", 20], [14, IN, "Amul Butter 100g", 15], [14, IN, "Maggi", 60],
      [14, IN, "Tata Salt", 25], [14, IN, "Fortune Oil 1L", 12], [14, IN, "Parle-G", 50],
      [13, C, "Sharma ji", 500], [12, C, "Verma ji", 1200], [12, OUT, "Maggi", 20],
      [11, C, "Gupta aunty", 400], [11, C, "Mishra ji", 2000], [10, OUT, "Aashirvaad Aata 5kg", 7],
      [9, C, "Sharma ji", 750], [9, OUT, "Parle-G", 18], [8, P, "Verma ji", 500], [8, OUT, "Tata Salt", 10],
      [7, OUT, "Amul Butter 100g", 6], [6, C, "Gupta aunty", 350], [6, A, "Ramu", 1000],
      [5, P, "Mishra ji", 2000], [5, OUT, "Maggi", 30], [4, OUT, "Fortune Oil 1L", 6], [4, A, "Shyam", 500],
      [3, C, "Sharma ji", 300], [3, OUT, "Tata Salt", 8], [2, P, "Gupta aunty", 200],
      [2, OUT, "Amul Butter 100g", 5], [1, P, "Sharma ji", 300], [1, OUT, "Aashirvaad Aata 5kg", 5],
      [1, OUT, "Parle-G", 12],
    ],
    attendance: { Ramu: [8, 7, 6, 5, 4, 3, 2, 1], Shyam: [8, 7, 5, 4, 2, 1] },
    voice: [
      { heard: "Sharma ji ka paanch sau udhaar likh do", reply: "Theek hai. Sharma ji ka ₹500 udhaar likh diya. Ab kul baaki ₹1,750 hai.", stage: "COMMITTED" },
      { heard: "Kya kya saamaan kam hai?", reply: "Teen cheezein kam hain: Amul Butter 100g, Maggi aur Tata Salt.", stage: "ANSWERED" },
      { heard: "Varma ji ka teen sau udhaar", reply: "Verma ji ya Sharma ji?", stage: "NEEDS_CLARIFICATION" },
    ],
  },
  {
    id: "patel",
    owner: "patel_store",
    shop: "Patel Provision Store",
    customers: {
      "Rathore ji": ["rathore", "rathod"],
      "Khan sahab": ["khan", "khan bhai"],
      "Joshi ji": ["joshi"],
      "Kapoor aunty": ["kapoor"],
    },
    staff: { Raju: 8500, Mohan: 7500 },
    products: {
      "Tata Tea 250g": ["PACKET", 6],
      "Basmati Rice 5kg": ["PACKET", 3],
      "Toor Dal 1kg": ["PACKET", 5],
      "Surf Excel 1kg": ["PACKET", 4],
      "Lifebuoy Soap": ["PIECE", 10],
      "Amul Milk 500ml": ["PACKET", 10],
    },
    history: [
      [14, IN, "Tata Tea 250g", 20], [14, IN, "Basmati Rice 5kg", 10], [14, IN, "Toor Dal 1kg", 15],
      [14, IN, "Surf Excel 1kg", 12], [14, IN, "Lifebuoy Soap", 40], [14, IN, "Amul Milk 500ml", 30],
      [12, C, "Rathore ji", 800], [11, C, "Khan sahab", 1500], [10, OUT, "Basmati Rice 5kg", 8],
      [9, C, "Joshi ji", 450], [8, P, "Khan sahab", 1000], [7, OUT, "Amul Milk 500ml", 24],
      [6, A, "Raju", 700], [5, C, "Kapoor aunty", 600], [5, OUT, "Tata Tea 250g", 9],
      [4, OUT, "Lifebuoy Soap", 18], [3, P, "Rathore ji", 300], [3, OUT, "Toor Dal 1kg", 6],
      [2, C, "Rathore ji", 250], [2, OUT, "Surf Excel 1kg", 9], [1, P, "Joshi ji", 450],
    ],
    attendance: { Raju: [8, 7, 6, 4, 3, 2, 1], Mohan: [8, 6, 5, 3, 2, 1] },
    voice: [
      { heard: "Rathore ji ne do sau de diye", reply: "Rathore ji se ₹200 mil gaye. Ab kul baaki ₹550 hai.", stage: "COMMITTED" },
      { heard: "Chai patti ke das packet aaye", reply: "Tata Tea 250g ke 10 packet jod diye. Ab stock 21 packet.", stage: "COMMITTED" },
      { heard: "Pandey ji ka 300 udhaar likho", reply: "Ye naam nahi mila: Pandey ji. Naya customer banaun?", stage: "NEEDS_CLARIFICATION" },
    ],
  },
]

export type Customer = { name: string; aliases: string[]; given: number; paid: number; balance: number; repaid: number }
export type Product = { name: string; unit: Unit; threshold: number; stock: number; isLow: boolean }
export type StaffDue = { name: string; salary: number; daysPresent: number; daysInMonth: number; earned: number; advances: number; due: number }
export type Day = { date: Date; udhaar: number; vasooli: number }
export type Entry = { id: string; kind: EntryKind; name: string; value: number; date: Date }

export type ShopView = {
  id: MerchantSeed["id"]
  owner: string
  shop: string
  customers: Customer[]
  outstanding: number
  debtors: number
  products: Product[]
  staff: StaffDue[]
  days: Day[]
  entries: Entry[]
  voice: VoiceDemo[]
}

const daysAgo = (today: Date, n: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - n)

function view(seed: MerchantSeed, today: Date): ShopView {
  const entries: Entry[] = [
    ...seed.history.map(([ago, kind, name, value], i) => ({ id: `${seed.id}-${i}`, kind, name, value, date: daysAgo(today, ago) })),
    ...Object.entries(seed.attendance).flatMap(([name, days]) =>
      days.map((ago) => ({ id: `${seed.id}-att-${name}-${ago}`, kind: "ATTENDANCE" as const, name, value: 0, date: daysAgo(today, ago) }))
    ),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())

  const sum = (kind: EntryKind, name: string) =>
    seed.history.filter(([, k, n]) => k === kind && n === name).reduce((total, [, , , v]) => total + v, 0)

  const customers = Object.entries(seed.customers)
    .map(([name, aliases]) => {
      const given = sum(C, name), paid = sum(P, name)
      return { name, aliases, given, paid, balance: given - paid, repaid: given ? paid / given : 1 }
    })
    .sort((a, b) => b.balance - a.balance)

  const products = Object.entries(seed.products)
    .map(([name, [unit, threshold]]) => {
      const stock = sum(IN, name) - sum(OUT, name)
      return { name, unit, threshold, stock, isLow: stock <= threshold }
    })
    .sort((a, b) => a.stock / Math.max(a.threshold, 1) - b.stock / Math.max(b.threshold, 1))

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const thisMonth = (ago: number) => daysAgo(today, ago).getMonth() === today.getMonth()
  const staff = Object.entries(seed.staff).map(([name, salary]) => {
    const daysPresent = (seed.attendance[name] ?? []).filter(thisMonth).length
    const advances = seed.history.filter(([ago, k, n]) => k === A && n === name && thisMonth(ago)).reduce((t, r) => t + r[3], 0)
    const earned = Math.round((salary * daysPresent) / daysInMonth)
    return { name, salary, daysPresent, daysInMonth, earned, advances, due: earned - advances }
  })

  const days = Array.from({ length: 14 }, (_, i) => {
    const ago = 13 - i
    const on = seed.history.filter(([a]) => a === ago)
    return {
      date: daysAgo(today, ago),
      udhaar: on.filter(([, k]) => k === C).reduce((t, r) => t + r[3], 0),
      vasooli: on.filter(([, k]) => k === P).reduce((t, r) => t + r[3], 0),
    }
  })

  const debtors = customers.filter((c) => c.balance > 0)
  return {
    id: seed.id,
    owner: seed.owner,
    shop: seed.shop,
    customers,
    outstanding: debtors.reduce((t, c) => t + c.balance, 0),
    debtors: debtors.length,
    products,
    staff,
    days,
    entries,
    voice: seed.voice,
  }
}

export const SHOP_IDS = SEEDS.map((s) => s.id)
export const shopView = (id: ShopView["id"], today = new Date()) => view(SEEDS.find((s) => s.id === id)!, today)
