import * as React from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"

import { reduceMotion } from "@/lib/motion"

gsap.registerPlugin(useGSAP, Flip)

/** Lead Flow's in-place list motion (hooks/use-dashboard-motion.ts): rows (`data-flip-id="row-…"`)
 *  glide to their new order after a sort, filter, search or page change (0.3s), new rows fade in,
 *  and a chip highlight (`data-chip-pill`) slides from the old chip to the new one.
 *  Call `capture()` (and `chipFrom(group)` for chips) in the handler, before the state change. */
export function useListMotion(
  scope: React.RefObject<HTMLElement | null>,
  deps: unknown[]
) {
  const rows = React.useRef<Flip.FlipState | null>(null)
  const chip = React.useRef<DOMRect | null>(null)
  const rowEls = () =>
    scope.current?.querySelectorAll<HTMLElement>('[data-flip-id^="row-"]') ?? []

  useGSAP(
    () => {
      const from = rows.current
      const old = chip.current
      rows.current = null
      chip.current = null
      if (reduceMotion()) return
      if (from)
        Flip.from(from, {
          targets: rowEls(),
          duration: 0.3,
          ease: "power3.inOut",
          onEnter: (els) =>
            gsap.fromTo(
              els,
              { opacity: 0 },
              { opacity: 1, duration: 0.2, delay: 0.1, clearProps: "opacity" }
            ),
        })
      const pill = scope.current?.querySelector<HTMLElement>("[data-chip-pill]")
      if (old && pill) {
        const now = pill.getBoundingClientRect()
        gsap.fromTo(
          pill,
          {
            x: old.left - now.left,
            y: old.top - now.top,
            width: old.width,
            height: old.height,
          },
          {
            x: 0,
            y: 0,
            width: now.width,
            height: now.height,
            duration: 0.3,
            ease: "power3.inOut",
            clearProps: "transform,width,height",
          }
        )
      }
    },
    { scope, dependencies: deps }
  )

  return {
    capture: () => {
      rows.current = Flip.getState(rowEls())
    },
    chipFrom: (group: Element | null) => {
      chip.current =
        group?.querySelector("[data-chip-pill]")?.getBoundingClientRect() ??
        null
    },
  }
}
