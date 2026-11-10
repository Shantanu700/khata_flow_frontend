"use client"

import { ActivityChart } from "@/components/app/activity-chart"
import { useCustomers, useSummary } from "@/components/app/data"
import { qty, useI18n } from "@/components/app/i18n"
import { ArrowIcon, MicIcon } from "@/components/app/icons"
import { entryView, heat, lastLabel } from "@/components/app/khata-data"
import { useLayout } from "@/components/app/layout"
import { LoadError, Loading } from "@/components/app/ledger"
import {
  AliasChip,
  CornerButton,
  Dot,
  PanelTitle,
} from "@/components/app/parts"
import { Face, photoSrc } from "@/components/app/photo"
import { useShell } from "@/components/app/shell"
import { notchRadius } from "@/components/notch"
import { inr } from "@/lib/api"
import { cn } from "@/lib/utils"

export function DashboardScreen() {
  const { t, locale } = useI18n()
  const { go, openCustomer } = useShell()
  const summary = useSummary()
  const debtors = useCustomers({
    balance: "owing",
    ordering: "-balance",
    page: 1,
    page_size: 5,
  })
  const { phone, narrow, compact, cw } = useLayout()
  // Lead Flow's big-number steps, by content width.
  const big = phone ? 52 : cw < 914 ? 64 : cw < 1254 ? 80 : 96
  const s = summary.data
  const top = debtors.data?.results ?? []
  const most = Math.max(...top.map((d) => d.balance ?? 0), 1)

  if (summary.isError) return <LoadError onRetry={() => summary.refetch()} />
  if (summary.isPending) return <Loading />

  return (
    <div className="flex flex-col gap-[10px]">
      <div
        className={cn(
          "grid gap-[10px]",
          narrow ? "grid-cols-1" : "grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
        )}
      >
        <div
          data-panel
          data-flip-id="main-card"
          data-shape=""
          className={cn(
            "relative flex min-h-[280px] flex-col justify-between gap-6 rounded-[32px] bg-card",
            phone ? "p-5" : "p-7"
          )}
        >
          <div>
            <p
              data-roll="dash-total-label"
              className="text-sm text-muted-foreground"
            >
              {t("dash.totalLabel", { count: s?.owing_count ?? 0 })}
            </p>
            <p
              data-roll="big"
              className="mt-2 leading-none font-light tracking-[-0.04em]"
              style={{ fontSize: big }}
            >
              {inr(s?.total_outstanding)}
            </p>
          </div>
          <div
            className={cn(
              "flex flex-wrap",
              phone ? "gap-x-6 gap-y-3 pr-[88px]" : "gap-10 pr-[120px]"
            )}
          >
            <Stat
              roll="dash-week-credit"
              value={inr(s?.week_credit)}
              label={t("dash.weekCredit")}
              dot="var(--chart-udhaar)"
            />
            <Stat
              roll="dash-week-payment"
              value={inr(s?.week_payment)}
              label={t("dash.weekPayment")}
              dot="var(--chart-vasooli)"
            />
            <Stat
              roll="dash-entries"
              value={String(s?.entry_count_14d ?? 0)}
              label={t("dash.entries14")}
            />
          </div>
          <CornerButton
            corner="br"
            flip="main-br"
            title={t("dash.speak")}
            onClick={() => go("bolo")}
            radius={notchRadius(phone ? 64 : 80)}
            className={cn(
              "bg-lime text-black active:scale-[0.94]",
              phone ? "size-16" : "size-20"
            )}
          >
            <MicIcon size={28} />
          </CornerButton>
        </div>

        <div
          data-panel
          data-flip-id="side-card"
          data-shape=""
          className={cn(
            "relative flex flex-col gap-[18px] rounded-[32px] bg-paper text-black",
            phone ? "p-5" : "p-7"
          )}
        >
          <div className="pr-[72px]">
            <PanelTitle
              title={t("dash.lowTitle")}
              sub={t("dash.lowSub", { count: s?.low_stock.length ?? 0 })}
              subClassName="text-[#434343]"
            />
          </div>
          {/* Always five rows tall (49px rows, 18px gaps): more scroll, fewer leave the space empty. */}
          <div
            data-low-list
            className="flex h-[calc(5*49px+4*18px)] shrink-0 flex-col gap-[18px] overflow-y-auto overscroll-contain"
          >
            {s?.low_stock.map((p) => (
              <div
                key={p.id}
                className="flex shrink-0 items-center gap-3 border-t border-black/10 pt-3.5"
              >
                <span className="min-w-0 flex-1 truncate text-base">
                  {p.name}
                </span>
                <span
                  data-roll={`low-${p.id}`}
                  className="text-[28px] font-light"
                >
                  {qty(p.stock_level)}
                </span>
                <span className="w-20 text-xs text-[#434343]">
                  {t("dash.threshold", { value: qty(p.threshold) })}
                </span>
              </div>
            ))}
            {s && s.low_stock.length === 0 && (
              <p className="border-t border-black/10 pt-3.5 text-sm text-[#434343]">
                {t("dash.lowNone")}
              </p>
            )}
          </div>
          <CornerButton
            flip="side-tr"
            title={t("dash.openStock")}
            onClick={() => go("stock")}
            rotate
          >
            <ArrowIcon />
          </CornerButton>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-[10px]",
          compact
            ? "grid-cols-1"
            : "grid-cols-[minmax(0,1fr)_minmax(300px,380px)]"
        )}
      >
        <ActivityChart days={s?.daily ?? []} />

        <div
          data-panel
          className="flex flex-col gap-1 rounded-[32px] bg-deep p-6"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <PanelTitle
              title={t("dash.recentTitle")}
              sub={t("dash.recentSub")}
            />
            <button
              type="button"
              onClick={() => go("entries")}
              className="shrink-0 cursor-pointer text-[13px] text-lime-ink hover:text-foreground"
            >
              {t("dash.seeAll")}
            </button>
          </div>
          {s?.recent.map((row) => {
            const e = entryView(row, t, locale)
            return (
              <div
                key={e.id}
                className={cn(
                  "flex items-center gap-3 border-t border-line py-2.5",
                  e.faded && "opacity-50"
                )}
              >
                <Dot color={e.dot} />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-[15px]",
                      e.struck && "line-through"
                    )}
                  >
                    {e.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.kindLabel} · {e.date}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-base font-light",
                    e.struck && "line-through"
                  )}
                >
                  {e.amt}
                </span>
              </div>
            )
          })}
          {s && s.recent.length === 0 && (
            <p className="border-t border-line py-4 text-sm text-muted-foreground">
              {t("dash.recentNone")}
            </p>
          )}
        </div>
      </div>

      <section
        data-panel
        aria-labelledby="udhaar-wale"
        className="flex flex-col gap-[10px]"
      >
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="udhaar-wale" className="text-[28px] font-normal">
            {t("dash.topTitle")}
          </h2>
          <span className="text-sm text-muted-foreground">
            {t("dash.topCount", { count: top.length })}
          </span>
          <button
            type="button"
            onClick={() => go("khata")}
            className="cursor-pointer text-sm underline underline-offset-4 hover:text-lime-ink"
          >
            {t("dash.allCustomers", { count: s?.customer_count ?? 0 })}
          </button>
        </div>
        <div
          className={cn(
            phone
              ? "flex snap-x snap-mandatory [scrollbar-width:none] gap-[10px] overflow-x-auto *:w-[260px] *:flex-none *:snap-start [&::-webkit-scrollbar]:hidden"
              : "grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[10px]"
          )}
        >
          {debtors.data && top.length === 0 && (
            <p className="rounded-[32px] bg-card p-6 text-sm text-muted-foreground">
              {t("dash.topNone")}
            </p>
          )}
          {top.map((d) => {
            const dots = heat(d.balance ?? 0, most)
            return (
              <div
                key={d.id}
                className="relative flex min-h-[210px] flex-col justify-between gap-4 rounded-[32px] bg-card p-5"
              >
                <span className="grid size-11 place-items-center overflow-hidden rounded-full bg-raised text-base">
                  <Face
                    name={d.name}
                    src={photoSrc(`parties/${d.id}`, d.photo_key)}
                  />
                </span>
                <div className="pr-10">
                  <p className="truncate text-[22px]">{d.name}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {lastLabel(d.last_entry_on, t)}
                  </p>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div
                    className={cn("min-w-0", !d.aliases?.length && "invisible")}
                  >
                    <p className="mb-1.5 text-[11px] text-muted-foreground">
                      {t("customer.aliases")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {d.aliases?.map((a) => (
                        <AliasChip key={a} small>
                          {a}
                        </AliasChip>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      data-roll={`top-${d.id}`}
                      className="text-2xl font-light"
                    >
                      {inr(d.balance)}
                    </p>
                    <div
                      className="mt-1 flex justify-end gap-[3px]"
                      role="img"
                      aria-label={t("dash.heat", {
                        count: dots.filter((c) => !c.startsWith("var")).length,
                      })}
                    >
                      {dots.map((color, i) => (
                        <Dot key={i} color={color} size={9} />
                      ))}
                    </div>
                  </div>
                </div>
                <CornerButton
                  title={t("dash.openKhata")}
                  onClick={() => openCustomer(d.id)}
                  rotate
                >
                  <ArrowIcon size={16} />
                </CornerButton>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Stat({
  value,
  label,
  dot,
  roll,
}: {
  value: string
  label: string
  dot?: string
  roll: string
}) {
  return (
    <div>
      <p data-roll={roll} className="text-[32px] font-light">
        {value}
      </p>
      <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        {dot && <Dot color={dot} size={8} />}
        {label}
      </p>
    </div>
  )
}
