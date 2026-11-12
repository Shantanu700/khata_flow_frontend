"use client"

import * as React from "react"
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query"

import type { Screen } from "@/components/app/khata-data"

import {
  data,
  deleteV1Parties,
  deleteV1Products,
  getV1I18N,
  getV1Me,
  getV1Parties,
  getV1PartiesMonth,
  getV1Summary,
  getV1VoiceChats,
  getV1VoiceChatsMessages,
  listV1Entries,
  listV1I18N,
  listV1Parties,
  listV1Products,
  postV1Entries,
  postV1EntriesUndo,
  postV1Parties,
  postV1Products,
  putV1Me,
  putV1Parties,
  putV1PartiesAttendance,
  putV1Products,
  type Page,
  type Party,
  type Product,
} from "@/lib/api"
import type {
  AttendanceRequest,
  EntryCreateRequest,
  ListV1EntriesData,
  ListV1PartiesData,
  ListV1ProductsData,
  PartyRequest,
  ProductRequest,
} from "@/lib/client/types.gen"

/** Page sizes the screens were designed around; a chat loads its newest `chat` messages, then more on request. */
export const SIZE = {
  list: 8,
  table: 11,
  cards: 8,
  staffCards: 4,
  chat: 50,
} as const

type Query<T extends { query?: unknown }> = NonNullable<T["query"]>
type Paged = { page: number; page_size: number }
export type CustomerParams = Pick<
  Query<ListV1PartiesData>,
  "q" | "balance" | "ordering"
> &
  Paged
export type LedgerParams = Pick<
  Query<ListV1EntriesData>,
  "kind" | "date_from" | "date_to"
> & { page: number }
export type ProductParams = Pick<Query<ListV1ProductsData>, "q" | "low"> & Paged
export type EntryParams = Pick<
  Query<ListV1EntriesData>,
  "kind" | "q" | "product" | "date_from" | "date_to" | "ordering"
> & { page: number }
export type StaffParams = Pick<Query<ListV1PartiesData>, "q" | "advance"> &
  Paged

// Kept between pages, filters and searches, so a table never blanks while the next page loads.
const kept = { placeholderData: keepPreviousData }

export const keys = {
  me: ["me"] as const,
  languages: ["languages"] as const,
  strings: (code: string) => ["strings", code] as const,
  summary: ["summary"] as const,
  customers: (p: CustomerParams) => ["customers", p] as const,
  customer: (id: number) => ["customer", id] as const,
  ledger: (id: number, p: LedgerParams) => ["ledger", id, p] as const,
  products: (p: ProductParams) => ["products", p] as const,
  moves: (p: EntryParams) => ["moves", p] as const,
  staff: (p: StaffParams) => ["staff", p] as const,
  staffMonth: (id: number, month: string) => ["staffMonth", id, month] as const,
  entries: (p: EntryParams) => ["entries", p] as const,
  chats: (page: number) => ["chats", page] as const,
  chat: (id: number) => ["chat", id] as const,
}

// Parties and products as `Sent` (see lib/api.ts): the generated types leave their defaulted fields optional.
const parties = (query: Query<ListV1PartiesData>) =>
  data(listV1Parties({ query })) as Promise<Page<Party>>
const products = (query: Query<ListV1ProductsData>) =>
  data(listV1Products({ query })) as Promise<Page<Product>>

const fetchers = {
  customers: (p: CustomerParams) => parties({ kind: "CUSTOMER", ...p }),
  products: (p: ProductParams) => products(p),
  staff: (p: StaffParams) => parties({ kind: "STAFF", ...p }),
  entries: (p: EntryParams) =>
    data(listV1Entries({ query: { ...p, page_size: SIZE.table } })),
  summary: () => data(getV1Summary()),
  chats: (page: number) =>
    data(getV1VoiceChats({ query: { page, page_size: SIZE.table } })),
}

/** Load what a screen shows first, so a tab switch can fetch it during the exit animation. */
export function preload(client: QueryClient, screen: Screen): Promise<void> {
  const customers: CustomerParams = {
    page: 1,
    page_size: SIZE.list,
    ordering: "-balance",
  }
  const products: ProductParams = { page: 1, page_size: SIZE.cards }
  const staff: StaffParams = { page: 1, page_size: SIZE.staffCards }
  switch (screen) {
    case "dash":
      return client.prefetchQuery({
        queryKey: keys.summary,
        queryFn: fetchers.summary,
      })
    case "khata":
      return client.prefetchQuery({
        queryKey: keys.customers(customers),
        queryFn: () => fetchers.customers(customers),
      })
    case "stock":
      return client.prefetchQuery({
        queryKey: keys.products(products),
        queryFn: () => fetchers.products(products),
      })
    case "staff":
      return client.prefetchQuery({
        queryKey: keys.staff(staff),
        queryFn: () => fetchers.staff(staff),
      })
    case "entries":
      return client.prefetchQuery({
        queryKey: keys.entries({ page: 1, ordering: "-id" }),
        queryFn: () => fetchers.entries({ page: 1, ordering: "-id" }),
      })
    case "bolo":
      return client.prefetchQuery({
        queryKey: keys.chats(1),
        queryFn: () => fetchers.chats(1),
      })
  }
}

export const useMe = () =>
  useQuery({
    queryKey: keys.me,
    queryFn: () => data(getV1Me()),
    retry: false,
    staleTime: Infinity,
  })

export const useLanguages = () =>
  useQuery({
    queryKey: keys.languages,
    queryFn: () => data(listV1I18N()),
    staleTime: Infinity,
  })

export const useStrings = (code: string) =>
  useQuery({
    queryKey: keys.strings(code),
    queryFn: () =>
      data(getV1I18N({ path: { code } })) as Promise<Record<string, string>>,
    staleTime: Infinity,
  })

export const useSummary = () =>
  useQuery({ queryKey: keys.summary, queryFn: fetchers.summary })

export const useCustomers = (p: CustomerParams) =>
  useQuery({
    queryKey: keys.customers(p),
    queryFn: () => fetchers.customers(p),
    ...kept,
  })

export const useCustomer = (id: number | null) =>
  useQuery({
    queryKey: keys.customer(id ?? 0),
    queryFn: () =>
      data(getV1Parties({ path: { id: id ?? 0 } })) as Promise<Party>,
    enabled: id !== null,
  })

export const useLedger = (id: number | null, p: LedgerParams) =>
  useQuery({
    queryKey: keys.ledger(id ?? 0, p),
    queryFn: () =>
      data(
        listV1Entries({
          query: { party: id ?? undefined, page_size: SIZE.table, ...p },
        })
      ),
    enabled: id !== null,
    ...kept,
  })

export const useProducts = (p: ProductParams) =>
  useQuery({
    queryKey: keys.products(p),
    queryFn: () => fetchers.products(p),
    ...kept,
  })

/** Every product's name, for the stock ledger's product picker. */
export const useProductNames = () =>
  useQuery({
    queryKey: ["productNames"],
    queryFn: () => products({ page_size: 100 }).then((p) => p.results),
  })

export const useStockMoves = (p: EntryParams) =>
  useQuery({
    queryKey: keys.moves(p),
    queryFn: () => fetchers.entries({ kind: "STOCK_IN,STOCK_OUT", ...p }),
    ...kept,
  })

export const useStaff = (p: StaffParams) =>
  useQuery({
    queryKey: keys.staff(p),
    queryFn: () => fetchers.staff(p),
    ...kept,
  })

export const useStaffMonth = (id: number, month: string) =>
  useQuery({
    queryKey: keys.staffMonth(id, month),
    queryFn: () => data(getV1PartiesMonth({ path: { id }, query: { month } })),
    ...kept,
  })

/** A staff member's money entries for one month (advances, salary, and their undos). */
export const useStaffMoves = (id: number, from: string, to: string) =>
  useQuery({
    queryKey: ["staffMoves", id, from, to],
    queryFn: () =>
      data(
        listV1Entries({
          query: {
            party: id,
            kind: "STAFF_ADVANCE,SALARY_PAID,REVERSAL",
            date_from: from,
            date_to: to,
            page_size: 100,
          },
        })
      ),
    ...kept,
  })

export const useEntries = (p: EntryParams) =>
  useQuery({
    queryKey: keys.entries(p),
    queryFn: () => fetchers.entries(p),
    ...kept,
  })

export const useChats = (page = 1) =>
  useQuery({
    queryKey: keys.chats(page),
    queryFn: () => fetchers.chats(page),
    ...kept,
  })

/** One chat's messages, newest page first; each further page is older. */
export const useChatMessages = (id: number | null) =>
  useInfiniteQuery({
    queryKey: keys.chat(id ?? 0),
    queryFn: ({ pageParam }) =>
      data(
        getV1VoiceChatsMessages({
          path: { id: id ?? 0 },
          query: { page: pageParam, page_size: SIZE.chat },
        })
      ),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.next ? all.length + 1 : undefined),
    enabled: id !== null,
  })

/** A staff member's day: a full day, a half day, or no attendance. */
export type DayMark = AttendanceRequest["mark"]

/** Writes. Updates are PUT with the whole object (never PATCH). */
export const write = {
  saveParty: (body: PartyRequest, id?: number) =>
    (id
      ? data(putV1Parties({ path: { id }, body }))
      : data(postV1Parties({ body }))) as Promise<Party>,
  deleteParty: (id: number) => data(deleteV1Parties({ path: { id } })),
  saveProduct: (body: ProductRequest, id?: number) =>
    (id
      ? data(putV1Products({ path: { id }, body }))
      : data(postV1Products({ body }))) as Promise<Product>,
  deleteProduct: (id: number) => data(deleteV1Products({ path: { id } })),
  addEntry: (body: EntryCreateRequest) => data(postV1Entries({ body })),
  undo: (id: number) => data(postV1EntriesUndo({ path: { id } })),
  setAttendance: (id: number, on: string, mark: DayMark) =>
    data(
      putV1PartiesAttendance({ path: { id }, body: { on, mark } })
    ) as Promise<Party>,
  setLanguage: (code: string) =>
    data(putV1Me({ body: { shop: { preferred_language: code } } })),
}

/** `value` once it has stopped changing for `ms` (search boxes query the server as you pause typing). */
export function useDebounced<T>(value: T, ms = 300) {
  const [settled, setSettled] = React.useState(value)
  React.useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), ms)
    return () => window.clearTimeout(timer)
  }, [value, ms])
  return settled
}
