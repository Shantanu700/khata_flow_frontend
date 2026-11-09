import { ActivityChart } from "@/components/app/activity-chart"
import { ArrowIcon, MicIcon } from "@/components/app/icons"
import { inr, type Book, type Screen } from "@/components/app/khata-data"
import { useLayout } from "@/components/app/layout"
import { notchRadius } from "@/components/notch"
import { AliasChip, CornerButton, Dot, PanelTitle } from "@/components/app/parts"
import { cn } from "@/lib/utils"


export function DashboardScreen({ book, go, openCustomer }: { book: Book; go: (s: Screen) => void; openCustomer: (name: string) => void }) {
  const top = book.debtors.filter((d) => book.balance[d.name] > 0).slice(0, 5)
  const { phone, narrow, compact, cw } = useLayout()
  // Lead Flow's big-number steps, by content width.
  const big = phone ? 52 : cw < 914 ? 64 : cw < 1254 ? 80 : 96
  return (
    <div className="flex flex-col gap-[10px]">
      <div className={cn("grid gap-[10px]", narrow ? "grid-cols-1" : "grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]")}>
        <div data-panel data-flip-id="main-card" data-shape="" className={cn("relative flex min-h-[280px] flex-col justify-between gap-6 rounded-[32px] bg-card", phone ? "p-5" : "p-7")}>
          <div>
            <p className="text-sm text-muted-foreground">Kul baaki · {book.owingCount} logon se lena hai</p>
            <p data-roll="big" className="mt-2 leading-none font-light tracking-[-0.04em]" style={{ fontSize: big }}>{inr(book.total)}</p>
          </div>
          <div className={cn("flex flex-wrap", phone ? "gap-x-6 gap-y-3 pr-[88px]" : "gap-10 pr-[120px]")}>
            <Stat value={inr(book.weekUdhaar)} label="Udhaar · 7 din" dot="var(--chart-udhaar)" />
            <Stat value={inr(book.weekVasooli)} label="Vasooli · 7 din" dot="var(--chart-vasooli)" />
            <Stat value={String(book.entryCount)} label="Entries · 14 din" />
          </div>
          <CornerButton corner="br" flip="main-br" title="Bolke likho" onClick={() => go("bolo")} radius={notchRadius(phone ? 64 : 80)}
            className={cn("bg-lime text-black active:scale-[0.94]", phone ? "size-16" : "size-20")}>
            <MicIcon size={28} />
          </CornerButton>
        </div>

        <div data-panel data-flip-id="side-card" data-shape="" className={cn("relative flex flex-col gap-[18px] rounded-[32px] bg-paper text-black", phone ? "p-5" : "p-7")}>
          <div className="pr-[72px]">
            <PanelTitle title="Kam stock" sub={`${book.lowStock.length} cheezein seema se neeche`} subClassName="text-[#434343]" />
          </div>
          {book.lowStock.map((p) => (
            <div key={p.name} className="flex items-center gap-3 border-t border-black/10 pt-3.5">
              <span className="flex-1 text-base">{p.name}</span>
              <span className="text-[28px] font-light">{p.level}</span>
              <span className="w-16 text-xs text-[#434343]">seema {p.thr}</span>
            </div>
          ))}
          <CornerButton flip="side-tr" title="Stock kholo" onClick={() => go("stock")} rotate>
            <ArrowIcon />
          </CornerButton>
        </div>
      </div>

      <div className={cn("grid gap-[10px]", compact ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_minmax(300px,380px)]")}>
        <ActivityChart chart={book.chart} />

        <div data-panel className="flex flex-col gap-1 rounded-[32px] bg-deep p-6">
          <div className="mb-3 flex items-start justify-between">
            <PanelTitle title="Haal ki entries" sub="Bola ya likha, sab yahan" />
            <button type="button" onClick={() => go("entries")} className="cursor-pointer text-[13px] text-lime hover:text-foreground">
              Sab dekho
            </button>
          </div>
          {book.recent.map((e) => (
            <div key={e.id} className="flex items-center gap-3 border-t border-line py-2.5">
              <Dot color={e.dot} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.kindLabel} · {e.date}</p>
              </div>
              <span className="text-base font-light">{e.amt}</span>
            </div>
          ))}
        </div>
      </div>

      <section data-panel aria-labelledby="udhaar-wale" className="flex flex-col gap-[10px]">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="udhaar-wale" className="text-[28px] font-normal">Sabse zyada udhaar</h2>
          <span className="text-sm text-muted-foreground">Top {top.length}</span>
          <button
            type="button"
            onClick={() => go("khata")}
            className="cursor-pointer text-sm underline underline-offset-4 hover:text-lime"
          >
            Saare {book.customers.length} grahak dekho
          </button>
        </div>
        <div
          className={cn(
            phone
              ? "flex snap-x snap-mandatory gap-[10px] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden *:w-[260px] *:flex-none *:snap-start"
              : "grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[10px]"
          )}
        >
          {top.length === 0 && <p className="rounded-[32px] bg-card p-6 text-sm text-muted-foreground">Kisi par udhaar baaki nahi.</p>}
          {top.map((d) => (
            <div key={d.name} className="relative flex min-h-[210px] flex-col justify-between gap-4 rounded-[32px] bg-card p-5">
              <span className="grid size-11 place-items-center rounded-full bg-raised text-base">{d.initial}</span>
              <div>
                <p className="text-[22px]">{d.name}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{d.last}</p>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div className={d.aliases.length ? undefined : "invisible"}>
                  <p className="mb-1.5 text-[11px] text-muted-foreground">Bolte hain</p>
                  <div className="flex flex-wrap gap-1">{d.aliases.map((a) => <AliasChip key={a} small>{a}</AliasChip>)}</div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-light">{d.bal}</p>
                  <div className="mt-1 flex justify-end gap-[3px]" role="img" aria-label={`${d.dots.filter((c) => !c.startsWith("var")).length} of 5`}>
                    {d.dots.map((color, i) => <Dot key={i} color={color} size={9} />)}
                  </div>
                </div>
              </div>
              <CornerButton title="Khata kholo" onClick={() => openCustomer(d.name)} rotate>
                <ArrowIcon size={16} />
              </CornerButton>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({ value, label, dot }: { value: string; label: string; dot?: string }) {
  return (
    <div>
      <p className="text-[32px] font-light">{value}</p>
      <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        {dot && <Dot color={dot} size={8} />}
        {label}
      </p>
    </div>
  )
}
