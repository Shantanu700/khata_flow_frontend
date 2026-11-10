"use client"

import * as React from "react"

import { LEVEL_MS, type Levels } from "@/components/app/live-mic"
import { cn } from "@/lib/utils"

const BAR = 3
const PITCH = 7
// The oldest bars fade out over this share of the width on the left.
const FADE = 0.3

/** The microphone's loudness as bars, newest at the right edge, flowing left and fading out. */
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
      g.lineCap = "round"
      g.lineWidth = BAR
      g.strokeStyle = getComputedStyle(el).color
      const { values, at } = levels.current
      // Slides the newest bar in over one sampling interval, so the scroll is continuous rather than stepped.
      const slide = Math.min(1, (now - at) / LEVEL_MS) * PITCH
      for (
        let i = values.length - 1, x = w - BAR / 2 - slide;
        i >= 0 && x > -BAR;
        i--, x -= PITCH
      ) {
        const half = Math.max(0, (values[i] * (h - BAR)) / 2)
        g.globalAlpha = Math.min(1, x / (w * FADE))
        g.beginPath()
        g.moveTo(x, h / 2 - half)
        g.lineTo(x, h / 2 + half)
        g.stroke()
      }
      g.globalAlpha = 1
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [levels])

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className={cn("block h-10 w-full", className)}
    />
  )
}
