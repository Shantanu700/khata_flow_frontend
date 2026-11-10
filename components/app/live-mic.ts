"use client"

import * as React from "react"

import { api } from "@/lib/api"

// Gnani's stream takes 16 kHz 16-bit mono PCM in 1,024-byte frames (512 samples) at real-time pace; the mic runs
// at 44.1 or 48 kHz, so each output sample averages the input samples it covers.
const WORKLET = `
class Pcm16k extends AudioWorkletProcessor {
  constructor() { super(); this.step = sampleRate / 16000; this.acc = 0; this.sum = 0; this.n = 0; this.at = 0; this.frame = new Int16Array(512) }
  process([input]) {
    const ch = input[0]
    if (!ch) return true
    for (let i = 0; i < ch.length; i++) {
      this.sum += ch[i]; this.n++; this.acc++
      if (this.acc < this.step) continue
      this.acc -= this.step
      const s = Math.max(-1, Math.min(1, this.sum / this.n))
      this.sum = 0; this.n = 0
      this.frame[this.at++] = s < 0 ? s * 0x8000 : s * 0x7fff
      if (this.at === 512) { this.port.postMessage(this.frame.buffer, [this.frame.buffer]); this.frame = new Int16Array(512); this.at = 0 }
    }
    return true
  }
}
registerProcessor("pcm-16k", Pcm16k)`

/** One loudness value (0–1) every LEVEL_MS, newest last, for the waveform. */
export type Levels = { values: number[]; at: number }
export const LEVEL_MS = 60
// Silence that ends a recording: after speech, and when nothing is said at all.
const QUIET_MS = 2500
const NOTHING_MS = 8000

type Session = { ctx: AudioContext; ws: WebSocket | null; timer: number }

/** The microphone while recording: loudness for the waveform (and `onQuiet` once the speaker pauses), and the live transcript phrase by phrase from
 *  Gnani's streaming speech-to-text (through the API's WebSocket bridge). Live text is a nicety: if the stream
 *  cannot open, recording carries on without it. */
export function useLiveMic() {
  const [phrases, setPhrases] = React.useState<string[]>([])
  const levels = React.useRef<Levels>({ values: [], at: 0 })
  const session = React.useRef<Session | null>(null)

  const start = React.useCallback(
    async (stream: MediaStream, language: string, onQuiet: () => void) => {
      setPhrases([])
      levels.current = { values: [], at: performance.now() }
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      const samples = new Float32Array(analyser.fftSize)
      // Speech is a level well above the room's running noise floor, so a noisy shop doesn't count as talking.
      const quiet = { since: performance.now(), heard: false, noise: 0.03 }
      const timer = window.setInterval(() => {
        analyser.getFloatTimeDomainData(samples)
        let sum = 0
        for (const s of samples) sum += s * s
        const values = levels.current.values
        const level = Math.min(1, Math.sqrt(sum / samples.length) * 5)
        values.push(level)
        if (values.length > 300) values.shift()
        const now = (levels.current.at = performance.now())
        if (level > Math.max(0.1, quiet.noise * 3)) {
          quiet.since = now
          quiet.heard = true
        } else quiet.noise = quiet.noise * 0.95 + level * 0.05
        if (now - quiet.since > (quiet.heard ? QUIET_MS : NOTHING_MS)) {
          quiet.since = Infinity
          onQuiet()
        }
      }, LEVEL_MS)
      const mine: Session = { ctx, ws: null, timer }
      session.current = mine
      try {
        const ticketing = api<{ ticket: string; url: string }>(
          "voice/stream-ticket",
          { method: "POST" }
        )
        await ctx.audioWorklet.addModule(
          URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }))
        )
        if (session.current !== mine) return
        // Frames captured while the ticket and socket are still on their way (about half a second): sent once
        // it opens, so the first words reach the live transcript too.
        const early: ArrayBuffer[] = []
        const pcm = new AudioWorkletNode(ctx, "pcm-16k")
        pcm.port.onmessage = (e) =>
          mine.ws?.readyState === WebSocket.OPEN
            ? mine.ws.send(e.data)
            : early.length < 150 && early.push(e.data)
        // Wired to the output through a muted gain so every browser keeps running it, without playing the mic back.
        const mute = ctx.createGain()
        mute.gain.value = 0
        source.connect(pcm).connect(mute).connect(ctx.destination)
        const { ticket, url } = await ticketing
        if (session.current !== mine) return
        const ws = new WebSocket(
          `${url}?ticket=${encodeURIComponent(ticket)}&language=${encodeURIComponent(language)}`
        )
        ws.onopen = () => early.splice(0).forEach((frame) => ws.send(frame))
        ws.onmessage = (e) => setPhrases((p) => [...p, JSON.parse(e.data).text])
        mine.ws = ws
      } catch {}
    },
    []
  )

  /** Ends the stream after Prisma finishes the phrase being spoken (at most 0.7 s), so it is closed before the
   *  recording is uploaded. */
  const stop = React.useCallback(async () => {
    const s = session.current
    session.current = null
    if (!s) return
    window.clearInterval(s.timer)
    const ws = s.ws
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send("commit")
      await new Promise<void>((done) => {
        const wait = window.setTimeout(done, 700)
        ws.addEventListener(
          "message",
          () => (window.clearTimeout(wait), done()),
          { once: true }
        )
      })
    }
    ws?.close()
    await s.ctx.close().catch(() => undefined)
  }, [])

  React.useEffect(() => () => void stop(), [stop])

  return { phrases, levels, start, stop }
}
