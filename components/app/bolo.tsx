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

import {
  SIZE,
  useChatMessages,
  useChats,
  useLanguages,
} from "@/components/app/data"
import { toast } from "sonner"
import { dayLabel, useI18n } from "@/components/app/i18n"
import { ArrowIcon, Branded, MicIcon, PlayIcon } from "@/components/app/icons"
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
import type { LanguageEnum } from "@/lib/client/types.gen"
import {
  apiProgress,
  postV1VoiceCommands,
  postV1VoiceCommandsCancel,
  postV1VoiceTextCommands,
  isoDay,
  type Progress,
  type VoiceCommand,
} from "@/lib/api"
import { cn } from "@/lib/utils"

/** The pipeline's stages as the chips show them, and the timings_ms keys each one adds up. */
const STAGES: { key: string; timings: string[] }[] = [
  { key: "bolo.stage.audio", timings: ["normalise"] },
  { key: "bolo.stage.heard", timings: ["stt"] },
  { key: "bolo.stage.understood", timings: ["intent"] },
  { key: "bolo.stage.ledger", timings: ["resolve", "commit"] },
  { key: "bolo.stage.reply", timings: ["tts"] },
]
const MUTE_KEY = "kf-replies-muted"
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
 *  and a cancel or answer can give the same message a new reply, so the URL changes with it. */
const audioUrl = (c: VoiceCommand) =>
  c.response_audio_url
    ? `/api/v1/voice/commands/${c.id}/audio/?v=${encodeURIComponent(c.updated_at)}`
    : null

const total = (c: VoiceCommand) =>
  Object.values((c.timings_ms ?? {}) as Record<string, number>).reduce(
    (a, ms) => a + ms,
    0
  )

export function BoloScreen() {
  const { t, code, locale } = useI18n()
  const { run, said, setSaid, chatId, setChatId, setLanguage } = useShell()
  const { phone, compact } = useLayout()
  const [chatsPage, setChatsPage] = React.useState(1)
  const chats = useChats(chatsPage)
  const chatPages = pagesOf(chats.data?.count, SIZE.table)
  const listRef = React.useRef<HTMLElement>(null)
  const listBox = useNotchBox(listRef)
  const openId = chatId ?? null
  const messages = useChatMessages(openId)
  const languages = useLanguages()
  const [phase, setPhase] = React.useState<Phase>("idle")
  // The newest reply, shown at once while the chat refetches.
  const [landed, setLanded] = React.useState<VoiceCommand | null>(null)
  // Stages the server has reported finished for the message in flight (timings_ms keys → ms).
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
  const scroller = React.useRef<HTMLDivElement>(null)
  // Muted: replies don't play by themselves (each still has its own play button). Remembered in this browser.
  const [muted, setMuted] = React.useState(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === "1"
    } catch {
      return false
    }
  })
  const mutedRef = React.useRef(muted)
  React.useEffect(() => {
    mutedRef.current = muted
  }, [muted])
  const toggleMute = () => {
    const next = !muted
    if (next) player.current?.pause()
    setMuted(next)
    try {
      localStorage.setItem(MUTE_KEY, next ? "1" : "0")
    } catch {}
  }
  const live = useLiveMic()
  // Sends read the open chat here, so the header's hand-off never sends into a chat closed meanwhile.
  const chatRef = React.useRef(openId)
  React.useEffect(() => {
    chatRef.current = openId
  }, [openId])
  const busy = phase === "working" || phase === "listening"

  // First visit: open the newest chat, or none, so the first message starts one.
  React.useEffect(() => {
    if (chatId === undefined && chats.data)
      setChatId(chats.data.results[0]?.id ?? null)
  }, [chatId, chats.data, setChatId])

  // The words came in a language other than the one on the screens: offer to switch, in the same one tap.
  React.useEffect(() => {
    const detected = landed?.detected_language
    if (!landed || !detected) return
    // Hinglish screens are Latin script, so Devanagari typed there is worth offering Hindi for; Prisma writes all
    // Hindi speech in Devanagari, so speech is not.
    const from =
      code === "hi-Latn" && landed.input_mode === "TEXT"
        ? code
        : code.split("-")[0]
    const to = detected.split("-")[0]
    if (from === to) return
    // Hindi and Marathi are both Devanagari: a script-based tag cannot always tell them apart.
    if ((from === "hi" || from === "mr") && (to === "hi" || to === "mr")) return
    // Hinglish is Hindi in Latin letters; English words inside it are not a language switch.
    if (code === "hi-Latn" && to === "en") return
    const match = languages.data?.find((l) => l.code === detected)
    const name = match?.native_name ?? match?.name ?? detected
    toast(t("bolo.languageMismatch", { language: name }), {
      id: "language-mismatch",
      description: t("bolo.languageMismatchBody", { language: name }),
      action: {
        label: t("bolo.languageMismatchAction"),
        onClick: () => {
          setLanguage(detected).catch(() => undefined)
        },
      },
      duration: 7000,
    })
    // Only a new message asks again; switching language must not re-open the toast for an old one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landed])

  const thread = React.useMemo(() => {
    const rows = new Map(
      (messages.data?.pages ?? [])
        .flatMap((p) => p.results)
        .map((m) => [m.id, m])
    )
    const known = landed && rows.get(landed.id)
    if (
      landed &&
      landed.chat === openId &&
      (!known || known.updated_at < landed.updated_at)
    )
      rows.set(landed.id, landed)
    return [...rows.values()].sort((a, b) => a.id - b.id)
  }, [messages.data, landed, openId])
  const lastId = thread.at(-1)?.id

  const play = (c: VoiceCommand) => {
    const url = audioUrl(c)
    if (!url) return
    player.current?.pause()
    player.current = new Audio(url)
    player.current.play().catch(() => undefined)
  }

  // Show a finished message in its chat, then play its reply.
  const land = React.useCallback(
    (c: VoiceCommand) => {
      setLanded(c)
      if (c.chat !== null) setChatId(c.chat)
      setPhase("done")
      const url = audioUrl(c)
      if (url && !mutedRef.current) {
        player.current?.pause()
        player.current = new Audio(url)
        player.current.play().catch(() => undefined)
      }
    },
    [setChatId]
  )

  const begin = React.useCallback((kind: Mode) => {
    const mine: Job = { abort: new AbortController() }
    job.current = mine
    setError("")
    setMode(kind)
    setTicks({})
    setPhase("working")
    return mine
  }, [])

  // The server reverses anything the message already wrote; only then stop reading its stream.
  const drop = React.useCallback(
    (mine: Job) =>
      run(() => postV1VoiceCommandsCancel({ path: { id: mine.id! } }))
        .catch(() => setError(t("error.generic")))
        .finally(() => mine.abort.abort()),
    [run, t]
  )

  // Through the shell: whatever the message wrote, every screen refetches and its figures roll.
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
      const chat = chatRef.current
      return send(begin("text"), (progress) =>
        apiProgress(
          (signal) =>
            postV1VoiceTextCommands({
              body: {
                text,
                language: code as LanguageEnum,
                ...(chat ? { chat } : {}),
              },
              query: { progress: true },
              parseAs: "stream",
              signal,
            }),
          progress
        )
      )
    },
    [begin, send, code]
  )

  // Text typed in the header's box arrives here, into the open chat.
  React.useEffect(() => {
    if (!said) return
    // After the effect, not inside it: sending sets this screen's state. Only the effect still standing sends,
    // or a remount (Strict Mode mounts twice) would send the message twice.
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

  // Follow the conversation: the newest message, and the words of the one in flight as they arrive.
  React.useEffect(() => {
    const box = scroller.current
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" })
  }, [lastId, phase, live.phrases.length, openId])

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
      const audio = new File(
        [blob],
        `command.${blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm"}`,
        { type: blob.type }
      )
      const chat = chatRef.current
      send(mine, (progress) =>
        apiProgress(
          (signal) =>
            postV1VoiceCommands({
              body: {
                audio,
                language: code as LanguageEnum,
                ...(chat ? { chat } : {}),
              },
              query: { progress: true },
              parseAs: "stream",
              signal,
            }),
          progress
        )
      )
    }
    const finish = () => rec.state === "recording" && rec.stop()
    recorder.current = rec
    rec.start()
    setPhase("listening")
    void live.start(stream, code, finish)
    stopTimer.current = window.setTimeout(finish, MAX_SECONDS * 1000)
  }

  const openChat = (id: number | null) => {
    if (busy) return
    player.current?.pause()
    setChatId(id)
    setLanded(null)
    setPhase("idle")
    setError("")
  }

  const openTitle = chats.data?.results.find((c) => c.id === openId)?.title
  const inFlight =
    phase === "working"
      ? mode === "text"
        ? sentText
        : live.phrases.join(" ") || "…"
      : phase === "listening"
        ? live.phrases.join(" ")
        : ""
  const clock = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
    })
  // The chat list under Today, Yesterday and dated headings, newest first as it comes.
  const chatDays = Object.entries(
    Object.groupBy(chats.data?.results ?? [], (c) =>
      isoDay(new Date(c.last_message_at))
    )
  ).map(([day, rows]) => [day, rows ?? []] as const)
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
                  levels={live.levels}
                  className="h-7 min-w-0 flex-1 text-black"
                />
                <Tip label={t("bolo.stop")}>
                  <button
                    type="button"
                    aria-label={t("bolo.stop")}
                    onClick={() =>
                      recorder.current?.state === "recording" &&
                      recorder.current.stop()
                    }
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
                  onClick={listen}
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
