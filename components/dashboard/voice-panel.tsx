"use client"

import * as React from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Mic } from "lucide-react"

import type { VoiceDemo } from "@/lib/demo"
import { EASE_OUT, reduceMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"

type Phase = "idle" | "listening" | "working" | "replied"

const STEPS = [
  { label: "Suna", by: "Gnani Prisma" },
  { label: "Samjha", by: "LLM" },
  { label: "Likha", by: "Khata" },
  { label: "Bola", by: "Gnani Timbre" },
]
const STAGE: Record<VoiceDemo["stage"], { label: string; className: string }> = {
  COMMITTED: { label: "Likh diya", className: "bg-lime text-black" },
  ANSWERED: { label: "Jawab", className: "bg-cyan text-black" },
  NEEDS_CLARIFICATION: { label: "Sawaal", className: "bg-heat-3 text-black" },
}

/** The voice agent, as the reference's call card + summary card. Plays the shop's example
 *  commands (the backend's real replies to them) one per press; nothing is recorded. */
export type VoiceHandle = { play: () => void }

export function VoicePanel({ demos, ref: handle }: { demos: VoiceDemo[]; ref?: React.Ref<VoiceHandle> }) {
  const ref = React.useRef<HTMLElement>(null)
  const timers = React.useRef<number[]>([])
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [step, setStep] = React.useState(-1)
  const [index, setIndex] = React.useState(0)
  const demo = demos[index % demos.length]

  const clear = () => {
    timers.current.forEach(window.clearTimeout)
    timers.current = []
  }
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, reduceMotion() ? 0 : ms))

  const play = React.useCallback(() => {
    if (phase === "listening" || phase === "working") return
    clear()
    const next = phase === "idle" ? index : index + 1
    setIndex(next)
    setStep(-1)
    setPhase("listening")
    later(1500, () => {
      setPhase("working")
      setStep(0)
    })
    later(1900, () => setStep(1))
    later(2400, () => setStep(2))
    later(2800, () => {
      setStep(3)
      setPhase("replied")
    })
  }, [phase, index])

  React.useImperativeHandle(handle, () => ({
    play: () => {
      ref.current?.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "nearest" })
      play()
    },
  }), [play])
  React.useEffect(() => clear, [])

  useGSAP(
    () => {
      const q = gsap.utils.selector(ref)
      const full = !reduceMotion()
      if (phase === "working") {
        gsap.from(q("[data-word]"), full
          ? { yPercent: 80, opacity: 0, duration: 0.35, stagger: 0.06, ease: EASE_OUT }
          : { opacity: 0, duration: 0.2 })
      }
      if (phase === "replied") {
        gsap.from(q("[data-reply]"), full
          ? { y: 24, opacity: 0, scale: 0.97, duration: 0.5, ease: EASE_OUT, clearProps: "transform,opacity" }
          : { opacity: 0, duration: 0.2 })
        gsap.from(q("[data-stage-chip]"), { scale: full ? 0.6 : 1, opacity: 0, duration: 0.3, delay: 0.25, ease: EASE_OUT })
      }
    },
    { scope: ref, dependencies: [phase] }
  )

  const listening = phase === "listening"
  return (
    <section ref={ref} data-rise aria-labelledby="voice-title" className="flex flex-col gap-panel">
      <div className="flex flex-col items-center gap-6 rounded-xl bg-black p-6 pb-7">
        <div className="flex w-full items-start justify-between">
          <h2 id="voice-title" className="text-xl leading-tight font-normal">
            Bolo
            <span className="block text-sm text-muted-foreground">Hindi ya Hinglish mein</span>
          </h2>
          <span className="rounded-full bg-raised px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            Example {(index % demos.length) + 1}/{demos.length}
          </span>
        </div>

        <button
          type="button"
          onClick={play}
          aria-label={listening ? "Sun raha hoon" : "Bolne ke liye dabaiye"}
          aria-pressed={listening}
          className="relative grid size-24 place-items-center rounded-full bg-lime text-black transition-transform duration-150 ease-out outline-none hover:scale-[1.04] focus-visible:ring-4 focus-visible:ring-white/60 active:scale-95"
        >
          {listening && (
            <>
              <span aria-hidden className="absolute inset-0 animate-mic-ring rounded-full bg-lime" />
              <span aria-hidden className="absolute inset-0 animate-mic-ring rounded-full bg-lime [animation-delay:0.9s]" />
            </>
          )}
          <Mic aria-hidden className="relative size-9" />
        </button>
        <p aria-live="polite" className="h-5 text-sm text-muted-foreground">
          {phase === "idle" && "Dabaiye aur boliye"}
          {listening && "Sun raha hoon…"}
          {phase === "working" && "Samajh raha hoon…"}
          {phase === "replied" && "Phir se dabaiye, agla example"}
        </p>

        <ol className="grid w-full grid-cols-4 gap-1.5" aria-label="Pipeline">
          {STEPS.map((s, i) => (
            <li key={s.label} className="flex flex-col items-center gap-1.5 text-center">
              <span
                className={cn(
                  "h-1.5 w-full rounded-full transition-colors duration-300 ease-out",
                  i <= step ? "bg-lime" : "bg-raised"
                )}
              />
              <span className={cn("text-xs transition-colors duration-300", i <= step ? "text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
              <span className="text-[10px] text-muted-foreground">{s.by}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex min-h-56 flex-col gap-3 rounded-xl bg-paper p-5 text-black">
        <p className="text-xs text-black/60">Dukaandaar ne kaha</p>
        <p className="min-h-14 text-lg leading-snug" aria-live="polite">
          {phase === "working" || phase === "replied"
            ? demo.heard.split(" ").map((word, i) => (
                <span key={`${index}-${i}`} className="inline-flex overflow-hidden pb-0.5 align-bottom">
                  <span data-word className="inline-block">
                    {word}&nbsp;
                  </span>
                </span>
              ))
            : <span className="text-black/40">“{demos[index % demos.length].heard}”</span>}
        </p>
        {phase === "replied" && (
          <div data-reply className="mt-auto flex flex-col gap-2 rounded-lg bg-black p-4 text-white">
            <span data-stage-chip className={cn("self-start rounded-full px-2 py-0.5 text-[10px] font-semibold", STAGE[demo.stage].className)}>
              {STAGE[demo.stage].label}
            </span>
            <p className="text-base leading-snug">{demo.reply}</p>
          </div>
        )}
      </div>
    </section>
  )
}
