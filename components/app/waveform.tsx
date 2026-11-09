"use client"

import * as React from "react"

import { LEVEL_MS, type Levels } from "@/components/app/live-mic"
import { cn } from "@/lib/utils"

const BAR = 3
const PITCH = 6
const PLAYHEAD = 0.72
// The not-yet-spoken bars right of the playhead: a fixed, speech-like pattern.
const AHEAD = Array.from(
  { length: 64 },
  (_, i) => 0.18 + 0.32 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6))
)

/** The microphone's loudness as bars: what was said scrolls left of the playhead, quiet bars wait to its right. */
export function Waveform({
  levels,
  className,
}: {
  levels: React.RefObject<Levels>
  className?: string
}) {
  const canvas = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const el = canvas.current
    const g = el?.getContext("2d")
    if (!el || !g) return
    let frame = 0
    const draw = (now: number) => {
      const dpr = window.devicePixelRatio || 1
      const w = el.clientWidth
      const h = el.clientHeight
      if (el.width !== w * dpr || el.height !== h * dpr) {
        el.width = w * dpr
        el.height = h * dpr
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)
      const style = getComputedStyle(el)
      const ink = style.getPropertyValue("--foreground").trim() || "#fff"
      const quiet = style.getPropertyValue("--hairline").trim() || "#5f5f5f"
      g.lineCap = "round"
      g.lineWidth = BAR
      const head = Math.round(w * PLAYHEAD)
      const bar = (x: number, level: number, color: string) => {
        const half = Math.max(BAR / 2, (level * (h - BAR)) / 2)
        g.strokeStyle = color
        g.beginPath()
        g.moveTo(x, h / 2 - half)
        g.lineTo(x, h / 2 + half)
        g.stroke()
      }
      const { values, at } = levels.current
      // Slides the newest bar in over one sampling interval, so the scroll is continuous rather than stepped.
      const slide = Math.min(1, (now - at) / LEVEL_MS) * PITCH
      for (
        let i = values.length - 1, x = head - slide;
        i >= 0 && x > -BAR;
        i--, x -= PITCH
      ) {
        bar(x, values[i], ink)
      }
      g.globalAlpha = 0.45
      for (let i = 0, x = head + PITCH; x < w + BAR; i++, x += PITCH)
        bar(x, AHEAD[i % AHEAD.length], quiet)
      g.globalAlpha = 1
      g.fillStyle = ink
      g.fillRect(head + PITCH / 2 - 1, 2, 2, h - 4)
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [levels])

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className={cn("block h-12 w-full", className)}
    />
  )
}
