"use client"

import * as React from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

// The app's theme lives on <html class="dark"> (components/app/theme.ts), not in next-themes.
const watchTheme = (changed: () => void) => {
  const watcher = new MutationObserver(changed)
  watcher.observe(document.documentElement, { attributeFilter: ["class"] })
  return () => watcher.disconnect()
}
const darkNow = () => document.documentElement.classList.contains("dark")
// The phone frame (components/app/layout.ts): its bottom holds the tab bar and the composer, so toasts go on top.
const PHONE = "(max-width: 599px), (max-height: 479px)"
const watchPhone = (changed: () => void) => {
  const query = window.matchMedia(PHONE)
  query.addEventListener("change", changed)
  return () => query.removeEventListener("change", changed)
}
const phoneNow = () => window.matchMedia(PHONE).matches

const Toaster = ({ ...props }: ToasterProps) => {
  const dark = React.useSyncExternalStore(watchTheme, darkNow, () => true)
  const phone = React.useSyncExternalStore(watchPhone, phoneNow, () => false)

  return (
    <Sonner
      theme={dark ? "dark" : "light"}
      position={phone ? "top-center" : "bottom-right"}
      richColors
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--line)",
          "--border-radius": "28px",
        } as React.CSSProperties
      }
      toastOptions={{
        // Matches the app's popovers (language, dates): card surface, 28px corners, lime pill for the action.
        classNames: {
          toast:
            "cn-toast kf-app gap-3! p-4! pl-5! font-sans! shadow-[0_24px_60px_rgb(0_0_0/0.35)]!",
          title: "text-sm! font-medium!",
          description: "text-[13px]! leading-snug! text-muted-foreground!",
          actionButton:
            "h-10! shrink-0! rounded-full! bg-lime! px-4! text-sm! font-medium! text-black!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
