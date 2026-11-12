"use client"

import * as React from "react"

import { useI18n } from "@/components/app/i18n"
import { useShell } from "@/components/app/shell"
import {
  apiProgress,
  postV1VoiceCommands,
  postV1VoiceCommandsCancel,
  postV1VoiceTextCommands,
  type Progress,
  type VoiceCommand,
} from "@/lib/api"
import type { LanguageEnum } from "@/lib/client/types.gen"

export type Phase = "idle" | "listening" | "working" | "done"
export type Mode = "audio" | "text"
/** The command in flight; `id` arrives as the stream's first line, and a cancel waits for it. */
export type Job = { abort: AbortController; id?: number; cancelled?: boolean }

/** One command at a time, typed or recorded: sending it with live progress, the stages done so far, and cancelling
 *  it. `chat` reads the chat to send into at the moment of sending; `onDone` gets the finished message. */
export function useCommand({
  chat,
  onDone,
}: {
  chat: () => number | null
  onDone: (c: VoiceCommand) => void
}) {
  const { t, code } = useI18n()
  const { run, said, setSaid } = useShell()
  const [phase, setPhase] = React.useState<Phase>("idle")
  // Stages the server has reported finished for the message in flight (timings_ms keys → ms).
  const [ticks, setTicks] = React.useState<Record<string, number>>({})
  const [mode, setMode] = React.useState<Mode>("audio")
  const [error, setError] = React.useState("")
  // What was typed (or the answer tapped), shown while it is worked on; a recording shows its live transcript.
  const [sentText, setSentText] = React.useState("")
  const job = React.useRef<Job | null>(null)
  const busy = phase === "working" || phase === "listening"

  const land = React.useCallback(
    (c: VoiceCommand) => {
      onDone(c)
      setPhase("done")
    },
    [onDone]
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
      const into = chat()
      return send(begin("text"), (progress) =>
        apiProgress(
          (signal) =>
            postV1VoiceTextCommands({
              body: {
                text,
                language: code as LanguageEnum,
                ...(into ? { chat: into } : {}),
              },
              query: { progress: true },
              parseAs: "stream",
              signal,
            }),
          progress
        )
      )
    },
    [begin, send, code, chat]
  )

  /** A recording, under the job `begin("audio")` started when the recording stopped. */
  const sendAudio = (mine: Job, audio: File) => {
    const into = chat()
    send(mine, (progress) =>
      apiProgress(
        (signal) =>
          postV1VoiceCommands({
            body: {
              audio,
              language: code as LanguageEnum,
              ...(into ? { chat: into } : {}),
            },
            query: { progress: true },
            parseAs: "stream",
            signal,
          }),
        progress
      )
    )
  }

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

  return {
    phase,
    mode,
    ticks,
    error,
    sentText,
    busy,
    begin,
    sendText,
    sendAudio,
    cancel,
    /** The microphone is open. */
    listening: () => setPhase("listening"),
    /** A line under the composer; "" clears it. */
    showError: setError,
    /** Back to rest, as when another chat opens. */
    reset: () => {
      setPhase("idle")
      setError("")
    },
  }
}
