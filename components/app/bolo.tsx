"use client"

import * as React from "react"

import { useVoiceHistory } from "@/components/app/data"
import { useI18n } from "@/components/app/i18n"
import { ArrowIcon, MicIcon, PlayIcon, StopIcon } from "@/components/app/icons"
import { STAGE_DOT } from "@/components/app/khata-data"
import { useLayout } from "@/components/app/layout"
import { LoadError } from "@/components/app/ledger"
import { CornerButton, Dot, PanelTitle } from "@/components/app/parts"
import { useShell } from "@/components/app/shell"
import { api, type VoiceCommand } from "@/lib/api"
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
  const history = useVoiceHistory()
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [command, setCommand] = React.useState<VoiceCommand | null>(null)
  const [shown, setShown] = React.useState(STAGES.length)
  const [error, setError] = React.useState("")
  const [typed, setTyped] = React.useState("")
  const recorder = React.useRef<MediaRecorder | null>(null)
  const stopTimer = React.useRef<number | undefined>(undefined)
  const player = React.useRef<HTMLAudioElement | null>(null)

  // Show a finished command: chips light up one by one with their real timings, then the reply plays.
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
    async (call: () => Promise<VoiceCommand>) => {
      setError("")
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
      send(() =>
        api<VoiceCommand>("voice/text-commands", {
          method: "POST",
          json: { text, language: code },
        })
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
    rec.onstop = () => {
      window.clearTimeout(stopTimer.current)
      stream.getTracks().forEach((track) => track.stop())
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" })
      const form = new FormData()
      form.append(
        "audio",
        blob,
        `command.${blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm"}`
      )
      form.append("language", code)
      send(() => api<VoiceCommand>("voice/commands", { method: "POST", form }))
    }
    recorder.current = rec
    rec.start()
    setPhase("listening")
    stopTimer.current = window.setTimeout(
      () => rec.state === "recording" && rec.stop(),
      MAX_SECONDS * 1000
    )
  }

  const answer = (body: { option_id?: string; confirm?: boolean }) =>
    command &&
    send(() =>
      api<VoiceCommand>(`voice/commands/${command.id}/clarify`, {
        method: "POST",
        json: body,
      })
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
        "grid items-start gap-[10px]",
        compact
          ? "grid-cols-1"
          : "grid-cols-[minmax(0,1fr)_minmax(300px,380px)]"
      )}
    >
      <div
        data-panel
        data-flip-id="main-card"
        data-shape=""
        className={cn(
          "relative flex flex-col items-center gap-7 rounded-[32px] bg-deep",
          phone ? "p-5 pb-[84px]" : "p-8",
          !compact && "min-h-[620px]"
        )}
      >
        <div className="flex items-start justify-between gap-3 self-stretch">
          <PanelTitle title={t("screen.bolo.title")} sub={t("bolo.sub")} />
        </div>
        <div className={cn("relative mt-3", phone ? "size-24" : "size-32")}>
          {phase === "listening" && (
            <span
              aria-hidden
              className="absolute inset-0 animate-ring rounded-full bg-lime"
            />
          )}
          <button
            type="button"
            title={phase === "listening" ? t("bolo.stop") : t("bolo.press")}
            aria-label={
              phase === "listening" ? t("bolo.stop") : t("bolo.press")
            }
            aria-pressed={phase === "listening"}
            disabled={phase === "working"}
            onClick={listen}
            className={cn(
              "relative grid cursor-pointer place-items-center rounded-full bg-lime text-black transition-transform duration-150 active:scale-[0.96] disabled:cursor-wait disabled:opacity-70",
              phone ? "size-24" : "size-32"
            )}
          >
            {phase === "listening" ? (
              <StopIcon size={36} stroke={1.6} />
            ) : (
              <MicIcon size={40} stroke={1.6} />
            )}
          </button>
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
        <p
          className={cn(
            "min-h-10 max-w-[640px] text-center leading-[1.2] font-light text-pretty",
            phone ? "text-2xl" : "text-[32px]"
          )}
        >
          {phase === "done" && command?.transcript
            ? `“${command.transcript}”`
            : ""}
        </p>
        <ol
          className="flex flex-wrap justify-center gap-2"
          aria-label={t("bolo.pipeline")}
        >
          {STAGES.map((s, i) => {
            const ms = s.timings.reduce((a, k) => a + (timings[k] ?? 0), 0)
            const ran = phase === "done" && s.timings.some((k) => k in timings)
            const lit = ran && shown > i
            return (
              <li
                key={s.key}
                className={cn(
                  "flex items-baseline gap-2 rounded-full px-3.5 py-2 transition-colors duration-300",
                  lit
                    ? "bg-[#e5e5e5] text-black"
                    : phase === "working" && i === 0
                      ? "bg-raised text-muted-foreground"
                      : "bg-card text-muted-foreground"
                )}
              >
                <span className="text-sm">{t(s.key)}</span>
                <span className="text-[11px] opacity-70">
                  {lit ? `${ms.toLocaleString("en-IN")} ms` : ""}
                </span>
              </li>
            )
          })}
        </ol>
        {phase === "done" && command && (
          <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 self-stretch rounded-[28px] bg-paper p-6 text-black">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[#434343]">
                {t("bolo.replied")}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-black px-2.5 py-[5px] text-[11px] text-white">
                <Dot color={STAGE_DOT[stage] ?? STAGE_DOT.FAILED} size={8} />
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

      <div className="flex flex-col gap-[10px]">
        <form
          data-panel
          data-flip-id="side-card"
          data-shape=""
          onSubmit={(e) => {
            e.preventDefault()
            const text = typed.trim()
            if (!text || phase === "working") return
            setTyped("")
            sendText(text)
          }}
          className="flex flex-col gap-3.5 rounded-[32px] bg-card p-6"
        >
          <PanelTitle title={t("bolo.typeTitle")} sub={t("bolo.typeSub")} />
          <div className="flex items-center gap-2 rounded-full bg-raised py-1.5 pr-1.5 pl-[18px]">
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
              disabled={phase === "working"}
              className="grid size-10 cursor-pointer place-items-center rounded-full bg-white text-black disabled:opacity-50"
            >
              <ArrowIcon size={16} />
            </button>
          </div>
        </form>
        <div data-panel className="flex flex-col rounded-[32px] bg-card p-6">
          <div className="mb-3">
            <PanelTitle
              title={t("bolo.historyTitle")}
              sub={t("bolo.historySub")}
            />
          </div>
          {history.isError && <LoadError onRetry={() => history.refetch()} />}
          {history.data?.results.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => land(h)}
              className="flex cursor-pointer flex-col gap-1.5 border-t border-line py-3 text-left transition-colors duration-150 hover:bg-raised/40"
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
      </div>
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
