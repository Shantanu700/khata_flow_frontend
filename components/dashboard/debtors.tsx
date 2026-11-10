"use client"

import * as React from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ArrowUpRight } from "lucide-react"

import { Notch } from "@/components/notch"
import { Segmented } from "@/components/segmented"
import type { Customer } from "@/lib/demo"
import { inr } from "@/lib/format"
import { EASE_OUT, reduceMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"

type Filter = "all" | "due" | "settled"
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Sab" },
  { value: "due", label: "Baaki wale" },
  { value: "settled", label: "Chukta" },
]
const HEAT = ["var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)", "var(--heat-5)"]

/** The reference's lead cards: one per customer, the biggest balance in lime. The five dots are
 *  the reference's interest scale, here how much of their udhaar has come back. */
export function Debtors({ customers }: { customers: Customer[] }) {
  const [filter, setFilter] = React.useState<Filter>("all")
  const list = React.useRef<HTMLUListElement>(null)
  const filtered = React.useRef(false)
  useGSAP(
    () => {
      // The first render is the dashboard's own entrance; only filter changes animate here.
      if (!filtered.current) return
      const cards = list.current?.querySelectorAll("[data-card]")
      if (!cards?.length) return
      gsap.from(cards, reduceMotion()
        ? { opacity: 0, duration: 0.2 }
        : { y: 16, opacity: 0, duration: 0.4, stagger: 0.05, ease: EASE_OUT, clearProps: "transform,opacity" })
    },
    { scope: list, dependencies: [filter] }
  )
  const shown = customers.filter((c) => (filter === "all" ? true : filter === "due" ? c.balance > 0 : c.balance <= 0))
  return (
    <section data-rise aria-labelledby="debtors-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <h2 id="debtors-title" className="text-2xl font-normal">
          Udhaar wale
        </h2>
        <span className="text-sm underline underline-offset-4">{customers.length} customers</span>
        <Segmented
          label="Customers filter"
          value={filter}
          onChange={(next) => {
            filtered.current = true
            setFilter(next)
          }}
          options={FILTERS}
          className="bg-card p-1"
        />
      </div>
      <ul ref={list} className="grid grid-cols-1 gap-panel sm:grid-cols-2 2xl:grid-cols-4">
        {shown.map((c, i) => (
          <DebtorCard key={`${filter}-${c.name}`} customer={c} highlight={filter !== "settled" && i === 0 && c.balance > 0} />
        ))}
        {!shown.length && (
          <li className="rounded-xl bg-card p-6 text-sm text-muted-foreground">Is filter mein koi customer nahi.</li>
        )}
      </ul>
    </section>
  )
}

export function DebtorCard({ customer: c, highlight }: { customer: Customer; highlight: boolean }) {
  const dots = Math.max(1, Math.ceil(c.repaid * 5))
  const initials = c.name.split(" ")[0].slice(0, 2)
  return (
    <li
      data-card
      className={cn("relative flex flex-col gap-5 rounded-xl p-5 pt-4", highlight ? "bg-lime text-black" : "bg-card")}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-11 place-items-center rounded-full text-sm font-semibold uppercase",
          highlight ? "bg-black/10" : "bg-raised"
        )}
      >
        {initials}
      </span>
      <Notch corner="tr" r={22} gap={6}>
        <button
          type="button"
          aria-label={`${c.name} ka khata kholo`}
          className="grid size-10 place-items-center rounded-full bg-card transition-transform duration-150 ease-out outline-none hover:rotate-45 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowUpRight aria-hidden className="size-4" />
        </button>
      </Notch>
      <div>
        <p className="text-xl">{c.name}</p>
        <p className={cn("text-sm", highlight ? "text-black/70" : "text-muted-foreground")}>
          {inr(c.given)} diya · {inr(c.paid)} mila
        </p>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={cn("text-xs", highlight ? "text-black/70" : "text-muted-foreground")}>Baaki</p>
          <p className="text-3xl leading-none font-light">{inr(c.balance)}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <p className={cn("text-[11px]", highlight ? "text-black/70" : "text-muted-foreground")}>
            {Math.round(c.repaid * 100)}% vasooli
          </p>
          <span
            role="img"
            aria-label={`${dots} of 5`}
            className={cn("flex gap-1 rounded-full p-1", highlight ? "bg-black/85" : "bg-canvas")}
          >
            {HEAT.map((color, i) => (
              <span key={i} className="size-2.5 rounded-full" style={{ background: i < dots ? color : "var(--raised)" }} />
            ))}
          </span>
        </div>
      </div>
    </li>
  )
}
