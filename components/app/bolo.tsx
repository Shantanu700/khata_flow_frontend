"use client"

import * as React from "react"
import {
  CircleCheckIcon,
  CircleDotIcon,
  CircleIcon,
  KeyboardIcon,
  ListChecksIcon,
  ListTodoIcon,
  XIcon,
} from "lucide-react"

import { SIZE, useVoiceHistory } from "@/components/app/data"
import { useI18n } from "@/components/app/i18n"
import { ArrowIcon, MicIcon, PlayIcon } from "@/components/app/icons"
import { STAGE_DOT } from "@/components/app/khata-data"
import { useLayout } from "@/components/app/layout"
import {
  clearNotch,
  LoadError,
  pagesOf,
  Pager,
  useNotchBox,
  Loading,
} from "@/components/app/ledger"
import { useLiveMic } from "@/components/app/live-mic"
import { CornerButton, Dot, PanelTitle, Tip } from "@/components/app/parts"
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
import { api, apiProgress, type Progress, type VoiceCommand } from "@/lib/api"
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
/** The command in flight; `id` arrives as the stream's first line, and a cancel waits for it. */
type Job = { abort: AbortController; id?: number; cancelled?: boolean }

const recordingType = () =>
  [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ].find((t) => MediaRecorder.isTypeSupported(t)) ?? ""

/** The reply's audio through the app's proxy (the API serves it only to the signed-in owner). The audio is cached,
 *  and answering a question gives the same command a new reply, so the URL changes with it. */
const audioUrl = (c: VoiceCommand) =>
  c.response_audio_url
    ? `/api/kf/voice/commands/${c.id}/audio?v=${encodeURIComponent(c.updated_at)}`
    : null

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
  // Stages the server has reported finished for the command in flight (timings_ms keys → ms).
  const [ticks, setTicks] = React.useState<Record<string, number>>({})
  const [mode, setMode] = React.useState<Mode>("audio")
  const [error, setError] = React.useState("")
  const [typed, setTyped] = React.useState("")
  // What was typed (or the answer tapped), shown while it is worked on; a recording shows its live transcript.
  const [sentText, setSentText] = React.useState("")
  const recorder = React.useRef<MediaRecorder | null>(null)
  const stopTimer = React.useRef<number | undefined>(undefined)
  const player = React.useRef<HTMLAudioElement | null>(null)
  const job = React.useRef<Job | null>(null)
  const live = useLiveMic()
  // A command waiting on a question: what is said or typed next may answer it (the server decides).
  const asking = React.useRef<number | undefined>(undefined)
  const replyTo = React.useCallback(() => {
    const id = asking.current
    asking.current = undefined
    return id
  }, [])

  // Show a finished command, then play its reply.
  const land = React.useCallback((c: VoiceCommand) => {
    asking.current = c.stage === "NEEDS_CLARIFICATION" ? c.id : undefined
    setCommand(c)
    setPhase("done")
    const url = audioUrl(c)
    if (url) {
      player.current?.pause()
      player.current = new Audio(url)
      player.current.play().catch(() => undefined)
    }
  }, [])

  const begin = React.useCallback((kind: Mode) => {
    const mine: Job = { abort: new AbortController() }
    job.current = mine
    setError("")
    setMode(kind)
    setTicks({})
    setPhase("working")
    return mine
  }, [])

  // The server reverses anything the command already wrote; only then stop reading its stream.
  const drop = React.useCallback(
    (mine: Job) =>
      run(() => api(`voice/commands/${mine.id}/cancel`, { method: "POST" }))
        .catch(() => setError(t("error.generic")))
        .finally(() => mine.abort.abort()),
    [run, t]
  )

  // Through the shell: whatever the command wrote, every screen refetches and its figures roll.
  const send = React.useCallback(
    async (mine: Job, call: (progress: Progress) => Promise<VoiceCommand>) => {
      const progress: Progress = {
        signal: mine.abort.signal,
        onId: (id) => {
          mine.id = id
          if (mine.cancelled) drop(mine)
        },
        onStage: (stage, ms) => {
          if (!mine.cancelled) setTicks((done) => ({ ...done, [stage]: ms }))
        },
      }
      try {
        const done = await run(() => call(progress))
        if (!mine.cancelled) land(done)
      } catch {
        if (mine.cancelled) return
        setPhase("idle")
        setError(t("error.generic"))
      }
    },
    [drop, land, run, t]
  )

  const cancel = () => {
    const mine = job.current
    if (!mine || mine.cancelled) return
    mine.cancelled = true
    setPhase("idle")
    setError(t("bolo.stage.CANCELLED"))
    if (mine.id) drop(mine)
  }

  const sendText = React.useCallback(
    (text: string) => {
      setSentText(text)
      return send(begin("text"), (progress) =>
        apiProgress<VoiceCommand>(
          "voice/text-commands",
          { json: { text, language: code, reply_to: replyTo() } },
          progress
        )
      )
    },
    [begin, send, code, replyTo]
  )

  // Text typed in the header's box arrives here.
  React.useEffect(() => {
    if (!said) return
    // After the effect, not inside it: sending sets this screen's state. Only the effect still standing sends,
    // or a remount (Strict Mode mounts twice) would send the command twice.
    let current = true
    queueMicrotask(() => {
      if (!current) return
      setSaid(null)
      sendText(said)
    })
    return () => {
      current = false
    }
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
      const mine = begin("audio")
      await live.stop()
      stream.getTracks().forEach((track) => track.stop())
      if (mine.cancelled) return
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" })
      const form = new FormData()
      form.append(
        "audio",
        blob,
        `command.${blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm"}`
      )
      form.append("language", code)
      const reply = replyTo()
      if (reply) form.append("reply_to", String(reply))
      send(mine, (progress) =>
        apiProgress<VoiceCommand>("voice/commands", { form }, progress)
      )
    }
    const finish = () => rec.state === "recording" && rec.stop()
    recorder.current = rec
    rec.start()
    setPhase("listening")
    void live.start(stream, code, finish)
    stopTimer.current = window.setTimeout(finish, MAX_SECONDS * 1000)
  }

  const answer = (
    label: string,
    body: { option_id?: string; confirm?: boolean }
  ) => {
    if (!command) return
    setSentText(label)
    return send(begin("text"), (progress) =>
      apiProgress<VoiceCommand>(
        `voice/commands/${command.id}/clarify`,
        { json: body },
        progress
      )
    )
  }

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
    | {
        kind: string
        options: { id: string; label: string }[]
        expires_at: string
      }
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
        <div className="-mx-2 flex min-h-0 w-[calc(100%+16px)] flex-1 flex-col overflow-y-auto px-2">
          <div className="m-auto flex w-full flex-col items-center gap-6 py-1">
            {/* One element that morphs: lime circle → rounded bar holding the waveform → the circle again inside the
                turning gradient while the command is worked on. */}
            <div
              className={cn(
                "relative isolate mt-3 grid shrink-0 place-items-center transition-[width,height,border-radius] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                phase === "listening"
                  ? cn(
                      "w-[440px] max-w-full",
                      phone ? "h-14 rounded-[22px]" : "h-16 rounded-[24px]"
                    )
                  : phone
                    ? "size-24 rounded-[48px]"
                    : "size-32 rounded-[64px]",
                phase === "working" ? "kf-ai-ring p-1" : "bg-lime text-black"
              )}
            >
              {phase === "working" ? (
                <div
                  role="img"
                  aria-label={t("bolo.working")}
                  className="grid size-full place-items-center rounded-[inherit] bg-deep"
                >
                  <MicIcon size={40} stroke={1.6} />
                </div>
              ) : phase === "listening" ? (
                <div className="flex size-full animate-in items-center gap-4 pr-2 pl-5 duration-300 fade-in-0">
                  <Elapsed />
                  <Waveform
                    levels={live.levels}
                    className="h-8 min-w-0 flex-1 text-black"
                  />
                  <Tip label={t("bolo.stop")}>
                    <button
                      type="button"
                      aria-label={t("bolo.stop")}
                      onClick={() =>
                        recorder.current?.state === "recording" &&
                        recorder.current.stop()
                      }
                      className={cn(
                        "grid shrink-0 cursor-pointer place-items-center rounded-full bg-black transition-transform duration-150 active:scale-[0.92]",
                        phone ? "size-10" : "size-12"
                      )}
                    >
                      <span className="size-3.5 rounded-[3px] bg-lime" />
                    </button>
                  </Tip>
                </div>
              ) : (
                <button
                  type="button"
                  aria-label={t("bolo.press")}
                  onClick={listen}
                  className="grid size-full cursor-pointer place-items-center rounded-[inherit] transition-transform duration-150 active:scale-[0.96]"
                >
                  <MicIcon size={40} stroke={1.6} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
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
              {phase === "working" && (
                <button
                  type="button"
                  onClick={cancel}
                  className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-raised px-4 text-[13px] transition-transform duration-150 active:scale-[0.97] dark:bg-card"
                >
                  <XIcon size={14} />
                  {t("bolo.cancel")}
                </button>
              )}
            </div>
            <p
              aria-live="polite"
              className={cn(
                "min-h-10 max-w-[640px] text-center leading-[1.2] font-light text-pretty transition-colors duration-300",
                phone ? "text-2xl" : "text-[32px]",
                phase === "working" && "text-muted-foreground"
              )}
            >
              {phase === "done" && command?.transcript ? (
                `“${command.transcript}”`
              ) : phase === "working" && mode === "text" ? (
                `“${sentText}”`
              ) : phase !== "done" &&
                mode === "audio" &&
                live.phrases.length ? (
                `“${live.phrases.join(" ")}”`
              ) : phase === "idle" ? (
                <Greeting />
              ) : (
                ""
              )}
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
                timings={phase === "working" ? ticks : timings}
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
                            o.label,
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
                    {clarification.kind !== "choose" && (
                      <span className="basis-full text-sm text-muted-foreground">
                        {t(
                          clarification.kind === "confirm_create"
                            ? "bolo.changeHint"
                            : "bolo.answerHint"
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="kf-ai-ring kf-ai-soft relative isolate w-full max-w-[640px] rounded-full p-[1.5px]">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const text = typed.trim()
              if (!text || phase === "working" || phase === "listening") return
              setTyped("")
              sendText(text)
            }}
            className="flex w-full items-center gap-3 rounded-full bg-raised py-1.5 pr-1.5 pl-5 dark:bg-[color-mix(in_oklch,var(--card)_45%,var(--deep))]"
          >
            <KeyboardIcon
              aria-hidden
              size={18}
              className="shrink-0 text-muted-foreground"
            />
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-label={t("bolo.typeTitle")}
              placeholder={t("bolo.typePlaceholder")}
              maxLength={500}
              className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
            />
            <Tip label={t("header.send")}>
              <button
                type="submit"
                aria-label={t("header.send")}
                disabled={
                  !typed.trim() || phase === "working" || phase === "listening"
                }
                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-foreground text-background transition-opacity duration-150 disabled:cursor-default disabled:opacity-0"
              >
                <ArrowIcon size={16} />
              </button>
            </Tip>
          </form>
        </div>
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
          {history.isPending && <Loading />}
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

const EXAMPLES = [1, 2, 3, 4]

/** The idle screen's welcome: a greeting for the time of day, and an example command that changes every few seconds. */
function Greeting() {
  const { t } = useI18n()
  const [hour] = React.useState(() => new Date().getHours())
  const [at, setAt] = React.useState(0)
  React.useEffect(() => {
    const next = window.setInterval(
      () => setAt((i) => (i + 1) % EXAMPLES.length),
      3500
    )
    return () => window.clearInterval(next)
  }, [])
  const hello = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"
  return (
    <span className="flex animate-in flex-col items-center gap-3 duration-500 fade-in-0">
      <span>
        <span className="text-muted-foreground">
          {t(`bolo.hello.${hello}`)}!
        </span>{" "}
        {t("bolo.ask")}
      </span>
      <span
        key={at}
        className="animate-in text-base text-muted-foreground duration-500 fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none"
      >
        {t("bolo.try", { text: t(`bolo.example.${EXAMPLES[at]}`) })}
      </span>
    </span>
  )
}

/** Time since recording started, as 0:07. */
function Elapsed() {
  const [start] = React.useState(() => Date.now())
  const [now, setNow] = React.useState(start)
  React.useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(tick)
  }, [])
  const s = Math.floor((now - start) / 1000)
  return (
    <span className="w-9 shrink-0 text-sm text-black/60 tabular-nums">
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </span>
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

/** The pipeline as AI Elements' Queue, live: each step moves to "done" with its time the moment the server reports
 *  it, and the step being worked on shimmers. A step counts as done once all its timings are in, or once a later
 *  step has started (a clarifying question ends Khata after resolving, without a commit). */
function ProcessQueue({
  stages,
  working,
  timings,
}: {
  stages: typeof STAGES
  working: boolean
  timings: Record<string, number>
}) {
  const { t } = useI18n()
  const started = stages.map((s) => s.timings.some((k) => k in timings))
  const finished = stages.filter(
    (s, i) =>
      !working ||
      s.timings.every((k) => k in timings) ||
      (started[i] && started.slice(i + 1).some(Boolean))
  )
  const left = stages.filter((s) => !finished.includes(s))
  return (
    <Trace
      aria-label={t("bolo.pipeline")}
      className="w-full max-w-[640px] gap-4 rounded-[28px] bg-raised px-6 py-5 dark:bg-card"
    >
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
              <TraceLine
                key={s.key}
                className="animate-in text-foreground duration-300 fade-in-0 slide-in-from-left-1"
              >
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
      {left.length > 0 && (
        <TraceCollapsible defaultOpen>
          <TraceCollapsibleTrigger>
            <TraceLine>
              <TraceIcon>
                <ListTodoIcon />
              </TraceIcon>
              <TraceTitle>
                {t("bolo.queue.todo", { count: left.length })}
              </TraceTitle>
            </TraceLine>
          </TraceCollapsibleTrigger>
          <TraceCollapsibleContent className="flex flex-col gap-2.5">
            {left.map((s, i) => (
              <TraceLine
                key={s.key}
                status={working && i === 0 ? "running" : "pending"}
              >
                <TraceIcon>
                  {working && i === 0 ? <CircleDotIcon /> : <CircleIcon />}
                </TraceIcon>
                <TraceTitle>{t(s.key)}</TraceTitle>
              </TraceLine>
            ))}
          </TraceCollapsibleContent>
        </TraceCollapsible>
      )}
    </Trace>
  )
}
