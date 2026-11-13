"use client"

import * as React from "react"

import { SIZE, useChatMessages, useChats } from "@/components/app/data"
import { pagesOf } from "@/components/app/ledger"
import { useShell } from "@/components/app/shell"
import { isoDay, type VoiceCommand } from "@/lib/api"

/** The chat list and the open chat's thread, with a just-finished message shown at once while the chat refetches. */
export function useChatThread() {
  const { chatId, setChatId, voice } = useShell()
  const [page, setPage] = React.useState(1)
  const chats = useChats(page)
  const pages = pagesOf(chats.data?.count, SIZE.table)
  const openId = chatId ?? null
  const messages = useChatMessages(openId)
  const landed = voice?.landed ?? null
  const setLanded = voice?.setLanded
  // Sends read the open chat here, so the header's hand-off never sends into a chat closed meanwhile.
  const chatRef = React.useRef(openId)
  React.useEffect(() => {
    chatRef.current = openId
  }, [openId])

  // First visit: open the newest chat, or none, so the first message starts one.
  React.useEffect(() => {
    if (chatId === undefined && chats.data)
      setChatId(chats.data.results[0]?.id ?? null)
  }, [chatId, chats.data, setChatId])

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

  const current = React.useCallback(() => chatRef.current, [])

  const show = React.useCallback(
    (c: VoiceCommand) => {
      setLanded?.(c)
      if (c.chat !== null) setChatId(c.chat)
    },
    [setChatId, setLanded]
  )

  /** Open a chat, or none (null) so the next message starts one. */
  const open = (id: number | null) => {
    setChatId(id)
    setLanded?.(null)
  }

  // The chat list under Today, Yesterday and dated headings, newest first as it comes.
  const days = Object.entries(
    Object.groupBy(chats.data?.results ?? [], (c) =>
      isoDay(new Date(c.last_message_at))
    )
  ).map(([day, rows]) => [day, rows ?? []] as const)

  return {
    chats,
    days,
    page,
    pages,
    setPage,
    openId,
    title: chats.data?.results.find((c) => c.id === openId)?.title,
    messages,
    thread,
    lastId: thread.at(-1)?.id,
    landed,
    current,
    show,
    open,
  }
}
