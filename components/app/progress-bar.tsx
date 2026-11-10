"use client"

import { useIsFetching } from "@tanstack/react-query"

import { cn } from "@/lib/utils"

/** A thin lime line sliding along the top edge while anything loads or saves. It appears only after a short
 *  delay, so quick requests don't flicker it. */
export function ProgressBar({ saving }: { saving: boolean }) {
  const active = useIsFetching() > 0 || saving
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden transition-opacity",
        active ? "opacity-100 delay-200 duration-200" : "opacity-0 duration-500"
      )}
    >
      <div className="kf-progress h-full w-1/3 rounded-full bg-lime" />
    </div>
  )
}
