"use client"

import * as React from "react"
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query"

import { BoloScreen } from "@/components/app/bolo"
import { DashboardScreen } from "@/components/app/dashboard"
import {
  keys,
  preload,
  useMe,
  useStrings,
  useSummary,
  write,
} from "@/components/app/data"
import { EntriesScreen } from "@/components/app/entries"
import { I18nProvider, useI18n } from "@/components/app/i18n"
import {
  ArrowIcon,
  BellIcon,
  LogoMark,
  MoonIcon,
  SunIcon,
} from "@/components/app/icons"
import { KhataScreen } from "@/components/app/khata"
import { SCREEN_FLIP, type Screen } from "@/components/app/khata-data"
import { photoSrc, savePhoto } from "@/components/app/photo"
import { LanguagePicker } from "@/components/app/language-picker"
import { LayoutContext, layoutFor } from "@/components/app/layout"
import { LoginScreen } from "@/components/app/login"
import { Rail } from "@/components/app/rail"
import { ShellContext } from "@/components/app/shell"
import { StaffScreen } from "@/components/app/staff"
import { StockScreen } from "@/components/app/stock"
import { useTheme } from "@/components/app/theme"
import { useScreenMorph } from "@/components/app/use-screen-morph"
import { Tip } from "@/components/app/parts"
import { ApiError, SIGNED_OUT, api, type Me } from "@/lib/api"
import { reduceMotion } from "@/lib/motion"
import { ProgressBar } from "@/components/app/progress-bar"
import { cn } from "@/lib/utils"

// Language, session and the shop's words: what the app must not cache across screens' writes.
const KEPT = new Set(["me", "strings", "languages"])

const frame = () =>
  new Promise<void>((done) =>
    requestAnimationFrame(() => requestAnimationFrame(() => done()))
  )

export function KhataApp() {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (count, error) =>
              !(error instanceof ApiError && error.status < 500) && count < 2,
          },
        },
      })
  )
  return (
    <QueryClientProvider client={client}>
      <Gate />
    </QueryClientProvider>
  )
}

const GUEST_LANGUAGE = "kf-language"
const readGuest = () => {
  try {
    return localStorage.getItem(GUEST_LANGUAGE) ?? "en-IN"
  } catch {
    return "en-IN"
  }
}

/** Signed in → the app in the shop's language; signed out → sign-in and register in the language picked
 *  there (English until one is picked), which a sign-in then saves to the shop. */
function Gate() {
  const client = useQueryClient()
  const me = useMe()
  const [guest, setGuest] = React.useState("en-IN")
  const picked = React.useRef(false)
  React.useEffect(() => queueMicrotask(() => setGuest(readGuest())), [])
  const code = me.data?.shop.preferred_language ?? guest
  const strings = useStrings(code)

  React.useEffect(() => {
    const signedOut = () => client.setQueryData(keys.me, null)
    window.addEventListener(SIGNED_OUT, signedOut)
    return () => window.removeEventListener(SIGNED_OUT, signedOut)
  }, [client])

  const pickGuest = async (next: string) => {
    picked.current = true
    await client.prefetchQuery({
      queryKey: keys.strings(next),
      queryFn: () => api<Record<string, string>>(`i18n/${next}`),
    })
    setGuest(next)
    try {
      localStorage.setItem(GUEST_LANGUAGE, next)
    } catch {}
  }

  const signedIn = async (session: Me) => {
    let current = session
    if (picked.current && session.shop.preferred_language !== guest)
      current = await write.setLanguage(guest).catch(() => session)
    client.setQueryData(keys.me, current)
  }

  if (me.isPending || !strings.data) return <Splash />
  if (!me.data)
    return (
      <I18nProvider code={code} strings={strings.data}>
        <LoginScreen onSignedIn={signedIn} onLanguage={pickGuest} />
      </I18nProvider>
    )
  return (
    <I18nProvider code={code} strings={strings.data}>
      <App me={me.data} />
    </I18nProvider>
  )
}

function Splash() {
  return (
    <div
      role="status"
      className="kf-app grid h-dvh place-items-center bg-background"
    >
      <span className="animate-pulse motion-reduce:animate-none">
        <LogoMark size={60} ring="var(--canvas)" />
      </span>
    </div>
  )
}

function App({ me }: { me: Me }) {
  const client = useQueryClient()
  const { t, locale, code } = useI18n()
  const [screen, setScreen] = React.useState<Screen>("dash")
  const [nav, setNav] = React.useState<Screen>("dash")
  const [size, setSize] = React.useState({ w: 1400, h: 900 })
  const [theme, toggleTheme] = useTheme()
  const [customerId, setCustomerId] = React.useState<number | null>(null)
  const [said, setSaid] = React.useState<string | null>(null)
  const frameRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const layout = React.useMemo(() => layoutFor(size.w, size.h), [size])
  const summary = useSummary()
  const { go, freezeRolls, rollTexts } = useScreenMorph<Screen>({
    contentRef,
    screen,
    setScreen,
    setNav,
    flipIds: SCREEN_FLIP,
    load: (s) => preload(client, s),
  })

  // Writes in flight, for the top progress bar (reads it gets from React Query).
  const [saving, setSaving] = React.useState(0)
  const run = React.useCallback(
    async <R,>(fn: () => Promise<R>) => {
      if (!reduceMotion()) freezeRolls()
      setSaving((n) => n + 1)
      try {
        const result = await fn()
        await client.invalidateQueries({
          predicate: (q) => !KEPT.has(String(q.queryKey[0])),
        })
        return result
      } finally {
        setSaving((n) => n - 1)
        await frame()
        rollTexts()
      }
    },
    [client, freezeRolls, rollTexts]
  )

  React.useLayoutEffect(() => {
    const el = frameRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) =>
      setSize({
        w: Math.round(e.contentRect.width),
        h: Math.round(e.contentRect.height),
      })
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const signOut = async () => {
    await fetch("/api/session", { method: "DELETE" })
    // clear() first would detach the screen from the session query, so it would never hear it end.
    client.setQueryData(keys.me, null)
    client.removeQueries({ predicate: (q) => q.queryKey[0] !== keys.me[0] })
  }

  const setLanguage = async (next: string) => {
    if (next === code) return
    if (!reduceMotion()) freezeRolls()
    setSaving((n) => n + 1)
    try {
      const [session] = await Promise.all([
        write.setLanguage(next),
        client.prefetchQuery({ queryKey: keys.strings(next) }),
      ])
      client.setQueryData(keys.me, session)
    } finally {
      setSaving((n) => n - 1)
    }
    await frame()
    rollTexts()
  }

  const shell = React.useMemo(
    () => ({
      go,
      run,
      openCustomer: (id: number) => (setCustomerId(id), go("khata")),
      customerId,
      setCustomerId,
      said,
      setSaid,
    }),
    [go, run, customerId, said]
  )

  const { phone, narrow, compact } = layout
  const today = new Date()
  const subtitle =
    screen === "dash"
      ? today.toLocaleDateString(locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : t(`screen.${screen}.sub`)
  const shop = me.shop.name
  const lowCount = summary.data?.low_stock.length ?? 0

  return (
    <LayoutContext value={layout}>
      <ShellContext value={shell}>
        <ProgressBar saving={saving > 0} />
        <div
          ref={frameRef}
          className={cn(
            "kf-app flex h-dvh gap-[10px] overflow-hidden p-[10px]",
            phone &&
              "flex-col-reverse pb-[max(10px,env(safe-area-inset-bottom))]"
          )}
        >
          <Rail
            nav={nav}
            go={go}
            logOut={signOut}
            shop={{ name: shop, photo: photoSrc("me", me.shop.photo_key) }}
            saveShopPhoto={(change) =>
              run(async () => {
                const session = await savePhoto<Me>("me", change)
                if (session) client.setQueryData(keys.me, session)
              })
            }
          />

          <main
            data-morph-root
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-[10px]"
          >
            <header className="flex flex-wrap items-center gap-[10px]">
              <div
                className={cn(
                  "min-w-0 pr-3",
                  narrow ? "flex-1" : "min-w-[200px] flex-[0_0_auto]"
                )}
              >
                <h1
                  data-roll="title"
                  className={cn(
                    "leading-none font-light tracking-[-0.03em]",
                    phone ? "text-[34px]" : "text-5xl"
                  )}
                >
                  {t(`screen.${screen}.title`)}
                </h1>
                {!phone && (
                  <p
                    data-roll="sub"
                    className="mt-1.5 text-sm text-muted-foreground"
                  >
                    {subtitle}
                  </p>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const box = e.currentTarget.elements.namedItem(
                    "say"
                  ) as HTMLInputElement
                  const text = box.value.trim()
                  if (!text) return
                  setSaid(text)
                  box.value = ""
                  go("bolo")
                }}
                className={cn(
                  "flex items-center gap-[10px] rounded-full bg-white py-1.5 pr-1.5 pl-5 text-black",
                  narrow ? "order-last basis-full" : "min-w-[320px] flex-1"
                )}
              >
                {!phone && (
                  <span className="max-w-[220px] truncate text-sm font-medium whitespace-nowrap">
                    {shop}
                  </span>
                )}
                {!compact && (
                  <span className="rounded-full bg-[#e5e5e5] px-3.5 py-2 text-[13px] whitespace-nowrap">
                    {today.toLocaleDateString(locale, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                )}
                <input
                  name="say"
                  aria-label={t("header.sayLabel")}
                  placeholder={t("header.sayPlaceholder")}
                  maxLength={500}
                  className="h-10 min-w-0 flex-1 bg-transparent text-base text-black outline-none placeholder:text-black/50 sm:text-sm"
                />
                <Tip label={t("header.send")}>
                  <button
                    type="submit"
                    aria-label={t("header.send")}
                    className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-black text-white"
                  >
                    <ArrowIcon size={16} />
                  </button>
                </Tip>
              </form>
              <LanguagePicker
                value={code}
                onChange={setLanguage}
                compact={phone}
              />
              <Tip
                label={theme === "dark" ? t("header.light") : t("header.dark")}
              >
                <button
                  type="button"
                  aria-label={
                    theme === "dark" ? t("header.light") : t("header.dark")
                  }
                  onClick={toggleTheme}
                  className="grid size-[52px] cursor-pointer place-items-center rounded-full bg-card"
                >
                  {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                </button>
              </Tip>
              <Tip
                label={
                  lowCount
                    ? t("header.lowStock", { count: lowCount })
                    : t("header.noAlerts")
                }
              >
                <button
                  type="button"
                  aria-label={
                    lowCount
                      ? t("header.lowStock", { count: lowCount })
                      : t("header.noAlerts")
                  }
                  onClick={() => lowCount && go("stock")}
                  className="relative grid size-[52px] cursor-pointer place-items-center rounded-full bg-card"
                >
                  <BellIcon />
                  {lowCount > 0 && (
                    <span className="absolute top-3.5 right-[15px] size-2 rounded-full bg-red" />
                  )}
                </button>
              </Tip>
            </header>

            <div
              ref={contentRef}
              className={cn(
                "@container/content min-h-0 flex-1 overflow-y-auto overscroll-contain",
                // Half the corner buttons' size (44px on phones, 52px otherwise), so a button sitting in the
                // content's corner is never clipped by this rounding.
                phone ? "rounded-[22px]" : "rounded-[26px]"
              )}
            >
              {screen === "dash" && <DashboardScreen />}
              {screen === "khata" && <KhataScreen />}
              {screen === "stock" && <StockScreen />}
              {screen === "staff" && <StaffScreen />}
              {screen === "entries" && <EntriesScreen />}
              {screen === "bolo" && <BoloScreen />}
            </div>
          </main>
        </div>
      </ShellContext>
    </LayoutContext>
  )
}
