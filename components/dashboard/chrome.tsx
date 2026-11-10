"use client"

import { Bell, BookOpen, Home, Mic, Package, Users } from "lucide-react"

import { Segmented } from "@/components/segmented"
import type { ShopView } from "@/lib/demo"
import { cn } from "@/lib/utils"

const RAIL = [
  { label: "Dashboard", icon: Home },
  { label: "Khata", icon: BookOpen },
  { label: "Stock", icon: Package },
  { label: "Staff", icon: Users },
  { label: "Bolo", icon: Mic },
]

/** The reference's left column of round icon buttons; the current page is the white one. */
export function Rail() {
  return (
    <nav aria-label="Main" data-rise className="hidden flex-col items-center gap-3 pt-40 lg:flex">
      {RAIL.map(({ label, icon: Icon }, i) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          aria-current={i === 0 ? "page" : undefined}
          className={cn(
            "grid size-11 place-items-center rounded-full transition-colors duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring",
            i === 0 ? "bg-white text-black" : "bg-raised text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon aria-hidden className="size-[18px]" />
        </button>
      ))}
    </nav>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden className="relative grid size-11 place-items-center rounded-full bg-white">
        <BookOpen className="size-5 text-black" />
        <span className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-[3px] border-canvas bg-lime" />
      </span>
      <span className="text-lg font-medium tracking-tight max-sm:sr-only">KhataFlow</span>
    </span>
  )
}

/** The reference's white schedule pill, here the shop switcher: one login per shop. */
export function Header({ shops, shopId, onShop }: { shops: Pick<ShopView, "id" | "shop">[]; shopId: ShopView["id"]; onShop: (id: ShopView["id"]) => void }) {
  return (
    <header data-rise className="flex items-center gap-3">
      <Logo />
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto rounded-full bg-white p-1.5 pl-5 text-black">
        <span className="shrink-0 text-sm font-medium max-md:hidden">Dukaan</span>
        <Segmented
          label="Dukaan chuniye"
          surface="light"
          value={shopId}
          onChange={onShop}
          options={shops.map((s) => ({
            value: s.id,
            label: (
              <>
                <span className="md:hidden">{s.shop.split(" ")[0]}</span>
                <span className="max-md:hidden">{s.shop}</span>
              </>
            ),
          }))}
        />
        <span className="ml-auto shrink-0 rounded-full bg-black/[0.06] px-3 py-2 text-xs font-medium max-md:hidden">
          {new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "long" }).format(new Date())}
        </span>
      </div>
      <button
        type="button"
        aria-label="Notifications"
        className="relative grid size-11 shrink-0 place-items-center rounded-full bg-raised outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell aria-hidden className="size-[18px]" />
        <span aria-hidden className="absolute top-2.5 right-3 size-2 rounded-full bg-red" />
      </button>
    </header>
  )
}
