import { ArrowIcon, MicIcon } from "@/components/app/icons"
import { DEMOS, STAGE_DOT, STAGE_NAME, inr, type Book } from "@/components/app/khata-data"
import type { Phase } from "@/components/app/khata-app"
import { useLayout } from "@/components/app/layout"
import { CornerButton, Dot, PanelTitle } from "@/components/app/parts"
import { cn } from "@/lib/utils"

const STAGES = ["Awaaz", "Suna", "Samjha", "Khata", "Jawab"]
const CHOICES = ["Verma ji", "Sharma ji"]

export function BoloScreen({
  book,
  demo,
  phase,
  step,
  picked,
  onSpeak,
  onNext,
  onPick,
}: {
  book: Book
  demo: number
  phase: Phase
  step: number
  picked: string | null
  onSpeak: () => void
  onNext: () => void
  onPick: (name: string) => void
}) {
  const d = DEMOS[demo]
  let reply = d.reply
  let stage = d.stage
  if (d.stage === "NEEDS_CLARIFICATION" && picked) {
    reply = `Theek hai. ${picked} ka ₹300 udhaar likh diya. Ab ${picked} ka baaki ${inr(book.balance[picked])} hai.`
    stage = "COMMITTED"
  }
  const { phone, compact } = useLayout()
  const history = [
    ...DEMOS.map((x) => ({
      heard: x.heard, stage: x.stage, mode: "Awaaz", ms: `${(x.ms.reduce((a, b) => a + b, 0) + 240).toLocaleString("en-IN")} ms`,
    })),
    { heard: "Ramu ki haazri laga do", stage: "COMMITTED" as const, mode: "Likha", ms: "1,204 ms" },
    { heard: "…", stage: "FAILED" as const, mode: "Awaaz", ms: "1,890 ms" },
  ]

  return (
    <div className={cn("grid items-start gap-[10px]", compact ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_minmax(300px,380px)]")}>
      <div
        data-panel
        data-flip-id="main-card"
        data-shape=""
        className={cn("relative flex flex-col items-center gap-7 rounded-[32px] bg-deep", phone ? "p-5 pb-[84px]" : "p-8", !compact && "min-h-[620px]")}
      >
        <div className="flex items-start justify-between self-stretch">
          <PanelTitle title="Bolo" sub="Hindi ya Hinglish mein" />
          <span className="rounded-full bg-raised px-3 py-1.5 text-[11px] text-muted-foreground">Example {demo + 1}/3</span>
        </div>
        <div className={cn("relative mt-3", phone ? "size-24" : "size-32")}>
          {phase === "listening" && <span aria-hidden className="absolute inset-0 animate-ring rounded-full bg-lime" />}
          <button
            type="button"
            title="Bolne ke liye dabaiye"
            aria-label="Bolne ke liye dabaiye"
            onClick={onSpeak}
            className={cn("relative grid cursor-pointer place-items-center rounded-full bg-lime text-black transition-transform duration-150 hover:scale-[1.04]", phone ? "size-24" : "size-32")}
          >
            <MicIcon size={40} stroke={1.6} />
          </button>
        </div>
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {phase === "listening" ? "Sun raha hoon…" : phase === "working" ? "Samajh raha hoon…" : "Bolne ke liye dabaiye"}
        </p>
        <p className={cn("min-h-10 max-w-[640px] text-center leading-[1.2] font-light text-pretty", phone ? "text-2xl" : "text-[32px]")}>
          {phase === "listening" ? "" : `“${d.heard}”`}
        </p>
        <ol className="flex flex-wrap justify-center gap-2" aria-label="Pipeline">
          {STAGES.map((label, i) => (
            <li
              key={label}
              className={cn(
                "flex items-baseline gap-2 rounded-full px-3.5 py-2 transition-colors duration-300",
                step > i ? "bg-[#e5e5e5] text-black" : step === i && phase === "working" ? "bg-raised text-muted-foreground" : "bg-card text-muted-foreground"
              )}
            >
              <span className="text-sm">{label}</span>
              <span className="text-[11px] opacity-70">{step > i ? `${d.ms[i]} ms` : ""}</span>
            </li>
          ))}
        </ol>
        {phase === "done" && (
          <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 self-stretch rounded-[28px] bg-paper p-6 text-black">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[#434343]">KhaataFlow ne kaha</span>
              <span className="flex items-center gap-1.5 rounded-full bg-black px-2.5 py-[5px] text-[11px] text-white">
                <Dot color={STAGE_DOT[stage]} size={8} />
                {STAGE_NAME[stage]}
              </span>
            </div>
            <p className="text-[22px] leading-[1.35]">{reply}</p>
            {stage === "NEEDS_CLARIFICATION" && (
              <div className="flex flex-wrap items-center gap-2">
                {CHOICES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onPick(name)}
                    className="h-11 cursor-pointer rounded-full bg-black px-5 text-[15px] text-white"
                  >
                    {name}
                  </button>
                ))}
                <span className="ml-1.5 text-[13px] text-[#434343]">2 minute mein jawab dijiye</span>
              </div>
            )}
          </div>
        )}
        <CornerButton corner="br" flip="main-br" title="Agla example" onClick={onNext} rotate>
          <ArrowIcon size={16} />
        </CornerButton>
      </div>

      <div className="flex flex-col gap-[10px]">
        <div data-panel data-flip-id="side-card" data-shape="" className="flex flex-col gap-3.5 rounded-[32px] bg-card p-6">
          <PanelTitle title="Likh ke bolo" sub="Shor ho to type kar dijiye" />
          <div className="flex items-center gap-2 rounded-full bg-raised py-1.5 pr-1.5 pl-[18px]">
            <input aria-label="Likh ke bolo" placeholder="Ramu ko 500 advance diya" className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm" />
            <button type="button" title="Bhejo" aria-label="Bhejo" className="grid size-10 cursor-pointer place-items-center rounded-full bg-white text-black">
              <ArrowIcon size={16} />
            </button>
          </div>
        </div>
        <div data-panel className="flex flex-col rounded-[32px] bg-card p-6">
          <div className="mb-3">
            <PanelTitle title="Pichhle commands" sub="Aaj" />
          </div>
          {history.map((h, i) => (
            <div key={i} className="flex flex-col gap-1.5 border-t border-line py-3">
              <p className="text-[15px]">“{h.heard}”</p>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Dot color={STAGE_DOT[h.stage]} size={8} />{STAGE_NAME[h.stage]}</span>
                <span>{h.mode} · {h.ms}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
