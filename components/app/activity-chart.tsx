import { dateLabel, inr, type Book } from "@/components/app/khata-data"
import { useLayout } from "@/components/app/layout"
import { Dot, PanelTitle } from "@/components/app/parts"
import { cn } from "@/lib/utils"

type Day = Book["chart"][number]

export function ActivityChart({ chart }: { chart: Day[] }) {
  const max = Math.max(1, ...chart.flatMap((c) => [c.u, c.v]))
  const unit = 10 ** Math.floor(Math.log10(max))
  const step = Math.ceil(max / unit) > 5 ? unit * 2 : unit
  const top = Math.ceil(max / step) * step
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => top - i * step)
  const pct = (n: number) => (n / top) * 100
  const total = (k: "u" | "v") => chart.reduce((a, c) => a + c[k], 0)
  const { phone } = useLayout()

  return (
    <div data-panel className={cn("flex flex-col gap-6 rounded-[32px] bg-card", phone ? "p-5" : "p-7")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PanelTitle title="Udhaar aur vasooli" sub="Pichhle 14 din" />
        <div className="flex flex-wrap gap-[10px]">
          <Total label="Udhaar diya" value={inr(total("u"))} color="var(--chart-udhaar)" />
          <Total label="Vasooli hui" value={inr(total("v"))} color="var(--chart-vasooli)" />
        </div>
      </div>

      <div className="relative flex min-h-[240px] flex-1 flex-col">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 bottom-7 flex flex-col justify-between">
          {ticks.map((v) => (
            <div key={v} className="flex h-0 items-center gap-3">
              <span className={cn("h-px flex-1", v ? "border-t border-dashed border-line" : "bg-line")} />
              <span className="w-12 text-right text-[11px] text-muted-foreground">{v ? inr(v) : "₹0"}</span>
            </div>
          ))}
        </div>

        <div className={cn("relative flex flex-1", phone ? "mr-[52px] gap-0.5" : "mr-[60px] gap-1")}>
          {chart.map((c, i) => (
            <div
              key={c.d}
              tabIndex={0}
              role="img"
              aria-label={`${dateLabel(c.d)}: udhaar ${inr(c.u)}, vasooli ${inr(c.v)}`}
              className="group relative flex min-w-0 flex-1 flex-col items-center gap-2 outline-none"
            >
              <div className="flex w-full flex-1 items-end justify-center gap-0.5 rounded-2xl px-px transition-colors duration-200 group-hover:bg-raised/50 group-focus:bg-raised/50">
                <Bar pct={pct(c.u)} color="var(--chart-udhaar)" />
                <Bar pct={pct(c.v)} color="var(--chart-vasooli)" />
                {!c.u && !c.v && <span className="size-1.5 rounded-full bg-raised" />}
              </div>
              <span
                className={cn(
                  "flex h-5 items-center rounded-full px-2 text-[11px]",
                  c.d === 0 ? "bg-lime text-black" : "text-muted-foreground group-hover:text-foreground",
                  phone && "px-1"
                )}
              >
                {phone && c.d !== 0 && c.d % 2 ? "" : c.label}
              </span>
              <Tooltip day={c} height={pct(Math.max(c.u, c.v))} align={i < 2 ? "start" : i > chart.length - 3 ? "end" : "center"} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Bar({ pct, color }: { pct: number; color: string }) {
  if (!pct) return null
  return (
    <span
      data-bar
      className="max-w-4 min-w-1 flex-1 rounded-t-full rounded-b-[4px]"
      style={{ height: `${pct}%`, background: color }}
    />
  )
}

function Total({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-3xl bg-raised px-4 py-2.5">
      <p className="text-2xl font-light">{value}</p>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Dot color={color} />{label}</p>
    </div>
  )
}

function Tooltip({ day, height, align }: { day: Day; height: number; align: "start" | "center" | "end" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-10 flex min-w-[140px] translate-y-1 flex-col gap-1 rounded-2xl bg-paper px-3.5 py-2.5 text-black opacity-0 shadow-lg transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100",
        align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2 -translate-x-1/2"
      )}
      style={{ bottom: `min(calc(${height / 100} * (100% - 28px) + 36px), calc(100% - 80px))` }}
    >
      <p className="text-xs text-[#434343]">{dateLabel(day.d)}</p>
      <p className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-1.5"><Dot color="var(--chart-udhaar)" />Udhaar</span>{inr(day.u)}</p>
      <p className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-1.5"><Dot color="var(--chart-vasooli)" />Vasooli</span>{inr(day.v)}</p>
    </div>
  )
}
