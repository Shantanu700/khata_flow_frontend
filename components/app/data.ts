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
  api,
  type Chat,
  type Entry,
  type EntryKind,
  type Me,
  type Page,
  type Party,
  type Product,
  type StaffMonth,
  type Summary,
  type VoiceCommand,
} from "@/lib/api"

/** Page sizes the screens were designed around; a chat loads its newest `chat` messages, then more on request. */
export const SIZE = {
  list: 8,
  table: 11,
  cards: 8,
  staffCards: 4,
  chat: 50,
} as const

export type CustomerParams = {
  q?: string
  balance?: "owing" | "clear"
  ordering?: string
  page: number
  page_size: number
}
export type LedgerParams = {
  kind?: string
  date_from?: string
  date_to?: string
  page: number
}
export type ProductParams = {
  q?: string
  low?: boolean
  page: number
  page_size: number
}
export type EntryParams = {
  kind?: string
  q?: string
  product?: number
  date_from?: string
  date_to?: string
  ordering?: string
  page: number
}
export type StaffParams = {
  q?: string
  advance?: "yes" | "no"
  page: number
  page_size: number
}

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

const fetchers = {
  customers: (p: CustomerParams) =>
    api<Page<Party>>("parties", { params: { kind: "CUSTOMER", ...p } }),
  products: (p: ProductParams) => api<Page<Product>>("products", { params: p }),
  staff: (p: StaffParams) =>
    api<Page<Party>>("parties", { params: { kind: "STAFF", ...p } }),
  entries: (p: EntryParams) =>
    api<Page<Entry>>("entries", { params: { ...p, page_size: SIZE.table } }),
  summary: () => api<Summary>("summary"),
  chats: (page: number) =>
    api<Page<Chat>>("voice/chats", { params: { page, page_size: SIZE.table } }),
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
    queryFn: () => api<Me>("me"),
    retry: false,
    staleTime: Infinity,
  })

export const useLanguages = () =>
  useQuery({
    queryKey: keys.languages,
    queryFn: () =>
      api<{ code: string; name: string; native_name: string }[]>("i18n"),
    staleTime: Infinity,
  })

export const useStrings = (code: string) =>
  useQuery({
    queryKey: keys.strings(code),
    queryFn: () => api<Record<string, string>>(`i18n/${code}`),
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
    queryFn: () => api<Party>(`parties/${id}`),
    enabled: id !== null,
  })

export const useLedger = (id: number | null, p: LedgerParams) =>
  useQuery({
    queryKey: keys.ledger(id ?? 0, p),
    queryFn: () =>
      api<Page<Entry>>("entries", {
        params: { party: id, page_size: SIZE.table, ...p },
      }),
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
    queryFn: () =>
      api<Page<Product>>("products", { params: { page_size: 100 } }).then(
        (p) => p.results
      ),
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
    queryFn: () =>
      api<StaffMonth>(`parties/${id}/month`, { params: { month } }),
    ...kept,
  })

/** A staff member's money entries for one month (advances, salary, and their undos). */
export const useStaffMoves = (id: number, from: string, to: string) =>
  useQuery({
    queryKey: ["staffMoves", id, from, to],
    queryFn: () =>
      api<Page<Entry>>("entries", {
        params: {
          party: id,
          kind: "STAFF_ADVANCE,SALARY_PAID,REVERSAL",
          date_from: from,
          date_to: to,
          page_size: 100,
        },
      }),
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
      api<Page<VoiceCommand>>(`voice/chats/${id}/messages`, {
        params: { page: pageParam, page_size: SIZE.chat },
      }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.next ? all.length + 1 : undefined),
    enabled: id !== null,
  })

export type PartyBody = {
  name: string
  aliases: string[]
  kind: "CUSTOMER" | "STAFF"
  monthly_salary?: number | null
  is_active?: boolean
}
export type ProductBody = {
  name: string
  aliases: string[]
  unit: Product["unit"]
  low_stock_threshold: number
  is_active?: boolean
}
export type EntryBody = {
  kind: Exclude<EntryKind, "REVERSAL">
  party?: number
  product?: number
  amount?: number
  quantity?: number
  note?: string
}

/** Writes. Updates are PUT with the whole object (never PATCH). */
export const write = {
  saveParty: (body: PartyBody, id?: number) =>
    id
      ? api<Party>(`parties/${id}`, { method: "PUT", json: body })
      : api<Party>("parties", { method: "POST", json: body }),
  deleteParty: (id: number) => api<void>(`parties/${id}`, { method: "DELETE" }),
  saveProduct: (body: ProductBody, id?: number) =>
    id
      ? api<Product>(`products/${id}`, { method: "PUT", json: body })
      : api<Product>("products", { method: "POST", json: body }),
  deleteProduct: (id: number) =>
    api<void>(`products/${id}`, { method: "DELETE" }),
  addEntry: (body: EntryBody) =>
    api<Entry>("entries", { method: "POST", json: body }),
  undo: (id: number) => api<Entry>(`entries/${id}/undo`, { method: "POST" }),
  setLanguage: (code: string) =>
    api<Me>("me", {
      method: "PUT",
      json: { shop: { preferred_language: code } },
    }),
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
