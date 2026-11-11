import type { components } from "@/lib/api-types"

type S = components["schemas"]
// Fields with a model default come back optional in the generated types, but the API always sends them.
type Sent<T, K extends keyof T> = T & { [P in K]-?: Exclude<T[P], undefined> }
export type Party = Sent<
  S["Party"],
  "aliases" | "kind" | "is_active" | "monthly_salary"
>
export type Product = Sent<
  S["Product"],
  "aliases" | "unit" | "low_stock_threshold" | "is_active"
>
export type Entry = S["Entry"]
export type Summary = S["Summary"]
export type StaffMonth = S["StaffMonth"]
export type VoiceCommand = S["VoiceCommand"]
export type Chat = S["Chat"]
export type Me = S["Me"]
export type EntryKind = Entry["kind"]
export type Page<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message)
  }
}

/** Fired on any 401, so the app can show the sign-in screen. */
export const SIGNED_OUT = "kf:signed-out"

type Params = Record<string, string | number | boolean | null | undefined>

const query = (params?: Params) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {}))
    if (value !== undefined && value !== null && value !== "")
      search.set(key, String(value))
  const text = search.toString()
  return text ? `?${text}` : ""
}

/** Calls the API through the app's own /api/kf proxy, which adds the token from the httpOnly cookie. */
export async function api<T>(
  path: string,
  {
    method = "GET",
    params,
    json,
    form,
  }: { method?: string; params?: Params; json?: unknown; form?: FormData } = {}
): Promise<T> {
  const res = await fetch(
    `/api/kf/${path.replace(/^\/|\/$/g, "")}${query(params)}`,
    {
      method,
      headers:
        json === undefined ? undefined : { "content-type": "application/json" },
      body: form ?? (json === undefined ? undefined : JSON.stringify(json)),
    }
  )
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => ({}))
  if (!res.ok) fail(res.status, body)
  return body as T
}

function fail(status: number, body: { error?: Record<string, never> }): never {
  if (status === 401) window.dispatchEvent(new Event(SIGNED_OUT))
  const error = body?.error ?? {}
  throw new ApiError(
    status,
    error.code ?? "NETWORK",
    error.message ?? "Kuch gadbad ho gayi.",
    error.details
  )
}

export type Progress = {
  onId: (id: number) => void
  onStage: (stage: string, ms: number) => void
  signal: AbortSignal
}

/** A voice command with live progress: the API streams its id ({"id": 42}), then one JSON line per pipeline stage
 *  as it finishes ({"stage": "stt", "ms": 1749}), then {"command": …} or {"error": …}. */
export async function apiProgress<T>(
  path: string,
  { json, form }: { json?: unknown; form?: FormData },
  { onId, onStage, signal }: Progress
): Promise<T> {
  const res = await fetch(
    `/api/kf/${path.replace(/^\/|\/$/g, "")}?progress=1`,
    {
      method: "POST",
      headers:
        json === undefined ? undefined : { "content-type": "application/json" },
      body: form ?? JSON.stringify(json),
      signal,
    }
  )
  if (!res.ok || !res.body) fail(res.status, await res.json().catch(() => ({})))
  const lines = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ""
  for (;;) {
    const { value, done } = await lines.read()
    if (done) break
    buffer += value
    for (let end = buffer.indexOf("\n"); end >= 0; end = buffer.indexOf("\n")) {
      const event = JSON.parse(buffer.slice(0, end))
      buffer = buffer.slice(end + 1)
      if (event.command) return event.command as T
      if (event.error) fail(409, event)
      if (event.id) onId(event.id)
      else onStage(event.stage, event.ms)
    }
  }
  return fail(502, {})
}

/** Money as the API sends it (numbers) in Indian grouping, without the sign: the label says which way it went. */
export const inr = (n: number | null | undefined) =>
  "₹" + Math.round(Math.abs(n ?? 0)).toLocaleString("en-IN")

/** Today's date as the API writes dates (local time, YYYY-MM-DD). */
export const isoDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

export const parseDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** Whole days from `iso` to today (0 = today). */
export const daysAgo = (iso: string) =>
  Math.round(
    (parseDay(isoDay()).getTime() - parseDay(iso).getTime()) / 86_400_000
  )
