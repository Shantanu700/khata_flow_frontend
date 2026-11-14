import * as React from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"

import { reduceMotion } from "@/lib/motion"

// Browser only: registering starts GSAP's ticker, and Workers allow no timers while a module loads on the server.
if (typeof window !== "undefined") gsap.registerPlugin(useGSAP, Flip)

// Dev only: slow everything down from the console with gsap.globalTimeline.timeScale(0.2).
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined")
  (window as unknown as { gsap: typeof gsap }).gsap = gsap

/** Lead Flow's tab switch (hooks/use-view-morph.ts), same rules and timings.
 *  `go(next)` plays the exit, swaps the screen, then the entrance morphs what both screens share:
 *  - `data-flip-id` elements present on both sides move and resize into place (Flip, 0.55s).
 *    `data-shape` marks the big cards and their notches: they stay on screen and shapeshift
 *    while the details inside them fade.
 *  - `data-roll` text that changes rolls behind a mask (0.45s).
 *  - `data-panel` blocks only one side has slide toward/from the nearest edge of the content.
 *  - `data-swap` blocks inside a morphing card whose contents differ fade.
 *  - `data-bar` bars grow from their baseline. */
export function useScreenMorph<S extends string>({
  contentRef,
  screen,
  setScreen,
  setNav,
  flipIds,
  load,
}: {
  contentRef: React.RefObject<HTMLDivElement | null>
  screen: S
  setScreen: (s: S) => void
  setNav: (s: S) => void
  /** The Flip ids each screen renders. */
  flipIds: Record<S, string[]>
  /** Fetch what screen `s` shows; it runs during the exit so the morph lands on real figures. */
  load?: (s: S) => Promise<unknown>
}) {
  const flipState = React.useRef<Flip.FlipState | null>(null)
  const prevIds = React.useRef<Set<string>>(new Set())
  const ghosts = React.useRef<Map<string, { node: HTMLElement; text: string }>>(
    new Map()
  )
  const switching = React.useRef(false)
  React.useEffect(() => {
    const g = ghosts.current
    return () => g.forEach((x) => x.node.remove())
  }, [])

  const all = (sel: string) => [
    ...(contentRef.current?.querySelectorAll<HTMLElement>(sel) ?? []),
  ]
  const idOf = (el: Element) => (el as HTMLElement).dataset.flipId ?? ""

  /** Leaves inside the shapes that belong to one screen only: neither morphing nor rolling. */
  const shapeDetails = (shapes: HTMLElement[]) => {
    const out: Element[] = []
    const walk = (el: Element) => {
      for (const c of el.children) {
        if (c.getAttribute("aria-hidden") === "true") continue
        if (c.hasAttribute("data-flip-id") || c.hasAttribute("data-roll"))
          continue
        if (c.querySelector("[data-flip-id],[data-roll]")) walk(c)
        else out.push(c)
      }
    }
    shapes.forEach(walk)
    return out
  }

  const panels = () =>
    all("[data-panel]").filter(
      (el) => !el.parentElement?.closest("[data-panel]")
    )

  /** Toward the edge of the content nearest the element: side panels travel sideways, others vertically. */
  const awayFrom = (el: Element, dist = 32) => {
    const box = contentRef.current!.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const dx = (r.left + r.width / 2 - (box.left + box.width / 2)) / box.width
    const dy = (r.top + r.height / 2 - (box.top + box.height / 2)) / box.height
    return Math.abs(dx) > Math.abs(dy)
      ? { x: Math.sign(dx) * dist, y: 0 }
      : { x: 0, y: (Math.sign(dy) || 1) * dist }
  }

  /** Copy each rolling text to a fixed-position ghost so it can roll out after React replaces it. */
  const freezeRolls = () => {
    ghosts.current.forEach((g) => g.node.remove())
    ghosts.current.clear()
    document.querySelectorAll<HTMLElement>("[data-roll]").forEach((el) => {
      if (!contentRef.current?.closest("[data-morph-root]")?.contains(el))
        return
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      const cs = getComputedStyle(el)
      const node = document.createElement("div")
      node.className = "kf-app"
      Object.assign(node.style, {
        position: "fixed",
        left: r.left + "px",
        top: r.top + "px",
        width: r.width + "px",
        height: r.height + "px",
        margin: "0",
        pointerEvents: "none",
        zIndex: "30",
        overflow: "hidden",
        background: "transparent",
        whiteSpace:
          r.height > parseFloat(cs.lineHeight) * 1.5 ? "normal" : "nowrap",
        color: cs.color,
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        textAlign: cs.textAlign,
      })
      const copy = el.cloneNode(true) as HTMLElement
      copy.style.margin = "0"
      copy.style.display = "block"
      node.append(copy)
      document.body.append(node)
      el.style.opacity = "0"
      ghosts.current.set(el.dataset.roll!, { node, text: el.textContent ?? "" })
    })
  }

  /** After freezeRolls() and a re-render: unchanged text needs nothing; changed text rises in
   *  while its old copy rises out. Call inside a GSAP context. */
  const rollTexts = () => {
    const dropGhost = (key: string) => {
      const g = ghosts.current.get(key)
      if (!g) return
      ghosts.current.delete(key)
      const remove = () => g.node.remove()
      gsap.to(g.node.firstElementChild, {
        yPercent: -100,
        duration: 0.45,
        ease: "power3.inOut",
        onComplete: remove,
        onInterrupt: remove,
      })
    }
    document.querySelectorAll<HTMLElement>("[data-roll]").forEach((el) => {
      if (!contentRef.current?.closest("[data-morph-root]")?.contains(el))
        return
      el.style.opacity = ""
      const key = el.dataset.roll!
      const g = ghosts.current.get(key)
      if (g && g.text === el.textContent) {
        ghosts.current.delete(key)
        g.node.remove()
        return
      }
      dropGhost(key)
      gsap.fromTo(
        el,
        { yPercent: 100, clipPath: "inset(0% 0% 100% 0%)" },
        {
          yPercent: 0,
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 0.45,
          ease: "power3.inOut",
          clearProps: "transform,clipPath",
        }
      )
    })
    ;[...ghosts.current.keys()].forEach(dropGhost)
  }

  useGSAP(
    () => {
      const grid = contentRef.current
      if (!grid) return
      const shapes = all("[data-shape]")
      const bars = all("[data-bar]")
      const from = flipState.current
      flipState.current = null

      const fadeIn = (targets: gsap.TweenTarget, vars: gsap.TweenVars) => {
        const els = gsap.utils.toArray(targets)
        if (!els.length) return
        return gsap.fromTo(
          els,
          { opacity: 0, transition: "none" },
          { opacity: 1, clearProps: "opacity,transition", ...vars }
        )
      }
      const slideIn = (els: Element[], delay: number) =>
        els.forEach((el, i) => {
          const pos = getComputedStyle(el).position
          gsap.set(el, {
            zIndex: 2,
            position: pos === "static" ? "relative" : pos,
          })
          gsap.fromTo(
            el,
            { ...awayFrom(el), opacity: 0, transition: "none" },
            {
              x: 0,
              y: 0,
              opacity: 1,
              duration: 0.5,
              delay: delay + i * 0.04,
              ease: "power3.out",
              clearProps:
                "transform,opacity,transition,zIndex" +
                (pos === "static" ? ",position" : ""),
            }
          )
        })
      if (reduceMotion()) {
        fadeIn(panels(), { duration: 0.3, ease: "none" })
        return
      }

      gsap.set(grid, { overflow: "hidden" })
      gsap.delayedCall(1, () => gsap.set(grid, { clearProps: "overflow" }))

      if (!from) {
        fadeIn(shapes, { duration: 0.4 })
        fadeIn(shapeDetails(shapes), {
          duration: 0.35,
          delay: 0.1,
          ease: "power2.out",
        })
        slideIn(
          panels().filter((p) => !p.hasAttribute("data-shape")),
          0.05
        )
      } else {
        const flips = all("[data-flip-id]")
        const kept = flips.filter((el) => prevIds.current.has(idOf(el)))
        const keptSet = new Set(kept)
        Flip.from(from, {
          targets: kept,
          nested: true,
          duration: 0.55,
          ease: "power3.inOut",
        })
        const newPanels = panels().filter((el) => !keptSet.has(el))
        const newSet = new Set(newPanels)
        fadeIn(
          [
            ...flips.filter(
              (el) =>
                !keptSet.has(el) &&
                !newSet.has(el) &&
                ![...newSet].some((p) => p.contains(el))
            ),
            ...shapeDetails(shapes.filter((s) => keptSet.has(s))),
            ...all("[data-swap]").filter(
              (el) => ![...newSet].some((p) => p.contains(el))
            ),
          ],
          { duration: 0.35, delay: 0.3, ease: "power2.out" }
        )
        slideIn(newPanels, 0.15)
        rollTexts()
      }
      if (bars.length)
        gsap.fromTo(
          bars,
          { clipPath: "inset(100% 0 0 0)" },
          {
            clipPath: "inset(0% 0 0 0)",
            duration: 0.6,
            stagger: 0.04,
            delay: from ? 0.45 : 0.15,
            ease: "power3.out",
            clearProps: "clipPath",
          }
        )
    },
    { scope: contentRef, dependencies: [screen], revertOnUpdate: true }
  )

  const { contextSafe } = useGSAP({ scope: contentRef })
  const go = (next: S) =>
    contextSafe(() => {
      if (next === screen || switching.current) return
      setNav(next)
      const loaded = Promise.resolve(load?.(next)).catch(() => undefined)
      const grid = contentRef.current
      if (reduceMotion() || !grid)
        return void loaded.then(() => setScreen(next))
      switching.current = true
      gsap.set(grid, { overflow: "hidden" })

      const nextIds = new Set(flipIds[next])
      const flips = all("[data-flip-id]")
      const kept = flips.filter((el) => nextIds.has(idOf(el)))
      const shapes = all("[data-shape]").filter((el) => nextIds.has(idOf(el)))
      const leavingPanels = panels().filter((el) => !nextIds.has(idOf(el)))
      const leaving = [
        ...flips.filter(
          (el) =>
            !nextIds.has(idOf(el)) &&
            !leavingPanels.some((p) => p === el || p.contains(el))
        ),
        ...shapeDetails(shapes),
        ...all("[data-swap]").filter(
          (el) => !leavingPanels.some((p) => p.contains(el))
        ),
      ]
      freezeRolls()

      const tl = gsap.timeline({
        onComplete: () => {
          flipState.current = Flip.getState(kept)
          prevIds.current = new Set(kept.map(idOf))
          loaded.then(() => {
            switching.current = false
            grid.scrollTop = 0
            setScreen(next)
          })
        },
      })
      if (leaving.length)
        tl.to(leaving, { opacity: 0, duration: 0.2, transition: "none" }, 0)
      leavingPanels.forEach((el) =>
        tl.to(
          el,
          { ...awayFrom(el), opacity: 0, duration: 0.25, ease: "power2.in" },
          0
        )
      )
    })()

  return { go, freezeRolls, rollTexts, contextSafe }
}
