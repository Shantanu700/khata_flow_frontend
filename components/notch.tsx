import * as React from "react"

import { cn } from "@/lib/utils"

/** The notch's inner corner radius, from Lead Flow's notch. */
export const NOTCH_R = 28

/** The block's inner radius for a control of this size: at most half the block's height (control plus
 *  gap), so its rounded corner meets the fillets in one curve. Any larger and the two arcs overlap,
 *  leaving a hairline ledge where they join. */
export const notchRadius = (control: number, gap = 10) => (control + gap) / 2

/** `b` sits centred on the bottom edge. */
export type Corner = "tl" | "tr" | "br" | "bl" | "b"

const fillet = (at: string, r: number) => `radial-gradient(circle at ${at}, transparent ${r - 0.5}px, var(--notch-bg) ${r}px)`

// Each corner: where the block sits, its padding and rounded inner corner, and the two
// fillets that curve the panel's edge into the notch.
const corners = (r: number, g: number): Record<Corner, { box: React.CSSProperties; fillets: [React.CSSProperties, string][] }> => ({
  tl: {
    box: { top: 0, left: 0, borderBottomRightRadius: r, padding: `0 ${g}px ${g}px 0` },
    fillets: [[{ top: 0, right: -r }, "100% 100%"], [{ left: 0, bottom: -r }, "100% 100%"]],
  },
  tr: {
    box: { top: 0, right: 0, borderBottomLeftRadius: r, padding: `0 0 ${g}px ${g}px` },
    fillets: [[{ top: 0, left: -r }, "0 100%"], [{ right: 0, bottom: -r }, "0 100%"]],
  },
  br: {
    box: { bottom: 0, right: 0, borderTopLeftRadius: r, padding: `${g}px 0 0 ${g}px` },
    fillets: [[{ right: 0, top: -r }, "0 0"], [{ bottom: 0, left: -r }, "0 0"]],
  },
  bl: {
    box: { bottom: 0, left: 0, borderTopRightRadius: r, padding: `${g}px ${g}px 0 0` },
    fillets: [[{ left: 0, top: -r }, "100% 0"], [{ bottom: 0, right: -r }, "100% 0"]],
  },
  b: {
    box: { bottom: 0, left: "50%", translate: "-50% 0", borderTopLeftRadius: r, borderTopRightRadius: r, padding: `${g}px ${g}px 0` },
    fillets: [[{ bottom: 0, left: -r }, "0 0"], [{ bottom: 0, right: -r }, "100% 0"]],
  },
})

/** A cut-out in a panel's corner, in the colour of what sits behind the panel, holding controls. */
export function Notch({
  corner,
  r = NOTCH_R,
  gap = 8,
  bg = "var(--canvas)",
  className,
  style,
  children,
  ...rest
}: {
  corner: Corner
  r?: number
  gap?: number
  /** The colour behind the panel, which the notch shows through. */
  bg?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  const { box, fillets } = corners(r, gap)[corner]
  return (
    <div
      data-notch={corner}
      className={cn("absolute box-border", className)}
      style={{ ...box, background: bg, ["--notch-bg" as string]: bg, ...style }}
      {...rest}
    >
      {children}
      {fillets.map(([pos, at], i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none absolute"
          style={{ ...pos, width: r, height: r, background: fillet(at, r) }}
        />
      ))}
    </div>
  )
}
