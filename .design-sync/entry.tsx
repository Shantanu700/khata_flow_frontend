// The design-sync entry: exactly the components the design system ships, plus its example data.
import type { ReactNode } from "react"

export { Button, buttonVariants } from "../components/ui/button"
export { Notch } from "../components/notch"
export { Segmented } from "../components/segmented"
export { ChartCard, DataTable } from "../components/dashboard/charts/chart-card"
export { MoneyChart } from "../components/dashboard/charts/money-chart"
export { StockChart } from "../components/dashboard/charts/stock-chart"
export { StaffMeters } from "../components/dashboard/charts/staff-meters"
export { Header, Logo, Rail } from "../components/dashboard/chrome"
export { Hero } from "../components/dashboard/hero"
export { DebtorCard, Debtors } from "../components/dashboard/debtors"
export { Entries } from "../components/dashboard/entries"
export { VoicePanel } from "../components/dashboard/voice-panel"
export { Count, RollText } from "../components/dashboard/motion"
export { Dashboard } from "../components/dashboard/dashboard"

import { SHOP_IDS, shopView } from "../lib/demo"
import { describeEntry, inr, inrTick, relativeDay, shortDate, unitWord } from "../lib/format"

export const demo = { shopView, SHOP_IDS }
export const format = { inr, inrTick, shortDate, relativeDay, describeEntry, unitWord }

/** The app's root: `<html class="dark">` on the canvas colour. Every screen renders inside it. */
export function KhaataFlowRoot({ children }: { children?: ReactNode }) {
  return (
    <div className="dark bg-background font-sans text-foreground" style={{ padding: 16, minHeight: "100%" }}>
      {children}
    </div>
  )
}
