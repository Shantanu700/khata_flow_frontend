import * as React from "react"

/** Lead Flow's breakpoints: they follow the frame and content width (frame minus the
 *  60px rail and its gap), measured with a ResizeObserver, not the viewport. */
export function layoutFor(w: number, h = 900) {
  // A phone on its side is too short for the side rail.
  const phone = w < 600 || h < 480
  const cw = phone ? w : w - 70
  // low: too short for two rows of full staff cards; they take their own height and scroll instead.
  return { w, phone, cw, narrow: cw < 820, compact: cw < 1154, low: h < 770 }
}

export type Layout = ReturnType<typeof layoutFor>

export const LayoutContext = React.createContext<Layout>(layoutFor(1400))
export const useLayout = () => React.useContext(LayoutContext)
