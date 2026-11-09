"use client"

import * as React from "react"

import { LogoMark, MicIcon } from "@/components/app/icons"
import { Notch, notchRadius } from "@/components/notch"

export function LoginScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="kf-app grid min-h-dvh grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)] gap-[10px] p-[10px] max-lg:grid-cols-1">
      <div className="relative flex min-h-[560px] flex-col justify-between rounded-[32px] bg-card p-10 max-sm:p-7">
        <div className="flex items-center gap-[10px]">
          <LogoMark />
          <span className="text-lg font-medium tracking-[-0.025em]">KhaataFlow</span>
        </div>
        <div className="flex max-w-[620px] flex-col gap-5">
          <h1 className="text-[64px] leading-none font-light tracking-[-0.03em] text-pretty max-sm:text-5xl">Dukaan ka khata, ab awaaz se.</h1>
          <p className="max-w-[480px] text-lg leading-normal text-muted-foreground">
            Udhaar, stock aur staff ka hisaab bolke likhiye. KhaataFlow sunta hai, likhta hai, aur jawab deta hai.
          </p>
        </div>
        <div className="flex max-w-[440px] flex-col gap-2">
          <div className="self-start rounded-[20px] bg-raised px-4 py-3 text-[15px]">“Sharma ji ka paanch sau udhaar likh do”</div>
          <div className="self-end rounded-[20px] bg-paper px-4 py-3 text-[15px] text-black">Theek hai. Sharma ji ka ₹500 udhaar likh diya.</div>
        </div>
        <Notch corner="br" r={notchRadius(52)} gap={10} className="flex">
          <span className="grid size-[52px] place-items-center rounded-full bg-card">
            <MicIcon size={22} />
          </span>
        </Notch>
      </div>

      <form
        className="flex flex-col justify-center gap-6 rounded-[32px] bg-card p-10 max-sm:p-7"
        onSubmit={(e) => {
          e.preventDefault()
          onEnter()
        }}
      >
        <div>
          <h2 className="text-[32px] font-normal">Andar aaiye</h2>
          <p className="mt-1 text-sm text-muted-foreground">Apni dukaan ke account se</p>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">Username</span>
          <input name="username" defaultValue="gupta_store" autoComplete="username" className="h-[52px] rounded-full bg-raised px-5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">Password</span>
          <input name="password" type="password" defaultValue="password" autoComplete="current-password" className="h-[52px] rounded-full bg-raised px-5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <button type="submit" className="h-14 cursor-pointer rounded-full bg-lime text-base font-medium text-black transition-transform duration-150 hover:scale-[1.02]">
          Andar aaiye
        </button>
        <p className="text-[13px] text-muted-foreground">Ek dukaan, ek maalik. Demo: gupta_store ya patel_store.</p>
      </form>
    </div>
  )
}
