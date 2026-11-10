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

const Toaster = ({ ...props }: ToasterProps) => {
  const dark = React.useSyncExternalStore(watchTheme, darkNow, () => true)

  return (
    <Sonner
      theme={dark ? "dark" : "light"}
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
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
