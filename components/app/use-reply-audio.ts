"use client"

import * as React from "react"

import type { VoiceCommand } from "@/lib/api"

const MUTE_KEY = "kf-replies-muted"

/** The reply's audio through the app's proxy (the API serves it only to the signed-in owner). The audio is cached,
 *  and a cancel or answer can give the same message a new reply, so the URL changes with it. */
const audioUrl = (c: VoiceCommand) =>
  c.response_audio_url
    ? `/api/v1/voice/commands/${c.id}/audio/?v=${encodeURIComponent(c.updated_at)}`
    : null

/** Playing replies, and the mute switch. Muted: replies don't play by themselves (each still has its own play
 *  button). Remembered in this browser. */
export function useReplyAudio() {
  const player = React.useRef<HTMLAudioElement | null>(null)
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
  React.useEffect(() => () => player.current?.pause(), [])

  const play = React.useCallback((c: VoiceCommand) => {
    const url = audioUrl(c)
    if (!url) return
    player.current?.pause()
    player.current = new Audio(url)
    player.current.play().catch(() => undefined)
  }, [])

  /** A reply that just arrived: played unless muted. */
  const autoplay = React.useCallback(
    (c: VoiceCommand) => {
      if (!mutedRef.current) play(c)
    },
    [play]
  )

  const stop = React.useCallback(() => player.current?.pause(), [])

  const toggleMute = () => {
    const next = !muted
    if (next) player.current?.pause()
    setMuted(next)
    try {
      localStorage.setItem(MUTE_KEY, next ? "1" : "0")
    } catch {}
  }

  return { muted, toggleMute, play, autoplay, stop }
}
