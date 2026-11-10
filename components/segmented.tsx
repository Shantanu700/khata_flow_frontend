"use client"

import * as React from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

import { EASE_IN_OUT, reduceMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"

/** Pill toggle whose highlight slides to the chosen option (Lead Flow's Segmented): the
 *  highlight renders inside the active button, then tweens from where the old one was. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  surface = "dark",
  className,
  itemClassName,
}: {
  options: readonly { value: T; label: React.ReactNode }[]
  value: T
  onChange: (value: T) => void
  /** Accessible name for the group. */
  label: string
  /** What the toggle sits on, for the inactive labels' colour. */
  surface?: "dark" | "light"
  className?: string
  itemClassName?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const from = React.useRef<DOMRect | null>(null)
  const pill = () => ref.current?.querySelector<HTMLElement>("[data-seg-pill]")

  useGSAP(
    () => {
      const old = from.current
      from.current = null
      const el = pill()
      if (!old || !el || reduceMotion()) return
      const now = el.getBoundingClientRect()
      gsap.fromTo(
        el,
        { x: old.left - now.left, width: old.width },
        { x: 0, width: now.width, duration: 0.4, ease: EASE_IN_OUT, clearProps: "transform,width" }
      )
    },
    { scope: ref, dependencies: [value] }
  )

  return (
    <div ref={ref} role="group" aria-label={label} className={cn("flex max-w-full gap-1 overflow-x-auto rounded-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      {options.map((option) => {
        const on = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => {
              if (on) return
              from.current = pill()?.getBoundingClientRect() ?? null
              onChange(option.value)
            }}
            className={cn(
              "relative cursor-pointer rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on && "text-black",
              !on && (surface === "dark" ? "text-muted-foreground hover:text-foreground" : "text-black/60 hover:text-black"),
              itemClassName
            )}
          >
            {on && (
              <span
                data-seg-pill
                aria-hidden
                className="absolute inset-y-0 left-0 w-full rounded-full bg-lime"
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
