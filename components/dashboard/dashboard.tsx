"use client"

import * as React from "react"

import { MoneyChart } from "@/components/dashboard/charts/money-chart"
import { StaffMeters } from "@/components/dashboard/charts/staff-meters"
import { StockChart } from "@/components/dashboard/charts/stock-chart"
import { Header, Rail } from "@/components/dashboard/chrome"
import { Debtors } from "@/components/dashboard/debtors"
import { Entries } from "@/components/dashboard/entries"
import { Hero } from "@/components/dashboard/hero"
import { useDashboardMotion } from "@/components/dashboard/motion"
import { VoicePanel, type VoiceHandle } from "@/components/dashboard/voice-panel"
import { SHOP_IDS, shopView, type ShopView } from "@/lib/demo"

export function Dashboard() {
  const scope = React.useRef<HTMLDivElement>(null)
  const [shopId, setShopId] = React.useState<ShopView["id"]>("gupta")
  const voice = React.useRef<VoiceHandle>(null)
  const view = React.useMemo(() => shopView(shopId), [shopId])
  const shops = React.useMemo(() => SHOP_IDS.map((id) => shopView(id)), [])
  useDashboardMotion(scope, shopId)

  return (
    <div ref={scope} className="mx-auto flex min-h-dvh max-w-[1600px] gap-6 p-4 sm:p-6 lg:pl-4">
      <Rail />
      <main className="flex min-w-0 flex-1 flex-col gap-8">
        <Header shops={shops} shopId={shopId} onShop={setShopId} />
        <Hero view={view} onSpeak={() => voice.current?.play()} />
        <div className="grid gap-panel xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-8">
            <Debtors key={shopId} customers={view.customers} />
            <div className="grid gap-panel lg:grid-cols-2">
              <MoneyChart days={view.days} />
              <StockChart products={view.products} />
              <StaffMeters staff={view.staff} className="lg:col-span-2" />
            </div>
          </div>
          <div className="flex flex-col gap-panel">
            <VoicePanel key={shopId} ref={voice} demos={view.voice} />
            <Entries entries={view.entries} />
          </div>
        </div>
        <p className="pb-4 text-center text-xs text-muted-foreground">
          Example data: two made-up shops, the same as the backend&apos;s demo seed.
        </p>
      </main>
    </div>
  )
}
