"use client"

import * as React from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

import {
  BookIcon,
  BoxIcon,
  HomeIcon,
  ListIcon,
  LogoMark,
  LogoutIcon,
  MicIcon,
  UsersIcon,
} from "@/components/app/icons"
import { useI18n } from "@/components/app/i18n"
import type { Screen } from "@/components/app/khata-data"
import { useLayout } from "@/components/app/layout"
import { Tip } from "@/components/app/parts"
import { reduceMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"

const NAV: { screen: Screen; icon: typeof HomeIcon }[] = [
  { screen: "dash", icon: HomeIcon },
  { screen: "khata", icon: BookIcon },
  { screen: "stock", icon: BoxIcon },
  { screen: "staff", icon: UsersIcon },
  { screen: "entries", icon: ListIcon },
  { screen: "bolo", icon: MicIcon },
]

/** Logo, tabs, log out and the shopkeeper. One lime pill slides to the active tab (Lead Flow's
 *  rail). On phones it becomes a bottom tab bar and the pill slides along it at the tab's width. */
export function Rail({
  nav,
  go,
  logOut,
  avatar,
}: {
  nav: Screen
  go: (s: Screen) => void
  logOut: () => void
  avatar: string
}) {
  const { t } = useI18n()
  const { phone, w } = useLayout()
  const ref = React.useRef<HTMLElement>(null)
  const pill = React.useRef<HTMLSpanElement>(null)
  const placed = React.useRef(false)

  useGSAP(
    () => {
      const row = ref.current?.querySelector<HTMLElement>(
        `[data-nav-row="${nav}"]`
      )
      if (!row) return
      const to = { x: row.offsetLeft, y: row.offsetTop, width: row.offsetWidth }
      if (!placed.current || reduceMotion()) {
        placed.current = true
        gsap.set(pill.current, to)
        return
      }
      gsap.to(pill.current, { ...to, duration: 0.4, ease: "power3.inOut" })
    },
    { scope: ref, dependencies: [nav, phone, w] }
  )

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col items-center gap-[10px]",
        phone && "flex-none"
      )}
    >
      {!phone && <LogoMark size={60} ring="var(--canvas)" />}
      <nav
        ref={ref}
        aria-label="Main"
        className={cn(
          "relative flex items-center gap-2 rounded-full bg-card p-2",
          phone ? "w-full flex-row gap-1" : "w-[60px] flex-1 flex-col"
        )}
      >
        <span
          ref={pill}
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 h-11 w-11 rounded-full bg-lime"
        />
        {NAV.map(({ screen, icon: Icon }) => (
          <Tip key={screen} label={t(`screen.${screen}.title`)} side="right">
            <button
              type="button"
              aria-label={t(`screen.${screen}.title`)}
              data-nav-row={screen}
              aria-current={nav === screen ? "page" : undefined}
              onClick={() => go(screen)}
              className={cn(
                "relative grid h-11 cursor-pointer place-items-center rounded-full transition-colors duration-200",
                phone ? "min-w-0 flex-1" : "w-11",
                nav === screen
                  ? "text-black"
                  : "text-muted-foreground hover:bg-raised hover:text-foreground"
              )}
            >
              <Icon />
            </button>
          </Tip>
        ))}
        {!phone && <span className="flex-1" />}
        <Tip label={t("nav.signOut")} side="right">
          <button
            type="button"
            aria-label={t("nav.signOut")}
            onClick={logOut}
            className={cn(
              "relative grid h-11 cursor-pointer place-items-center rounded-full bg-raised text-muted-foreground",
              phone ? "min-w-0 flex-1" : "w-11"
            )}
          >
            <LogoutIcon />
          </button>
        </Tip>
      </nav>
      {!phone && (
        <span className="grid size-[60px] shrink-0 place-items-center rounded-full bg-paper text-xl font-medium text-black">
          {avatar}
        </span>
      )}
    </aside>
  )
}
