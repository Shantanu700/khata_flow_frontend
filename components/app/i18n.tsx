"use client"

import * as React from "react"

import { daysAgo, parseDay } from "@/lib/api"

type Vars = Record<string, string | number | null | undefined>
export type T = (key: string, vars?: Vars) => string

/** hi-Latn is Hinglish in Latin script; its dates and numbers read like en-IN. */
export const localeOf = (code: string) => (code === "hi-Latn" ? "en-IN" : code)

type I18n = { code: string; locale: string; t: T }
const I18nContext = React.createContext<I18n>({
  code: "hi-Latn",
  locale: "en-IN",
  t: (key) => key,
})

/** The screens' words come from the API (GET /i18n/<code>/), one catalog per language. */
export function I18nProvider({
  code,
  strings,
  children,
}: {
  code: string
  strings: Record<string, string>
  children: React.ReactNode
}) {
  const value = React.useMemo<I18n>(
    () => ({
      code,
      locale: localeOf(code),
      t: (key, vars) =>
        (strings[key] ?? key).replace(/\{(\w+)\}/g, (_, name) =>
          String(vars?.[name] ?? "")
        ),
    }),
    [code, strings]
  )
  React.useEffect(() => {
    document.documentElement.lang = localeOf(code)
  }, [code])
  return <I18nContext value={value}>{children}</I18nContext>
}

export const useI18n = () => React.useContext(I18nContext)

/** "Aaj", "Kal", or a short date such as "9 Nov" in the shop's language. */
export function dayLabel(iso: string, t: T, locale: string) {
  const ago = daysAgo(iso)
  if (ago === 0) return t("day.today")
  if (ago === 1) return t("day.yesterday")
  return parseDay(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  })
}

/** Quantities without trailing zeros: 12, 2.5. */
export const qty = (n: number | null | undefined) => String(Number(n ?? 0))

/** A write's refusal in the shop's language: `error.<CODE>` when the catalog has it, else the server's message. */
export function errorText(error: unknown, t: T, vars?: Vars) {
  const code = (error as { code?: string })?.code
  if (code === "NETWORK") return t("error.offline")
  const details = (error as { details?: Record<string, unknown> })?.details
  if (code === "VALIDATION_ERROR" && details?.name)
    return t("error.duplicateName", vars)
  const key = `error.${code}`
  const text = code ? t(key, vars) : key
  return text !== key ? text : (error as Error)?.message || t("error.generic")
}
