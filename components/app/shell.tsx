"use client"

import * as React from "react"

import type { Screen } from "@/components/app/khata-data"

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
}

export const ShellContext = React.createContext<Shell | null>(null)

export function useShell() {
  const shell = React.useContext(ShellContext)
  if (!shell) throw new Error("useShell outside the app shell")
  return shell
}
