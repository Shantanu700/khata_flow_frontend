import { client } from "@/lib/client/client.gen"
import type * as S from "@/lib/client/types.gen"

export * from "@/lib/client/sdk.gen"

// Fields with a model default come back optional in the generated types, but the API always sends them.
type Sent<T, K extends keyof T> = T & { [P in K]-?: Exclude<T[P], undefined> }
export type Party = Sent<
  S.Party,
  "aliases" | "kind" | "is_active" | "monthly_salary"
>
export type Product = Sent<
  S.Product,
  "aliases" | "unit" | "low_stock_threshold" | "is_active"
>
export type Entry = S.Entry
export type Summary = S.Summary
export type StaffMonth = S.StaffMonth
export type VoiceCommand = S.VoiceCommand
export type Chat = S.Chat
export type Me = S.Me
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

/** The API's error body ({"error": {code, message, details}}) as an ApiError. */
function apiError(status: number, body: unknown): ApiError {
  if (status === 401 && typeof window !== "undefined")
    window.dispatchEvent(new Event(SIGNED_OUT))
  const error =
    (body as { error?: { code?: string; message?: string; details?: unknown } })
      ?.error ?? {}
  return new ApiError(
    status,
    error.code ?? "NETWORK",
    error.message ?? "Kuch gadbad ho gayi.",
    error.details
  )
}

// With no response (offline, aborted) the fetch error is passed on as it is.
client.interceptors.error.use((error, response) =>
  response ? apiError(response.status, error) : error
)

/** The body of a generated call, which resolves to { data, request, response }. */
export const data = <T>(call: Promise<{ data: T }>) => call.then((r) => r.data)

export type Progress = {
  onId: (id: number) => void
  onStage: (stage: string, ms: number) => void
  signal: AbortSignal
}

/** A voice command with live progress: `start` makes the call with `?progress=1` and `parseAs: "stream"`. The API
 *  streams the command's id ({"id": 42}), then one JSON line per pipeline stage as it finishes
 *  ({"stage": "stt", "ms": 1749}), then {"command": …} or {"error": …}. */
export async function apiProgress(
  start: (signal: AbortSignal) => Promise<{ data: unknown }>,
  { onId, onStage, signal }: Progress
): Promise<VoiceCommand> {
  const { data: body } = await start(signal)
  const lines = (body as NonNullable<Response["body"]>)
    .pipeThrough(new TextDecoderStream())
    .getReader()
  let buffer = ""
  for (;;) {
    const { value, done } = await lines.read()
    if (done) break
    buffer += value
    for (let end = buffer.indexOf("\n"); end >= 0; end = buffer.indexOf("\n")) {
      const event = JSON.parse(buffer.slice(0, end))
      buffer = buffer.slice(end + 1)
      if (event.command) return event.command as VoiceCommand
      if (event.error) throw apiError(409, event)
      if (event.id) onId(event.id)
      else onStage(event.stage, event.ms)
    }
  }
  throw apiError(502, {})
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
