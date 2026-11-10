"use client"

import * as React from "react"
import { Popover } from "radix-ui"

import { useLanguages } from "@/components/app/data"
import { useI18n } from "@/components/app/i18n"
import { GlobeIcon } from "@/components/app/icons"
import { Tip } from "@/components/app/parts"
import { cn } from "@/lib/utils"

/** The globe button and its list of languages, each in its own script. */
export function LanguagePicker({
  value,
  onChange,
  compact,
  className,
}: {
  value: string
  onChange: (code: string) => void
  compact: boolean
  className?: string
}) {
  const { t } = useI18n()
  const languages = useLanguages()
  const [open, setOpen] = React.useState(false)
  const current = languages.data?.find((l) => l.code === value)
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tip label={compact ? t("header.language") : undefined}>
        <Popover.Trigger
          aria-label={`${t("header.language")}: ${current?.native_name ?? value}`}
          className={cn(
            "flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full bg-card text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
            compact ? "w-[52px]" : "px-[18px]",
            className
          )}
        >
          <GlobeIcon />
          {!compact && (current?.native_name ?? value)}
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          collisionPadding={12}
          className="kf-app z-50 grid w-[min(320px,calc(100vw-24px))] grid-cols-2 gap-1 rounded-[28px] bg-card p-2 text-foreground shadow-[0_24px_60px_rgb(0_0_0/0.45)] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {languages.data?.map((l) => (
            <button
              key={l.code}
              type="button"
              lang={l.code === "hi-Latn" ? "en-IN" : l.code}
              aria-pressed={l.code === value}
              onClick={() => (setOpen(false), onChange(l.code))}
              className={cn(
                "flex h-12 cursor-pointer flex-col items-start justify-center rounded-[20px] px-4 text-left transition-colors duration-150",
                l.code === value ? "bg-lime text-black" : "hover:bg-raised"
              )}
            >
              <span className="text-sm leading-tight">{l.native_name}</span>
              <span
                className={cn(
                  "text-[11px] leading-tight",
                  l.code === value ? "text-black/60" : "text-muted-foreground"
                )}
              >
                {l.name}
              </span>
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
