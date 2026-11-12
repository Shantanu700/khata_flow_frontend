"use client"

import * as React from "react"
import {
  CircleCheckIcon,
  CircleDotIcon,
  CircleIcon,
  KeyboardIcon,
  ListChecksIcon,
  ListTodoIcon,
  PlusIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from "lucide-react"

import { dayLabel, useI18n } from "@/components/app/i18n"
import { ArrowIcon, Branded, MicIcon, PlayIcon } from "@/components/app/icons"
import { STAGE_DOT } from "@/components/app/khata-data"
import { useLayout } from "@/components/app/layout"
import {
  clearNotch,
  LoadError,
  Pager,
  useNotchBox,
  Loading,
} from "@/components/app/ledger"
import { CornerButton, Dot, PanelTitle, Tip } from "@/components/app/parts"
import { useChatThread } from "@/components/app/use-chat-thread"
import { useCommand } from "@/components/app/use-command"
import { useLanguageOffer } from "@/components/app/use-language-offer"
import { useRecorder } from "@/components/app/use-recorder"
import { useReplyAudio } from "@/components/app/use-reply-audio"
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
import { isoDay, type VoiceCommand } from "@/lib/api"
import { cn } from "@/lib/utils"

/** The pipeline's stages as the chips show them, and the timings_ms keys each one adds up. */
const STAGES: { key: string; timings: string[] }[] = [
  { key: "bolo.stage.audio", timings: ["normalise"] },
  { key: "bolo.stage.heard", timings: ["stt"] },
  { key: "bolo.stage.understood", timings: ["intent"] },
  { key: "bolo.stage.ledger", timings: ["resolve", "commit"] },
  { key: "bolo.stage.reply", timings: ["tts"] },
]
const total = (c: VoiceCommand) =>
  Object.values((c.timings_ms ?? {}) as Record<string, number>).reduce(
    (a, ms) => a + ms,
    0
  )

export function BoloScreen() {
  const { t, locale } = useI18n()
  const { phone, compact } = useLayout()
  const listRef = React.useRef<HTMLElement>(null)
  const listBox = useNotchBox(listRef)
  const scroller = React.useRef<HTMLDivElement>(null)
  const [typed, setTyped] = React.useState("")

  const { muted, toggleMute, play, autoplay, stop } = useReplyAudio()
  const chat = useChatThread()
  const {
    chats,
    days: chatDays,
    page: chatsPage,
    pages: chatPages,
    setPage: setChatsPage,
    openId,
    title: openTitle,
    messages,
    thread,
    lastId,
    show,
  } = chat
  useLanguageOffer(chat.landed)
  // Show a finished message in its chat, then play its reply.
  const onDone = React.useCallback(
    (c: VoiceCommand) => {
      show(c)
      autoplay(c)
    },
    [show, autoplay]
  )
  const command = useCommand({ chat: chat.current, onDone })
  const { phase, mode, ticks, error, sentText, busy, sendText, cancel } =
    command
  const mic = useRecorder(command)

  // Follow the conversation: the newest message, and the words of the one in flight as they arrive.
  React.useEffect(() => {
    const box = scroller.current
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" })
  }, [lastId, phase, mic.phrases.length, openId])

  const openChat = (id: number | null) => {
    if (busy) return
    stop()
    chat.open(id)
    command.reset()
  }

  const inFlight =
    phase === "working"
      ? mode === "text"
        ? sentText
        : mic.phrases.join(" ") || "…"
      : phase === "listening"
        ? mic.phrases.join(" ")
        : ""
  const clock = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
    })
  const when = (iso: string) => {
    const at = new Date(iso)
    return isoDay(at) === isoDay()
      ? at.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })
      : dayLabel(isoDay(at), t, locale)
  }

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
          "relative flex flex-col gap-4 rounded-[32px] bg-deep",
          phone
            ? "h-[min(720px,82dvh)] p-5"
            : compact
              ? "h-[min(760px,86dvh)] p-8"
              : "min-h-0 p-8"
        )}
      >
        <div className="pr-12">
          <PanelTitle
            title={t("screen.bolo.title")}
            sub={openTitle || t("bolo.sub")}
            subClassName="line-clamp-1"
          />
        </div>
        <div
          ref={scroller}
          className="-mx-2 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-1"
        >
          {messages.hasNextPage && (
            <button
              type="button"
              onClick={() => messages.fetchNextPage()}
              className="mx-auto h-9 shrink-0 cursor-pointer rounded-full bg-raised px-4 text-[13px] dark:bg-card"
            >
              {t("bolo.earlier")}
            </button>
          )}
          {messages.isError && <LoadError onRetry={() => messages.refetch()} />}
          {thread.length === 0 && !inFlight && phase !== "working" && (
            <p
              className={cn(
                "m-auto max-w-[640px] text-center leading-[1.2] font-light text-pretty",
                phone ? "text-2xl" : "text-[32px]"
              )}
            >
              {openId && messages.isPending ? "" : <Greeting />}
            </p>
          )}
          {thread.map((m) => (
            <Message
              key={m.id}
              m={m}
              open={m.id === lastId && !busy}
              when={when(m.created_at)}
              onAnswer={sendText}
              onPlay={() => play(m)}
            />
          ))}
          {inFlight && <UserBubble text={inFlight} />}
          {phase === "working" && (
            <div className="mr-auto flex w-full max-w-[560px] animate-in flex-col gap-3 duration-300 fade-in-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="kf-ai-ring grid size-9 place-items-center rounded-full p-[3px]">
                  <span className="grid size-full place-items-center rounded-full bg-deep">
                    <MicIcon size={14} stroke={1.8} />
                  </span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("bolo.working")}
                </span>
                <button
                  type="button"
                  onClick={cancel}
                  className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-raised px-4 text-[13px] transition-transform duration-150 active:scale-[0.97] dark:bg-card"
                >
                  <XIcon size={14} />
                  {t("bolo.cancel")}
                </button>
              </div>
              <ProcessQueue
                stages={mode === "audio" ? STAGES : STAGES.slice(2)}
                working
                timings={ticks}
              />
            </div>
          )}
        </div>
        {(error || phase === "listening") && (
          <p
            aria-live="polite"
            className="text-center text-sm text-muted-foreground"
          >
            {error || t("bolo.listening")}
          </p>
        )}
        <div className="flex w-full items-center gap-2">
          {/* One element that morphs: lime circle → a bar holding the waveform → the circle inside the turning
              gradient while the message is worked on. */}
          <div
            className={cn(
              "relative isolate grid h-[54px] shrink-0 place-items-center rounded-[27px] transition-[width,flex-grow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              phase === "listening" ? "w-full flex-1" : "w-[54px]",
              phase === "working" ? "kf-ai-ring p-1" : "bg-lime text-black"
            )}
          >
            {phase === "working" ? (
              <div
                role="img"
                aria-label={t("bolo.working")}
                className="grid size-full place-items-center rounded-[inherit] bg-deep"
              >
                <MicIcon size={20} stroke={1.7} />
              </div>
            ) : phase === "listening" ? (
              <div className="flex size-full animate-in items-center gap-4 pr-1.5 pl-5 duration-300 fade-in-0">
                <Elapsed />
                <Waveform
                  levels={mic.levels}
                  className="h-7 min-w-0 flex-1 text-black"
                />
                <Tip label={t("bolo.stop")}>
                  <button
                    type="button"
                    aria-label={t("bolo.stop")}
                    onClick={mic.stop}
                    className="grid size-[42px] shrink-0 cursor-pointer place-items-center rounded-full bg-black transition-transform duration-150 active:scale-[0.92]"
                  >
                    <span className="size-3 rounded-[3px] bg-lime" />
                  </button>
                </Tip>
              </div>
            ) : (
              <Tip label={t("bolo.press")}>
                <button
                  type="button"
                  aria-label={t("bolo.press")}
                  onClick={mic.listen}
                  className="grid size-full cursor-pointer place-items-center rounded-[inherit] transition-transform duration-150 active:scale-[0.94]"
                >
                  <MicIcon size={22} stroke={1.7} />
                </button>
              </Tip>
            )}
          </div>
          {phase !== "listening" && (
            <div className="kf-ai-ring kf-ai-soft relative isolate min-w-0 flex-1 rounded-full p-[1.5px]">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const text = typed.trim()
                  if (!text || busy) return
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
                    disabled={!typed.trim() || busy}
                    className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-foreground text-background transition-opacity duration-150 disabled:cursor-default disabled:opacity-0"
                  >
                    <ArrowIcon size={16} />
                  </button>
                </Tip>
              </form>
            </div>
          )}
        </div>
        <CornerButton
          corner="tr"
          flip="main-tr"
          title={t(muted ? "bolo.unmute" : "bolo.mute")}
          onClick={toggleMute}
        >
          {muted ? <VolumeXIcon size={18} /> : <Volume2Icon size={18} />}
        </CornerButton>
      </div>

      <section
        ref={listRef}
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
          style={clearNotch(listBox, phone, 16, 130)}
        >
          <PanelTitle title={t("bolo.chatsTitle")} sub={t("bolo.chatsSub")} />
        </div>
        <div className="px-2 pb-2">
          <button
            type="button"
            onClick={() => openChat(null)}
            disabled={busy || (openId === null && thread.length === 0)}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-lime text-[15px] text-black transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:cursor-default disabled:opacity-50"
          >
            <PlusIcon size={16} />
            {t("bolo.newChat")}
          </button>
        </div>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {chats.isPending && <Loading />}
          {chats.isError && <LoadError onRetry={() => chats.refetch()} />}
          {chatDays.map(([day, rows]) => (
            <div key={day} className="flex flex-col gap-1 pb-2">
              <p className="px-3 pt-2 pb-1 text-xs text-muted-foreground">
                {dayLabel(day, t, locale)}
              </p>
              {rows.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openChat(c.id)}
                  disabled={busy}
                  aria-current={c.id === openId || undefined}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-3 rounded-[20px] px-3 py-2.5 text-left transition-colors duration-150 disabled:cursor-default",
                    c.id === openId
                      ? "bg-raised shadow-[inset_0_0_0_1.5px_rgb(185_255_102/45%)]"
                      : "hover:bg-raised/50"
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">
                      {c.title || t("bolo.newChat")}
                    </span>
                    {c.last_reply && (
                      <span className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">
                        {c.last_reply}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {clock(c.last_message_at)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {c.last_stage && (
                        <span
                          className="flex"
                          title={t(`bolo.stage.${c.last_stage}`)}
                        >
                          <Dot
                            color={STAGE_DOT[c.last_stage] ?? STAGE_DOT.FAILED}
                            size={7}
                          />
                          <span className="sr-only">
                            {t(`bolo.stage.${c.last_stage}`)}
                          </span>
                        </span>
                      )}
                      <span className="min-w-5 rounded-full bg-foreground/10 px-1.5 text-center text-[11px] leading-[18px] tabular-nums">
                        {c.message_count}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ))}
          {chats.data && chats.data.results.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              {t("bolo.chatsNone")}
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
          <Pager page={chatsPage} pages={chatPages} onPage={setChatsPage} />
        </Notch>
      </section>
    </div>
  )
}

/** The shopkeeper's words, on the right. */
function UserBubble({ text, meta }: { text: string; meta?: string }) {
  return (
    <div className="ml-auto flex max-w-[80%] animate-in flex-col items-end gap-1 duration-300 fade-in-0">
      <p className="rounded-[22px] rounded-br-[8px] bg-raised px-4 py-2.5 text-[16px] leading-snug text-pretty dark:bg-card">
        {text}
      </p>
      {meta && (
        <span className="px-1 text-[11px] text-muted-foreground">{meta}</span>
      )}
    </div>
  )
}

/** One exchange: the shopkeeper's message, then Khata's reply with its stage, and (when it is the open question)
 *  the answers as buttons. A tapped answer is sent as a message, like a typed one. */
function Message({
  m,
  open,
  when,
  onAnswer,
  onPlay,
}: {
  m: VoiceCommand
  open: boolean
  when: string
  onAnswer: (label: string) => void
  onPlay: () => void
}) {
  const { t } = useI18n()
  const asked = m.clarification as {
    kind: string
    options: { id: string; label: string }[]
    expires_at: string
  } | null
  const timings = (m.timings_ms ?? {}) as Record<string, number>
  const stages = STAGES.filter((s) => s.timings.some((k) => k in timings))
  return (
    <>
      <UserBubble
        text={m.transcript || "…"}
        meta={`${t(`src.${m.input_mode}`)} · ${when}`}
      />
      <div className="mr-auto flex w-full max-w-[560px] flex-col gap-3 rounded-[24px] rounded-bl-[8px] bg-paper p-5 text-black">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-[#434343]">
            <Branded text={t("bolo.replied")} paper />
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-black px-2.5 py-[5px] text-[11px] text-white">
            <Dot color={STAGE_DOT[m.stage] ?? STAGE_DOT.FAILED} size={8} />
            {t(`bolo.stage.${m.stage}`)}
          </span>
        </div>
        {m.response_text && (
          <p className="text-[18px] leading-[1.35] text-pretty">
            {m.response_text}
          </p>
        )}
        {open && m.stage === "NEEDS_CLARIFICATION" && asked && (
          <div className="flex flex-wrap items-center gap-2">
            {asked.options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onAnswer(o.label)}
                className="h-10 cursor-pointer rounded-full bg-black px-5 text-[14px] text-white transition-transform duration-150 active:scale-[0.97]"
              >
                {o.label}
              </button>
            ))}
            <Countdown until={asked.expires_at} />
            {asked.kind !== "choose" && (
              <span className="basis-full text-sm text-[#434343]">
                {t(
                  asked.kind === "confirm_create"
                    ? "bolo.changeHint"
                    : "bolo.answerHint"
                )}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-[#434343]">
          {m.response_audio_url && (
            <button
              type="button"
              onClick={onPlay}
              aria-label={t("bolo.replay")}
              className="grid size-8 cursor-pointer place-items-center rounded-full bg-black/10 transition-transform duration-150 active:scale-[0.94]"
            >
              <PlayIcon size={12} />
            </button>
          )}
          {stages.length > 0 && (
            <details className="group min-w-0 flex-1">
              <summary className="cursor-pointer list-none select-none">
                {t("bolo.pipeline")} · {total(m).toLocaleString("en-IN")} ms
              </summary>
              <div className="mt-2 text-foreground">
                <ProcessQueue
                  stages={stages}
                  working={false}
                  timings={timings}
                />
              </div>
            </details>
          )}
        </div>
      </div>
    </>
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
