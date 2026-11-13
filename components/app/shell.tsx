"use client"

import * as React from "react"

import type { Screen } from "@/components/app/khata-data"
import type { useCommand } from "@/components/app/use-command"
import type { useRecorder } from "@/components/app/use-recorder"
import type { useReplyAudio } from "@/components/app/use-reply-audio"
import type { VoiceCommand } from "@/lib/api"

export type VoiceController = {
  command: ReturnType<typeof useCommand>
  mic: ReturnType<typeof useRecorder>
  replyAudio: ReturnType<typeof useReplyAudio>
  landed: VoiceCommand | null
  setLanded: React.Dispatch<React.SetStateAction<VoiceCommand | null>>
}

type Shell = {
  /** Switch screens with the morph. */
  go: (s: Screen) => void
  /** Do a write, refetch what it changed, then roll the figures that moved. Errors reach the caller. */
  run: <R>(write: () => Promise<R>) => Promise<R>
  /** Open the Khata screen on one customer. */
  openCustomer: (id: number) => void
  customerId: number | null
  setCustomerId: (id: number | null) => void
  /** Text typed in the header's box, waiting for Bolo to send it. */
  said: string | null
  setSaid: (text: string | null) => void
  /** The chat open on the Speak screen: null for a new one, undefined until the newest has been picked. */
  chatId: number | null | undefined
  setChatId: (id: number | null) => void
  /** Change the shop's language (screens and voice) and refetch its words. */
  setLanguage: (code: string) => Promise<void>
  /** The shared voice controller for the top bar and Bolo screen. */
  voice: VoiceController
}

export const ShellContext = React.createContext<Shell | null>(null)

export function useShell() {
  const shell = React.useContext(ShellContext)
  if (!shell) throw new Error("useShell outside the app shell")
  return shell
}
