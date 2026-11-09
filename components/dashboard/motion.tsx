"use client"

import * as React from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

import { inr } from "@/lib/format"
import { EASE_OUT, reduceMotion } from "@/lib/motion"

gsap.registerPlugin(useGSAP)

const FORMATS = { inr: (n: number) => inr(Math.round(n)), int: (n: number) => Math.round(n).toString() }

/** Animated number: counts from where this `id` last stood (0 the first time) to `value`.
 *  Keyed by value so React never writes into a text node GSAP has replaced. */
export function Count({ id, value, format = "inr" }: { id: string; value: number; format?: keyof typeof FORMATS }) {
  return (
    <span key={value} data-count={value} data-count-id={id} data-format={format}>
      {FORMATS[format](value)}
    </span>
  )
}

/** Text that rises into its box behind a mask when it changes (Lead Flow's data-roll, entering half). */
export function RollText({ children, rollKey, className }: { children: React.ReactNode; rollKey: string; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const shown = React.useRef(rollKey)
  useGSAP(
    () => {
      if (shown.current === rollKey) return
      shown.current = rollKey
      if (reduceMotion()) gsap.from(ref.current, { opacity: 0, duration: 0.2 })
      else gsap.from(ref.current, { yPercent: 100, opacity: 0, duration: 0.45, ease: EASE_OUT })
    },
    { dependencies: [rollKey] }
  )
  return (
    <span className={`inline-flex overflow-hidden pb-[0.12em] align-bottom ${className ?? ""}`}>
      <span ref={ref} className="inline-block">
        {children}
      </span>
    </span>
  )
}

/** The dashboard's entrance and shop-switch motion, Lead Flow style:
 *  panels rise in (first load only), figures count, bars grow from their baseline,
 *  cards and rows arrive. Reduced motion keeps only the fades. */
export function useDashboardMotion(scope: React.RefObject<HTMLElement | null>, shopId: string) {
  // Decided from state that survives React's dev double-run of effects: the first shop shown,
  // and whether the user has switched since. A flag set inside the effect would make the
  // second dev run think the intro had already played.
  const firstShop = React.useRef(shopId)
  const switched = React.useRef(false)
  const lastValues = React.useRef(new Map<string, number>())

  useGSAP(
    () => {
      if (shopId !== firstShop.current) switched.current = true
      const intro = !switched.current
      const q = gsap.utils.selector(scope)
      const mm = gsap.matchMedia()

      mm.add({ full: "(prefers-reduced-motion: no-preference)", reduced: "(prefers-reduced-motion: reduce)" }, (ctx) => {
        const full = Boolean(ctx.conditions?.full)
        const start = intro ? 0.25 : 0
        const counters: [HTMLElement, string][] = []

        if (intro) {
          gsap.from(q("[data-rise]"), full
            ? { y: 28, opacity: 0, duration: 0.7, stagger: 0.06, ease: EASE_OUT, clearProps: "transform,opacity" }
            : { opacity: 0, duration: 0.3, clearProps: "opacity" })
        }

        for (const el of q("[data-count]") as HTMLElement[]) {
          const id = el.dataset.countId!
          const to = Number(el.dataset.count)
          const format = FORMATS[el.dataset.format as keyof typeof FORMATS] ?? inr
          const from = intro ? 0 : (lastValues.current.get(id) ?? to)
          lastValues.current.set(id, to)
          counters.push([el, format(to)])
          if (!full || from === to) continue
          const tween = { value: from }
          // The start value is written on the first frame, not now: where frames never run
          // (screenshots, thumbnails, a background tab) the real figure stays on screen.
          gsap.to(tween, {
            value: to,
            duration: 1.1,
            ease: EASE_OUT,
            onStart: () => void (el.textContent = format(from)),
            onUpdate: () => void (el.textContent = format(tween.value)),
          })
        }

        if (full) {
          gsap.fromTo(q("[data-bar-v]"), { clipPath: "inset(100% 0 0 0)" },
            { clipPath: "inset(0% 0 0 0)", duration: 0.6, stagger: 0.02, delay: start + 0.1, ease: EASE_OUT, clearProps: "clipPath" })
          gsap.fromTo(q("[data-bar-h]"), { clipPath: "inset(0 100% 0 0)" },
            { clipPath: "inset(0 0% 0 0)", duration: 0.7, stagger: 0.05, delay: start + 0.1, ease: EASE_OUT, clearProps: "clipPath" })
          gsap.from(q("[data-card]"), { y: 18, opacity: 0, duration: 0.5, stagger: 0.05, delay: start, ease: EASE_OUT, clearProps: "transform,opacity" })
          gsap.from(q("[data-row]"), { x: -14, opacity: 0, duration: 0.4, stagger: 0.03, delay: start + 0.15, ease: EASE_OUT, clearProps: "transform,opacity" })
        } else {
          gsap.from(q("[data-card],[data-row]"), { opacity: 0, duration: 0.3, clearProps: "opacity" })
        }
        // Reverting kills the count tweens mid-way; put the final figures back.
        return () => counters.forEach(([el, text]) => void (el.textContent = text))
      })
      return () => mm.revert()
    },
    { scope, dependencies: [shopId] }
  )
}
