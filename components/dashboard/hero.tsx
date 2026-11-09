"use client"

import { Mic } from "lucide-react"

import { Count, RollText } from "@/components/dashboard/motion"
import type { ShopView } from "@/lib/demo"

/** The reference's "WORKSPACE 34 deals 20 won 3 lost" row: a light title, then big light
 *  figures with a small unit and a delta-style badge. The outstanding total is the hero figure. */
export function Hero({ view, onSpeak }: { view: ShopView; onSpeak: () => void }) {
  const low = view.products.filter((p) => p.isLow).length
  const staffDue = view.staff.reduce((t, s) => t + Math.max(s.due, 0), 0)
  return (
    <section data-rise aria-label="Aaj ka saar" className="flex flex-wrap items-end gap-x-10 gap-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-5xl leading-none font-light tracking-tight uppercase sm:text-6xl">
          Khaata
          <span aria-hidden className="ml-1 inline-block size-3 rounded-full bg-lime" />
        </h1>
        <button
          type="button"
          onClick={onSpeak}
          className="flex items-center gap-2 rounded-full bg-white py-1.5 pr-4 pl-1.5 text-sm font-medium text-black transition-transform duration-150 ease-out outline-none hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
        >
          <span className="grid size-7 place-items-center rounded-full bg-black/[0.08]">
            <Mic aria-hidden className="size-4" />
          </span>
          Bolke likho
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
        <Figure label="udhaar baaki" badge={`${view.debtors} log`} badgeClass="bg-lime text-black">
          <span className="text-6xl leading-none font-light">
            <Count id="outstanding" value={view.outstanding} />
          </span>
        </Figure>
        <Figure label="kam stock" badge={low ? "dhyaan do" : "theek"} badgeClass={low ? "bg-red text-white" : "bg-raised"}>
          <span className="text-4xl leading-none font-light">
            <Count id="low" value={low} format="int" />
          </span>
        </Figure>
        <Figure label="staff ko dena" badge={<RollText rollKey={view.id}>{view.staff.length} log</RollText>} badgeClass="bg-raised">
          <span className="text-4xl leading-none font-light">
            <Count id="staff" value={staffDue} />
          </span>
        </Figure>
      </div>
    </section>
  )
}

function Figure({ label, badge, badgeClass, children }: { label: string; badge: React.ReactNode; badgeClass: string; children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      {children}
      <span className="flex flex-col items-start gap-1 pb-0.5 text-sm text-muted-foreground">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}>{badge}</span>
        {label}
      </span>
    </div>
  )
}
