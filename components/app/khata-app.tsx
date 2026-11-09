"use client"

import * as React from "react"
import { flushSync } from "react-dom"
import { useGSAP } from "@gsap/react"

import { BoloScreen } from "@/components/app/bolo"
import { DashboardScreen } from "@/components/app/dashboard"
import { EntriesScreen } from "@/components/app/entries"
import { ArrowIcon, BellIcon, GlobeIcon, MoonIcon, SunIcon } from "@/components/app/icons"
import { KhataScreen, type Money, type NewCustomer } from "@/components/app/khata"
import { DEMOS, LANGS, SCREEN_FLIP, SEED_ROWS, TITLES, deriveBook, type Product, type Row, type Screen } from "@/components/app/khata-data"
import { LayoutContext, layoutFor } from "@/components/app/layout"
import { LoginScreen } from "@/components/app/login"
import { Rail } from "@/components/app/rail"
import { StaffScreen } from "@/components/app/staff"
import { StockScreen, type NewProduct } from "@/components/app/stock"
import { useScreenMorph } from "@/components/app/use-screen-morph"
import { reduceMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"

// Lead Flow's theme wipe: fast off the left edge, settling slowly, y = ln(1 + 15t) / ln(16) sampled into linear().
const WIPE_EASING = `linear(${Array.from({ length: 41 }, (_, i) => (Math.log1p((15 * i) / 40) / Math.log(16)).toFixed(4)).join(", ")})`

export type Phase = "listening" | "working" | "done"

export function KhataApp() {
  const [screen, setScreen] = React.useState<Screen | "login">("dash")
  const [nav, setNav] = React.useState<Screen>("dash")
  const [size, setSize] = React.useState({ w: 1400, h: 900 })
  const [theme, setTheme] = React.useState<"dark" | "light">("dark")
  const [lang, setLang] = React.useState(0)
  const [customer, setCustomer] = React.useState("Sharma ji")
  const [filter, setFilter] = React.useState("all")
  const [extra, setExtra] = React.useState<Row[]>([])
  const [added, setAdded] = React.useState<Record<string, Product>>({})
  const [hired, setHired] = React.useState<Record<string, number>>({})
  const [removed, setRemoved] = React.useState<string[]>([])
  const [joined, setJoined] = React.useState<Record<string, string[] | null>>({})
  const [here, setHere] = React.useState<string[]>([])
  const [demo, setDemo] = React.useState(0)
  const [phase, setPhase] = React.useState<Phase>("done")
  const [step, setStep] = React.useState(5)
  const [picked, setPicked] = React.useState<string | null>(null)
  const timers = React.useRef<number[]>([])
  const frameRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const layout = React.useMemo(() => layoutFor(size.w, size.h), [size])
  const { go: morphTo, freezeRolls, rollTexts } = useScreenMorph<Screen>({
    contentRef,
    screen: screen === "login" ? "dash" : screen,
    setScreen,
    setNav,
    flipIds: SCREEN_FLIP,
  })

  const book = React.useMemo(() => deriveBook(extra, customer, filter, added, hired, removed, joined, here), [extra, customer, filter, added, hired, removed, joined, here])

  // In-place changes (a save, an undo, another customer) roll the figures they change, like Lead Flow's period roll.
  // The tick forces a render even when nothing changed (e.g. the selected customer tapped again), so
  // frozen copies always roll out and the real text is shown again.
  const [rollTick, setRollTick] = React.useState(0)
  const rolling = React.useRef(false)
  const rolled = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => {
    if (!reduceMotion()) {
      freezeRolls()
      rolling.current = true
      setRollTick((t) => t + 1)
    }
    fn(...a)
  }
  useGSAP(
    () => {
      if (!rolling.current) return
      rolling.current = false
      rollTexts()
    },
    { dependencies: [book, rollTick] }
  )

  React.useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.classList.toggle("dark", theme === "dark")
  }, [theme])
  React.useEffect(() => () => timers.current.forEach(window.clearTimeout), [])
  const loggedOut = screen === "login"
  React.useLayoutEffect(() => {
    const el = frameRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [loggedOut])

  const toggleTheme = () => {
    const root = document.documentElement
    const next = root.classList.contains("dark") ? "light" : "dark"
    const apply = () => {
      root.dataset.theme = next
      root.classList.toggle("dark", next === "dark")
      flushSync(() => setTheme(next))
    }
    if (reduceMotion() || !document.startViewTransition) return apply()
    const t = document.startViewTransition(apply)
    t.ready
      .then(() =>
        root.animate(
          { clipPath: ["inset(0 100% 0 0)", "inset(0 0 0 0)"] },
          { duration: 700, easing: WIPE_EASING, pseudoElement: "::view-transition-new(root)" }
        )
      )
      .catch(() => {})
  }

  const addRow = (row: Omit<Row, "id">) => setExtra((rows) => [...rows, { ...row, id: SEED_ROWS.length + rows.length + 1 }])
  const saveProduct = ({ name, unit, thr, opening }: NewProduct) => {
    setAdded((p) => ({ ...p, [name]: { unit, thr } }))
    setRemoved((r) => r.filter((n) => n !== name))
    if (opening > 0) addRow({ d: 0, kind: "STOCK_IN", name, val: opening, rev: null, src: "Haath se" })
  }
  const deleteProduct = (name: string) => setRemoved((r) => [...r, name])
  const saveStaff = (name: string, salary: number) => setHired((h) => ({ ...h, [name]: salary }))
  const saveCustomer = ({ name, aliases, opening }: NewCustomer) => {
    setJoined((j) => ({ ...j, [name]: aliases }))
    if (opening > 0) addRow({ d: 0, kind: "CREDIT_GIVEN", name, val: opening, rev: null, src: "Haath se" })
    setCustomer(name)
  }
  const deleteCustomer = (name: string) => {
    setJoined((j) => ({ ...j, [name]: null }))
    setCustomer(book.customers.find((c) => c.name !== name)?.name ?? "")
  }
  const record = (name: string, kind: Money, val: number) => addRow({ d: 0, kind, name, val, rev: null, src: "Haath se" })
  const markPresent = (name: string) => setHere((h) => (h.includes(name) ? h.filter((n) => n !== name) : [...h, name]))
  const giveAdvance = (name: string, val: number) => addRow({ d: 0, kind: "STAFF_ADVANCE", name, val, rev: null, src: "Haath se" })
  const undo = (id: number) => addRow({ d: 0, kind: "REVERSAL", name: null, val: null, rev: id, src: "Haath se" })

  const speak = (next: boolean) => {
    if (phase === "listening" || phase === "working") return
    timers.current.forEach(window.clearTimeout)
    timers.current = []
    setDemo((current) => (next ? (current + 1) % DEMOS.length : current))
    setPhase("listening")
    setStep(-1)
    setPicked(null)
    timers.current.push(window.setTimeout(() => (setPhase("working"), setStep(0)), 1400))
    for (const i of [1, 2, 3, 4, 5]) {
      timers.current.push(window.setTimeout(() => (setStep(i), setPhase(i === 5 ? "done" : "working")), 1400 + i * 380))
    }
  }
  const pick = (name: string) => {
    setPicked(name)
    addRow({ d: 0, kind: "CREDIT_GIVEN", name, val: 300, rev: null, src: "Bola" })
  }

  if (screen === "login") return <LoginScreen onEnter={() => (setNav("dash"), setScreen("dash"))} />

  const current = LANGS[lang]
  const [title, subtitle] = TITLES[current.id][screen]
  const go = (to: Screen) => morphTo(to)
  const { phone, narrow, compact } = layout

  return (
    <LayoutContext value={layout}>
    <div
      ref={frameRef}
      className={cn(
        "kf-app flex h-dvh gap-[10px] overflow-hidden p-[10px]",
        phone && "flex-col-reverse pb-[max(10px,env(safe-area-inset-bottom))]"
      )}
    >
      <Rail nav={nav} go={go} logOut={() => setScreen("login")} />

      <main data-morph-root className="flex min-h-0 min-w-0 flex-1 flex-col gap-[10px]">
        <header className="flex flex-wrap items-center gap-[10px]">
          <div className={cn("min-w-0 pr-3", narrow ? "flex-1" : "min-w-[200px] flex-[0_0_auto]")}>
            <h1 data-roll="title" className={cn("leading-none font-light tracking-[-0.03em]", phone ? "text-[34px]" : "text-5xl")}>
              {title}
            </h1>
            {!phone && (
              <p data-roll="sub" className="mt-1.5 text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex items-center gap-[10px] rounded-full bg-white py-1.5 pr-1.5 pl-5 text-black",
              narrow ? "order-last basis-full" : "min-w-[320px] flex-1"
            )}
          >
            {!phone && <span className="text-sm font-medium whitespace-nowrap">Gupta General Store</span>}
            {!compact && <span className="rounded-full bg-[#e5e5e5] px-3.5 py-2 text-[13px] whitespace-nowrap">Som, 9 Nov</span>}
            <input
              aria-label="Likh ke bataiye"
              placeholder={current.search}
              className="h-10 min-w-0 flex-1 bg-transparent text-base text-black outline-none placeholder:text-black/50 sm:text-sm"
            />
            <button
              type="button"
              title="Bhejo"
              aria-label="Bhejo"
              onClick={() => go("bolo")}
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-black text-white"
            >
              <ArrowIcon size={16} />
            </button>
          </div>
          <button
            type="button"
            title="Bhasha badlo"
            aria-label={`Bhasha badlo: ${current.label}`}
            onClick={() => setLang((l) => (l + 1) % LANGS.length)}
            className={cn(
              "flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full bg-card text-sm",
              phone ? "w-[52px]" : "px-[18px]"
            )}
          >
            <GlobeIcon />
            {!phone && current.label}
          </button>
          <button
            type="button"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
            onClick={toggleTheme}
            className="grid size-[52px] cursor-pointer place-items-center rounded-full bg-card"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            type="button"
            title="Suchnayein"
            aria-label="Suchnayein"
            className="relative grid size-[52px] cursor-pointer place-items-center rounded-full bg-card"
          >
            <BellIcon />
            <span className="absolute top-3.5 right-[15px] size-2 rounded-full bg-red" />
          </button>
        </header>

        <div ref={contentRef} className={cn(
            "@container/content min-h-0 flex-1 overflow-y-auto overscroll-contain",
            // Half the corner buttons' size (44px on phones, 52px otherwise), so a button sitting in the
            // content's corner is never clipped by this rounding.
            phone ? "rounded-[22px]" : "rounded-[26px]"
          )}>
          {screen === "dash" && <DashboardScreen book={book} go={go} openCustomer={(n) => (setCustomer(n), go("khata"))} />}
          {screen === "khata" && (
            <KhataScreen
              book={book}
              pickCustomer={rolled(setCustomer)}
              undo={rolled(undo)}
              go={go}
              saveCustomer={rolled(saveCustomer)}
              deleteCustomer={rolled(deleteCustomer)}
              record={rolled(record)}
            />
          )}
          {screen === "stock" && <StockScreen book={book} saveProduct={rolled(saveProduct)} deleteProduct={rolled(deleteProduct)} />}
          {screen === "staff" && <StaffScreen book={book} saveStaff={rolled(saveStaff)} markPresent={markPresent} giveAdvance={rolled(giveAdvance)} />}
          {screen === "entries" && <EntriesScreen book={book} filter={filter} setFilter={rolled(setFilter)} undo={rolled(undo)} />}
          {screen === "bolo" && (
            <BoloScreen
              book={book}
              demo={demo}
              phase={phase}
              step={step}
              picked={picked}
              onSpeak={() => speak(false)}
              onNext={() => speak(true)}
              onPick={pick}
            />
          )}
        </div>
      </main>
    </div>
    </LayoutContext>
  )
}
