"use client"

import * as React from "react"
import { flushSync } from "react-dom"

import { reduceMotion } from "@/lib/motion"

type Theme = "dark" | "light"
const KEY = "kf-theme"

// Lead Flow's theme wipe: fast off the left edge, settling slowly, y = ln(1 + 15t) / ln(16) sampled into linear().
const WIPE_EASING = `linear(${Array.from({ length: 41 }, (_, i) => (Math.log1p((15 * i) / 40) / Math.log(16)).toFixed(4)).join(", ")})`

const stored = (): Theme => {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark"
  } catch {
    return "dark"
  }
}

const apply = (theme: Theme) => {
  const root = document.documentElement
  root.dataset.theme = theme
  root.classList.toggle("dark", theme === "dark")
  try {
    localStorage.setItem(KEY, theme)
  } catch {}
}

/** The light/dark theme, remembered on this device. Switching wipes the new theme in from the left
 *  (a native View Transition, not GSAP: a main-thread tween stutters while the page re-renders). */
export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>("dark")
  React.useEffect(() => {
    const saved = stored()
    apply(saved)
    if (saved !== "dark") queueMicrotask(() => setTheme(saved))
  }, [])

  const toggle = () => {
    const next: Theme = document.documentElement.classList.contains("dark") ? "light" : "dark"
    const swap = () => {
      apply(next)
      flushSync(() => setTheme(next))
    }
    if (reduceMotion() || !document.startViewTransition) return swap()
    const wipe = document.startViewTransition(swap)
    wipe.ready
      .then(() =>
        document.documentElement.animate(
          { clipPath: ["inset(0 100% 0 0)", "inset(0 0 0 0)"] },
          { duration: 700, easing: WIPE_EASING, pseudoElement: "::view-transition-new(root)" }
        )
      )
      .catch(() => {})
  }
  return [theme, toggle] as const
}
