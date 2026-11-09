"use client"

import * as React from "react"
import {
  CircleCheckIcon,
  CircleIcon,
  ListChecksIcon,
  ListTodoIcon,
} from "lucide-react"

import { SIZE, useVoiceHistory } from "@/components/app/data"
import { useI18n } from "@/components/app/i18n"
import { ArrowIcon, MicIcon, PlayIcon, StopIcon } from "@/components/app/icons"
import { STAGE_DOT } from "@/components/app/khata-data"
import { useLayout } from "@/components/app/layout"
import {
  clearNotch,
  LoadError,
  pagesOf,
  Pager,
  useNotchBox,
} from "@/components/app/ledger"
import { useLiveMic } from "@/components/app/live-mic"
import { CornerButton, Dot, PanelTitle } from "@/components/app/parts"
import { useShell } from "@/components/app/shell"
import { Waveform } from "@/components/app/waveform"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"
import { Notch, notchRadius } from "@/components/notch"
import { VoicePoweredOrb } from "@/components/ui/voice-powered-orb"
import { api, type VoiceCommand } from "@/lib/api"
import { reduceMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"

/** The pipeline's stages as the chips show them, and the timings_ms keys each one adds up. */
const STAGES: { key: string; timings: string[] }[] = [
  { key: "bolo.stage.audio", timings: ["normalise"] },
  { key: "bolo.stage.heard", timings: ["stt"] },
  { key: "bolo.stage.understood", timings: ["intent"] },
  { key: "bolo.stage.ledger", timings: ["resolve", "commit"] },
  { key: "bolo.stage.reply", timings: ["tts"] },
]
// Gnani accepts up to 20 seconds; stop a little before.
const MAX_SECONDS = 19

type Phase = "idle" | "listening" | "working" | "done"
type Mode = "audio" | "text"

const recordingType = () =>
  [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ].find((t) => MediaRecorder.isTypeSupported(t)) ?? ""

/** The reply's audio through the app's proxy (the API serves it only to the signed-in owner). */
const audioUrl = (c: VoiceCommand) =>
  c.response_audio_url ? `/api/kf/voice/commands/${c.id}/audio` : null

const total = (c: VoiceCommand) =>
  Object.values((c.timings_ms ?? {}) as Record<string, number>).reduce(
    (a, ms) => a + ms,
    0
  )

export function BoloScreen() {
  const { t, code } = useI18n()
  const { run, said, setSaid } = useShell()
  const { phone, compact } = useLayout()
  const [historyPage, setHistoryPage] = React.useState(1)
  const history = useVoiceHistory(historyPage)
  const historyPages = pagesOf(history.data?.count, SIZE.table)
  const historyRef = React.useRef<HTMLElement>(null)
  const historyBox = useNotchBox(historyRef)
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [command, setCommand] = React.useState<VoiceCommand | null>(null)
  const [shown, setShown] = React.useState(STAGES.length)
  const [mode, setMode] = React.useState<Mode>("audio")
  const [error, setError] = React.useState("")
  const [typed, setTyped] = React.useState("")
  const recorder = React.useRef<MediaRecorder | null>(null)
  const stopTimer = React.useRef<number | undefined>(undefined)
  const player = React.useRef<HTMLAudioElement | null>(null)
  const live = useLiveMic()
  const conversation = React.useRef<HTMLDivElement>(null)

  // Like a chat: whatever arrives last (the queue's steps, the reply) is scrolled into view.
  React.useEffect(() => {
    const el = conversation.current
    if (!el || phase === "idle" || phase === "listening") return
    el.scrollTo({
      top: el.scrollHeight,
      behavior: reduceMotion() ? "auto" : "smooth",
    })
  }, [phase, shown, command])

  // Show a finished command: its steps move to "done" one by one with their real timings, then the reply plays.
  const land = React.useCallback((c: VoiceCommand) => {
    setCommand(c)
    setPhase("done")
    setShown(0)
    STAGES.forEach((_, i) =>
      window.setTimeout(() => setShown(i + 1), 110 * (i + 1))
    )
    const url = audioUrl(c)
    if (url) {
      player.current?.pause()
      player.current = new Audio(url)
      player.current.play().catch(() => undefined)
    }
  }, [])

  // Through the shell: whatever the command wrote, every screen refetches and its figures roll.
  const send = React.useCallback(
    async (call: () => Promise<VoiceCommand>, kind: Mode) => {
      setError("")
      setMode(kind)
      setPhase("working")
      try {
        land(await run(call))
      } catch {
        setPhase("idle")
        setError(t("error.generic"))
      }
    },
    [land, run, t]
  )

  const sendText = React.useCallback(
    (text: string) =>
      send(
        () =>
          api<VoiceCommand>("voice/text-commands", {
            method: "POST",
            json: { text, language: code },
          }),
        "text"
      ),
    [send, code]
  )

  // Text typed in the header's box arrives here.
  React.useEffect(() => {
    if (!said) return
    // After the effect, not inside it: sending sets this screen's state.
    queueMicrotask(() => {
      setSaid(null)
      sendText(said)
    })
  }, [said, setSaid, sendText])

  React.useEffect(
    () => () => {
      window.clearTimeout(stopTimer.current)
      recorder.current?.stream.getTracks().forEach((track) => track.stop())
      player.current?.pause()
    },
    []
  )

  const listen = async () => {
    if (phase === "listening") return recorder.current?.stop()
    if (phase === "working") return
    setError("")
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return setError(t("bolo.noMic"))
    }
    const type = recordingType()
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = async () => {
      window.clearTimeout(stopTimer.current)
      setPhase("working")
      await live.stop()
      stream.getTracks().forEach((track) => track.stop())
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" })
      const form = new FormData()
      form.append(
        "audio",
        blob,
        `command.${blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm"}`
      )
      form.append("language", code)
      send(
        () => api<VoiceCommand>("voice/commands", { method: "POST", form }),
        "audio"
      )
    }
    recorder.current = rec
    rec.start()
    setPhase("listening")
    void live.start(stream, code)
    stopTimer.current = window.setTimeout(
      () => rec.state === "recording" && rec.stop(),
      MAX_SECONDS * 1000
    )
  }

  const answer = (body: { option_id?: string; confirm?: boolean }) =>
    command &&
    send(
      () =>
        api<VoiceCommand>(`voice/commands/${command.id}/clarify`, {
          method: "POST",
          json: body,
        }),
      "text"
    )

  const replay = () => {
    const url = command && audioUrl(command)
    if (!url) return
    player.current?.pause()
    player.current = new Audio(url)
    player.current.play().catch(() => undefined)
  }

  const stage = command?.stage ?? ""
  const timings = (command?.timings_ms ?? {}) as Record<string, number>
  const clarification = command?.clarification as
    | { options: { id: string; label: string }[]; expires_at: string }
    | null
    | undefined

  return (
    <div
      className={cn(
        "grid gap-[10px]",
        compact
          ? "grid-cols-1 items-start"
          : "h-full grid-cols-[minmax(0,1fr)_minmax(300px,380px)] grid-rows-[minmax(0,1fr)]"
      )}
    >
      <div
        data-panel
        data-flip-id="main-card"
        data-shape=""
        className={cn(
          "relative flex flex-col items-center gap-6 rounded-[32px] bg-deep",
          phone
            ? "p-5 pb-[84px]"
            : compact
              ? "min-h-[620px] p-8 pb-[84px]"
              : "p-8"
        )}
      >
        <div className="flex items-start justify-between gap-3 self-stretch">
          <PanelTitle title={t("screen.bolo.title")} sub={t("bolo.sub")} />
        </div>
        <div
          ref={conversation}
          className="-mx-2 flex min-h-0 w-[calc(100%+16px)] flex-1 flex-col overflow-y-auto px-2"
        >
          <div className="m-auto flex w-full flex-col items-center gap-6 py-1">
            <div className={cn("relative mt-3", phone ? "size-24" : "size-32")}>
              {phase === "working" ? (
                <div
                  role="img"
                  aria-label={t("bolo.working")}
                  className={cn(
                    "kf-ai-ring relative isolate animate-in rounded-full p-1 duration-300 fade-in-0 zoom-in-95",
                    phone ? "size-24" : "size-32"
                  )}
                >
                  <div className="size-full overflow-hidden rounded-full bg-deep">
                    <VoicePoweredOrb level={thinking} />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  title={
                    phase === "listening" ? t("bolo.stop") : t("bolo.press")
                  }
                  aria-label={
                    phase === "listening" ? t("bolo.stop") : t("bolo.press")
                  }
                  aria-pressed={phase === "listening"}
                  onClick={listen}
                  className={cn(
                    "relative grid cursor-pointer place-items-center overflow-hidden rounded-full transition-transform duration-150 active:scale-[0.96]",
                    phase === "listening"
                      ? "bg-deep text-white"
                      : "bg-lime text-black",
                    phone ? "size-24" : "size-32"
                  )}
                >
                  {phase === "listening" ? (
                    <>
                      <VoicePoweredOrb
                        level={live.loudness}
                        className="absolute inset-0"
                      />
                      <StopIcon
                        size={22}
                        stroke={1.8}
                        className="relative drop-shadow"
                      />
                    </>
                  ) : (
                    <MicIcon size={40} stroke={1.6} />
                  )}
                </button>
              )}
            </div>
            <p aria-live="polite" className="text-sm text-muted-foreground">
              {error ||
                (phase === "listening"
                  ? t("bolo.listening")
                  : phase === "working"
                    ? t("bolo.working")
                    : phase === "done"
                      ? t("bolo.again")
                      : t("bolo.press"))}
            </p>
            {phase === "listening" && (
              <Waveform levels={live.levels} className="max-w-[480px]" />
            )}
            <p
              aria-live="polite"
              className={cn(
                "min-h-10 max-w-[640px] text-center leading-[1.2] font-light text-pretty transition-colors duration-300",
                phone ? "text-2xl" : "text-[32px]",
                phase === "working" && "text-muted-foreground"
              )}
            >
              {phase === "done" && command?.transcript
                ? `“${command.transcript}”`
                : phase !== "done" && live.phrases.length
                  ? `“${live.phrases.join(" ")}”`
                  : ""}
            </p>
            {(phase === "working" || phase === "done") && (
              <ProcessQueue
                stages={
                  phase === "working"
                    ? mode === "audio"
                      ? STAGES
                      : STAGES.slice(2)
                    : STAGES.filter((s) => s.timings.some((k) => k in timings))
                }
                working={phase === "working"}
                done={phase === "done" ? shown : 0}
                timings={timings}
              />
            )}
            {phase === "done" && command && (
              <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 self-stretch rounded-[28px] bg-paper p-6 text-black">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[#434343]">
                    {t("bolo.replied")}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-black px-2.5 py-[5px] text-[11px] text-white">
                    <Dot
                      color={STAGE_DOT[stage] ?? STAGE_DOT.FAILED}
                      size={8}
                    />
                    {t(`bolo.stage.${stage}`)}
                  </span>
                </div>
                <p className="text-[22px] leading-[1.35]">
                  {command.response_text}
                </p>
                {stage === "NEEDS_CLARIFICATION" && clarification && (
                  <div className="flex flex-wrap items-center gap-2">
                    {clarification.options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() =>
                          answer(
                            o.id === "yes" || o.id === "no"
                              ? { confirm: o.id === "yes" }
                              : { option_id: o.id }
                          )
                        }
                        className="h-11 cursor-pointer rounded-full bg-black px-5 text-[15px] text-white transition-transform duration-150 active:scale-[0.97]"
                      >
                        {o.label}
                      </button>
                    ))}
                    <Countdown until={clarification.expires_at} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const text = typed.trim()
            if (!text || phase === "working" || phase === "listening") return
            setTyped("")
            sendText(text)
          }}
          className="flex w-full max-w-[640px] flex-col gap-3.5 rounded-[28px] bg-raised p-5 dark:bg-card"
        >
          <PanelTitle title={t("bolo.typeTitle")} sub={t("bolo.typeSub")} />
          <div className="flex items-center gap-2 rounded-full bg-card py-1.5 pr-1.5 pl-[18px] dark:bg-raised">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-label={t("bolo.typeTitle")}
              placeholder={t("bolo.typePlaceholder")}
              maxLength={500}
              className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm"
            />
            <button
              type="submit"
              title={t("header.send")}
              aria-label={t("header.send")}
              disabled={phase === "working" || phase === "listening"}
              className="grid size-10 cursor-pointer place-items-center rounded-full bg-foreground text-background disabled:opacity-50"
            >
              <ArrowIcon size={16} />
            </button>
          </div>
        </form>
        <CornerButton
          corner="br"
          flip="main-br"
          title={t("bolo.replay")}
          onClick={replay}
          disabled={!command || !audioUrl(command)}
        >
          <PlayIcon size={16} />
        </CornerButton>
      </div>

      <section
        ref={historyRef}
        data-panel
        data-flip-id="side-card"
        data-shape=""
        className={cn(
          "relative flex min-h-0 flex-col gap-1.5 rounded-[32px] bg-card p-4",
          compact && "h-[min(640px,80dvh)]"
        )}
      >
        <div
          className="min-h-[52px] px-2 pt-1"
          style={clearNotch(historyBox, phone, 16, 130)}
        >
          <PanelTitle
            title={t("bolo.historyTitle")}
            sub={t("bolo.historySub")}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          {history.isError && <LoadError onRetry={() => history.refetch()} />}
          {history.data?.results.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => land(h)}
              className="flex w-full cursor-pointer flex-col gap-1.5 border-t border-line py-3 text-left transition-colors duration-150 hover:bg-raised/40"
            >
              <p className="text-[15px]">“{h.transcript || "…"}”</p>
              <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Dot
                    color={STAGE_DOT[h.stage] ?? STAGE_DOT.FAILED}
                    size={8}
                  />
                  {t(`bolo.stage.${h.stage}`)}
                </span>
                <span>
                  {t(`src.${h.input_mode}`)} ·{" "}
                  {total(h).toLocaleString("en-IN")} ms
                </span>
              </div>
            </button>
          ))}
          {history.data && history.data.results.length === 0 && (
            <p className="border-t border-line py-4 text-sm text-muted-foreground">
              {t("bolo.historyNone")}
            </p>
          )}
        </div>
        <Notch
          corner="tr"
          r={notchRadius(phone ? 44 : 52)}
          gap={10}
          data-flip-id="side-tr"
          data-shape=""
          className="flex items-center"
        >
          <Pager
            page={historyPage}
            pages={historyPages}
            onPage={setHistoryPage}
          />
        </Notch>
      </section>
    </div>
  )
}

/** "1:42 mein jawab dijiye", counting down to the question's expiry. */
function Countdown({ until }: { until: string }) {
  const { t } = useI18n()
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [])
  const left = Math.max(0, Math.round((new Date(until).getTime() - now) / 1000))
  return (
    <span className="ml-1.5 text-[13px] text-[#434343] tabular-nums">
      {left
        ? t("bolo.answerIn", {
            time: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`,
          })
        : t("bolo.expired")}
    </span>
  )
}

/** The pipeline as AI Elements' Queue: what is left (shimmering while the server works) and what is done, each step
 *  with its real time from timings_ms. */
function ProcessQueue({
  stages,
  working,
  done,
  timings,
}: {
  stages: typeof STAGES
  working: boolean
  done: number
  timings: Record<string, number>
}) {
  const { t } = useI18n()
  const finished = stages.slice(0, done)
  const left = stages.slice(done)
  return (
    <Trace
      aria-label={t("bolo.pipeline")}
      className="w-full max-w-[640px] gap-4 rounded-[28px] bg-raised px-6 py-5 dark:bg-card"
    >
      {left.length > 0 && (
        <TraceCollapsible defaultOpen>
          <TraceCollapsibleTrigger>
            <TraceLine status={working ? "running" : undefined}>
              <TraceIcon>
                <ListTodoIcon />
              </TraceIcon>
              <TraceTitle>
                {t("bolo.queue.todo", { count: left.length })}
              </TraceTitle>
            </TraceLine>
          </TraceCollapsibleTrigger>
          <TraceCollapsibleContent className="flex flex-col gap-2.5">
            {left.map((s) => (
              <TraceLine key={s.key} status="pending">
                <TraceIcon>
                  <CircleIcon />
                </TraceIcon>
                <TraceTitle>{t(s.key)}</TraceTitle>
              </TraceLine>
            ))}
          </TraceCollapsibleContent>
        </TraceCollapsible>
      )}
      {finished.length > 0 && (
        <TraceCollapsible defaultOpen>
          <TraceCollapsibleTrigger>
            <TraceLine>
              <TraceIcon>
                <ListChecksIcon />
              </TraceIcon>
              <TraceTitle>
                {t("bolo.queue.done", { count: finished.length })}
              </TraceTitle>
            </TraceLine>
          </TraceCollapsibleTrigger>
          <TraceCollapsibleContent className="flex flex-col gap-2.5">
            {finished.map((s) => (
              <TraceLine key={s.key} className="text-foreground">
                <TraceIcon className="text-vasooli">
                  <CircleCheckIcon />
                </TraceIcon>
                <TraceTitle>{t(s.key)}</TraceTitle>
                <TraceDescription>
                  {s.timings
                    .reduce((a, k) => a + (timings[k] ?? 0), 0)
                    .toLocaleString("en-IN")}{" "}
                  ms
                </TraceDescription>
              </TraceLine>
            ))}
          </TraceCollapsibleContent>
        </TraceCollapsible>
      )}
    </Trace>
  )
}

/** A slow breath for the orb while the server works: it keeps turning without a voice to follow. */
const thinking = () => 0.3 + 0.15 * Math.sin(performance.now() / 600)
