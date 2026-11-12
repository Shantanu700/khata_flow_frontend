"use client"

import * as React from "react"

import { useI18n } from "@/components/app/i18n"
import { useLiveMic } from "@/components/app/live-mic"
import type { useCommand } from "@/components/app/use-command"

// Gnani accepts up to 20 seconds; stop a little before.
const MAX_SECONDS = 19

const recordingType = () =>
  [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ].find((t) => MediaRecorder.isTypeSupported(t)) ?? ""

/** Recording a spoken command: the microphone, its live transcript and the time limit. The recording goes to
 *  `command` when it stops. */
export function useRecorder(command: ReturnType<typeof useCommand>) {
  const { t, code } = useI18n()
  const live = useLiveMic()
  const recorder = React.useRef<MediaRecorder | null>(null)
  const stopTimer = React.useRef<number | undefined>(undefined)

  React.useEffect(
    () => () => {
      window.clearTimeout(stopTimer.current)
      recorder.current?.stream.getTracks().forEach((track) => track.stop())
    },
    []
  )

  const listen = async () => {
    if (command.phase === "listening") return recorder.current?.stop()
    if (command.phase === "working") return
    command.showError("")
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return command.showError(t("bolo.noMic"))
    }
    const type = recordingType()
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = async () => {
      window.clearTimeout(stopTimer.current)
      const mine = command.begin("audio")
      await live.stop()
      stream.getTracks().forEach((track) => track.stop())
      if (mine.cancelled) return
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" })
      const audio = new File(
        [blob],
        `command.${blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm"}`,
        { type: blob.type }
      )
      command.sendAudio(mine, audio)
    }
    const finish = () => rec.state === "recording" && rec.stop()
    recorder.current = rec
    rec.start()
    command.listening()
    void live.start(stream, code, finish)
    stopTimer.current = window.setTimeout(finish, MAX_SECONDS * 1000)
  }

  const stop = () =>
    recorder.current?.state === "recording" && recorder.current.stop()

  return { listen, stop, phrases: live.phrases, levels: live.levels }
}
