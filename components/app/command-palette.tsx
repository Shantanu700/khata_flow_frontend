"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Command } from "cmdk"
import { Dialog } from "radix-ui"
import { toast } from "sonner"

import { useDebounced } from "@/components/app/data"
import { useI18n } from "@/components/app/i18n"
import {
  ArrowIcon,
  MicIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
} from "@/components/app/icons"
import type { Screen } from "@/components/app/khata-data"
import { Face, photoSrc } from "@/components/app/photo"
import { NAV } from "@/components/app/rail"
import {
  data,
  inr,
  listV1Parties,
  listV1Products,
  type Page,
  type Party,
  type Product,
} from "@/lib/api"
import { calculate } from "@/lib/calc"
import { cn } from "@/lib/utils"

const ROW =
  "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm outline-none select-none data-[selected=true]:bg-raised"
const GROUP =
  "p-1.5 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"

/** ⌘K / Ctrl+K, or the search button: find a customer, staff member or item, jump to a screen, run an action,
 *  or type a sum (250*4+30) and press Enter to copy the answer. */
export function CommandPalette({
  open,
  onOpenChange,
  screen,
  go,
  openCustomer,
  theme,
  toggleTheme,
  speak,
  phone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  screen: Screen
  go: (screen: Screen) => void
  openCustomer: (id: number) => void
  theme: "dark" | "light"
  toggleTheme: () => void
  speak: () => void
  phone: boolean
}) {
  const { t } = useI18n()
  const [q, setQ] = React.useState("")
  const [picked, setPicked] = React.useState("")
  const query = q.trim()
  const answer = calculate(query)
  const search = useDebounced(answer === null ? query : "", 200)

  const found = useQuery({
    queryKey: ["palette", search],
    enabled: open && search !== "",
    queryFn: () =>
      Promise.all([
        data(listV1Parties({ query: { q: search, page_size: 5 } })) as Promise<
          Page<Party>
        >,
        data(listV1Products({ query: { q: search, page_size: 4 } })) as Promise<
          Page<Product>
        >,
      ]),
  })
  const fresh = search === query && query !== ""
  const people = fresh ? (found.data?.[0].results ?? []) : []
  const items = fresh ? (found.data?.[1].results ?? []) : []

  const openChange = (next: boolean) => {
    if (!next) {
      setQ("")
      setPicked("")
    }
    onOpenChange(next)
  }
  const run = (fn: () => void) => {
    openChange(false)
    fn()
  }
  const copy = async (value: number) => {
    const shown = value.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    try {
      await navigator.clipboard.writeText(String(value))
      toast.success(t("palette.copied", { value: shown }))
      openChange(false)
    } catch {
      toast.error(t("palette.copyFailed"))
    }
  }

  const matches = (label: string) =>
    label.toLowerCase().includes(query.toLowerCase())
  const screens =
    answer === null
      ? NAV.filter((n) => matches(t(`screen.${n.screen}.title`)))
      : []
  const actions =
    answer === null
      ? [
          { id: "speak", label: t("bolo.press"), icon: MicIcon, run: speak },
          {
            id: "theme",
            label: theme === "dark" ? t("header.light") : t("header.dark"),
            icon: theme === "dark" ? SunIcon : MoonIcon,
            run: toggleTheme,
          },
        ].filter((a) => matches(a.label))
      : []

  // What the user moved to while it is still listed, else the first row, so Enter acts on the top result.
  const rows = [
    ...(answer !== null ? ["calc"] : []),
    ...people.map((p) => `party-${p.id}`),
    ...items.map((p) => `item-${p.id}`),
    ...screens.map((n) => `go-${n.screen}`),
    ...actions.map((a) => `action-${a.id}`),
  ]
  const active = rows.includes(picked) ? picked : (rows[0] ?? "")
  const mac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.userAgent)

  return (
    <Dialog.Root open={open} onOpenChange={openChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "kf-app fixed left-1/2 z-50 w-[min(560px,calc(100vw-20px))] -translate-x-1/2 overflow-hidden rounded-[32px] bg-card text-foreground drop-shadow-[0_24px_60px_rgb(0_0_0/0.35)] duration-150 ease-out outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            phone ? "top-[10px]" : "top-[18vh]"
          )}
        >
          <Dialog.Title className="sr-only">{t("palette.title")}</Dialog.Title>
          <Command
            shouldFilter={false}
            loop
            value={active}
            onValueChange={setPicked}
            label={t("palette.title")}
          >
            <div className="p-2 pb-0">
              <label className="flex h-12 items-center gap-3 rounded-full bg-raised pr-2 pl-5">
                <SearchIcon className="shrink-0 text-muted-foreground" />
                <Command.Input
                  value={q}
                  onValueChange={setQ}
                  placeholder={t("palette.placeholder")}
                  className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
                />
              </label>
            </div>
            <Command.List className="h-(--cmdk-list-height) max-h-[min(380px,55dvh)] scroll-py-1.5 overflow-y-auto overscroll-contain transition-[height] duration-200 ease-out motion-reduce:transition-none">
              {rows.length === 0 && fresh && !found.isFetching && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("palette.empty", { q: query })}
                </p>
              )}
              {answer !== null && (
                <Command.Group heading={t("palette.calc")} className={GROUP}>
                  <Command.Item
                    value="calc"
                    onSelect={() => void copy(answer)}
                    className="flex cursor-pointer items-center gap-4 rounded-lg px-4 py-3 outline-none select-none data-[selected=true]:bg-lime data-[selected=true]:text-black"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm opacity-70">
                        {query} =
                      </span>
                      <span className="block truncate text-4xl font-light tracking-[-0.02em] tabular-nums">
                        {answer.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </span>
                    <Kbd className="bg-black/10 text-current">
                      {phone ? "" : "↵ "}
                      {t("palette.hintCopy")}
                    </Kbd>
                  </Command.Item>
                </Command.Group>
              )}
              {people.length > 0 && (
                <Command.Group heading={t("palette.people")} className={GROUP}>
                  {people.map((p) => (
                    <Command.Item
                      key={p.id}
                      value={`party-${p.id}`}
                      onSelect={() =>
                        run(() =>
                          p.kind === "STAFF" ? go("staff") : openCustomer(p.id)
                        )
                      }
                      className={ROW}
                    >
                      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-raised text-sm">
                        <Face
                          name={p.name}
                          src={photoSrc(`parties/${p.id}`, p.photo_key)}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{p.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {p.kind === "STAFF"
                            ? t("screen.staff.title")
                            : p.balance
                              ? t("palette.due", { amount: inr(p.balance) })
                              : t("screen.khata.title")}
                        </span>
                      </span>
                      <ArrowIcon
                        size={14}
                        className="shrink-0 text-muted-foreground"
                      />
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {items.length > 0 && (
                <Command.Group heading={t("palette.items")} className={GROUP}>
                  {items.map((p) => (
                    <Command.Item
                      key={p.id}
                      value={`item-${p.id}`}
                      onSelect={() => run(() => go("stock"))}
                      className={ROW}
                    >
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          p.is_low ? "bg-red" : "bg-lime"
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {Number(p.stock_level)} {t(`unit.${p.unit}.short`)}{" "}
                        {t("stock.left")}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {screens.length > 0 && (
                <Command.Group heading={t("palette.goto")} className={GROUP}>
                  {screens.map(({ screen: s, icon: Icon }) => (
                    <Command.Item
                      key={s}
                      value={`go-${s}`}
                      onSelect={() => run(() => go(s))}
                      className={ROW}
                    >
                      <Icon />
                      <span className="flex-1">{t(`screen.${s}.title`)}</span>
                      {s === screen ? (
                        <span className="size-2 rounded-full bg-lime" />
                      ) : (
                        <ArrowIcon
                          size={14}
                          className="text-muted-foreground"
                        />
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {actions.length > 0 && (
                <Command.Group heading={t("palette.actions")} className={GROUP}>
                  {actions.map((a) => (
                    <Command.Item
                      key={a.id}
                      value={`action-${a.id}`}
                      onSelect={() => run(a.run)}
                      className={ROW}
                    >
                      <a.icon />
                      {a.label}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
            {!phone && (
              <div className="flex items-center gap-4 border-t border-hairline/40 px-5 py-3 text-xs text-muted-foreground">
                <span>
                  <Kbd>↵</Kbd>{" "}
                  {answer !== null
                    ? t("palette.hintCopy")
                    : t("palette.hintOpen")}
                </span>
                <span>
                  <Kbd>esc</Kbd> {t("palette.hintClose")}
                </span>
                <span className="ml-auto">
                  <Kbd>{mac ? "⌘K" : "Ctrl K"}</Kbd> {t("palette.hintAnywhere")}
                </span>
              </div>
            )}
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Kbd({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <kbd
      className={cn(
        "rounded-md bg-raised px-1.5 py-0.5 font-sans text-[11px] whitespace-nowrap text-foreground",
        className
      )}
    >
      {children}
    </kbd>
  )
}
