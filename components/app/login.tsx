"use client"

import * as React from "react"
import Image, { type StaticImageData } from "next/image"

import { useI18n } from "@/components/app/i18n"
import { EyeIcon, EyeOffIcon, LogoMark, MicIcon, MoonIcon, SunIcon } from "@/components/app/icons"
import { LanguagePicker } from "@/components/app/language-picker"
import { Dot } from "@/components/app/parts"
import { useTheme } from "@/components/app/theme"
import { Notch, notchRadius } from "@/components/notch"
import type { Me } from "@/lib/api"
import { cn } from "@/lib/utils"
import shopkeeper from "@/public/images/auth-shopkeeper.jpg"

const PHOTO: StaticImageData | null = shopkeeper

type Mode = "login" | "register"
const MODES: Mode[] = ["login", "register"]

// Lead Flow's /auth entrance: each block rises in, a little after the one above it.
const RISE = "animate-in duration-500 fill-mode-both fade-in-0 slide-in-from-bottom-4 motion-reduce:animate-none"

const FIELD =
  "h-14 w-full rounded-full bg-raised px-[22px] text-base outline-none focus-visible:ring-2 focus-visible:ring-ring autofill:shadow-[inset_0_0_0_1000px_var(--raised)] autofill:[-webkit-text-fill-color:var(--foreground)]"

/** Both modes' text share one grid cell, so a switch crossfades in place (4px rise, 200ms) without the
 *  width jumping. The hidden copy is inert. */
function Crossfade({ mode, render, className }: { mode: Mode; render: (m: Mode) => React.ReactNode; className?: string }) {
  return (
    <span className={cn("grid", className)}>
      {MODES.map((m) => (
        <span
          key={m}
          inert={m !== mode}
          className={cn(
            "transition-[opacity,transform] duration-200 ease-out [grid-area:1/1] motion-reduce:transform-none",
            m === mode ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
          )}
        >
          {render(m)}
        </span>
      ))}
    </span>
  )
}

/** Register-only fields grow in and out (grid rows, 400ms on the drawer curve). Collapsed content is
 *  inert and its inputs disabled, so it skips validation. */
function Reveal({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-400 ease-drawer motion-reduce:transition-opacity",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
    >
      {/* overflow-clip with a margin keeps the focus ring visible */}
      <div className="min-h-0 overflow-clip [overflow-clip-margin:4px]">{children}</div>
    </div>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 pb-[18px]">
      <label htmlFor={id} className="text-[13px] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function PasswordInput({
  id,
  autoComplete,
  invalid,
  disabled,
  minLength,
}: {
  id: string
  autoComplete: string
  invalid?: boolean
  disabled?: boolean
  minLength?: number
}) {
  const { t } = useI18n()
  const [visible, setVisible] = React.useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        name={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(FIELD, "pr-14", invalid && "ring-2 ring-[var(--red-ink)]")}
      />
      {/* Open eye: hidden, can be shown. Closed eye: shown, can be hidden. Swaps instantly. */}
      <button
        type="button"
        aria-pressed={visible}
        aria-label={visible ? t("auth.hide") : t("auth.show")}
        title={visible ? t("auth.hide") : t("auth.show")}
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      </button>
    </div>
  )
}

export function LoginScreen({ onSignedIn, onLanguage }: { onSignedIn: (session: Me) => void; onLanguage: (code: string) => void }) {
  const { t, code } = useI18n()
  const [theme, toggleTheme] = useTheme()
  const [mode, setMode] = React.useState<Mode>("login")
  const [error, setError] = React.useState("")
  const [mismatch, setMismatch] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const register = mode === "register"

  const switchMode = (next: Mode) => {
    setError("")
    setMismatch(false)
    setMode(next)
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const password = String(form.get("password") ?? "")
    if (register && password !== String(form.get("confirm") ?? "")) {
      setMismatch(true)
      return setError(t("auth.mismatch"))
    }
    setMismatch(false)
    setBusy(true)
    setError("")
    const body = register
      ? { shop_name: form.get("shop"), username: form.get("username"), password, preferred_language: code }
      : { username: form.get("username"), password }
    try {
      const res = await fetch(register ? "/api/session?register" : "/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        const details = result?.error?.details ?? {}
        return setError(
          res.status === 429
            ? t("login.tooMany")
            : result?.error?.code === "AUTHENTICATION_FAILED"
              ? t("login.wrong")
              : details.username
                ? t("auth.taken")
                : details.password
                  ? t("auth.weak")
                  : details.shop_name
                    ? t("auth.shopMissing")
                    : t("error.generic")
        )
      }
      onSignedIn(result as Me)
    } catch {
      setError(t("error.offline"))
    } finally {
      setBusy(false)
    }
  }

  // Two of each: in the top row below lg, and in the picture panel's notch at lg. The notch ones are 64px:
  // the panel's 32px rounding clips anything smaller sitting in its corner.
  const controls = (big: boolean) => (
    <>
      <LanguagePicker value={code} onChange={onLanguage} compact className={big ? "size-16 bg-raised" : "bg-raised"} />
      <button
        type="button"
        title={theme === "dark" ? t("header.light") : t("header.dark")}
        aria-label={theme === "dark" ? t("header.light") : t("header.dark")}
        onClick={toggleTheme}
        className={cn("grid cursor-pointer place-items-center rounded-full bg-raised", big ? "size-16" : "size-[52px]")}
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
    </>
  )

  return (
    <main className="kf-app flex min-h-dvh items-center justify-center bg-background p-[10px] sm:p-7">
      <div className="grid w-full max-w-[1200px] grid-cols-1 gap-[10px] rounded-[44px] bg-card p-[10px] lg:grid-cols-2">
        <section className="flex min-w-0 flex-col justify-center gap-8 px-5 py-7 sm:px-12 sm:py-11">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex basis-full items-center justify-between gap-3">
              <span className="flex items-center gap-[10px]">
                <LogoMark />
                <span className="text-lg font-medium tracking-[-0.025em]">KhaataFlow</span>
              </span>
              <span className="flex items-center gap-[10px] lg:hidden">{controls(false)}</span>
            </div>
            <div
              role="group"
              aria-label={t("auth.modeLabel")}
              className="relative grid w-fit grid-cols-2 rounded-full bg-background p-[5px] has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => switchMode(m)}
                  className="h-11 cursor-pointer rounded-full px-[22px] text-[15px] font-medium text-muted-foreground outline-none"
                >
                  {t(m === "login" ? "auth.tabLogin" : "auth.tabRegister")}
                </button>
              ))}
              {/* The active state is a styled copy of the labels clipped to the active half: the clip slides,
                  so the fill and the text colour change in one motion (Lead Flow's /auth toggle). */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-[5px] grid grid-cols-2 rounded-full bg-lime text-[15px] font-medium text-black transition-[clip-path] duration-250 ease-in-out motion-reduce:transition-none"
                style={{ clipPath: register ? "inset(0 0 0 50% round 9999px)" : "inset(0 50% 0 0 round 9999px)" }}
              >
                <span className="flex items-center justify-center px-[22px]">{t("auth.tabLogin")}</span>
                <span className="flex items-center justify-center px-[22px]">{t("auth.tabRegister")}</span>
              </div>
            </div>
          </div>

          <h1 className={`text-[34px] leading-[1.2] font-light tracking-[-0.01em] ${RISE} delay-75`}>
            <Crossfade
              mode={mode}
              render={(m) => (
                <>
                  {t(`auth.${m}Title`)}
                  <span className="block text-muted-foreground">{t(`auth.${m}Sub`)}</span>
                </>
              )}
            />
          </h1>

          <form onSubmit={submit} className={`flex flex-col ${RISE} delay-150`}>
            <Reveal open={register}>
              <Field id="shop" label={t("auth.shopName")}>
                <input
                  id="shop"
                  name="shop"
                  autoComplete="organization"
                  required
                  maxLength={200}
                  disabled={!register}
                  placeholder={t("auth.shopPlaceholder")}
                  className={cn(FIELD, "placeholder:text-muted-foreground")}
                />
              </Field>
            </Reveal>
            <Field id="username" label={t("login.username")}>
              <input id="username" name="username" required autoComplete="username" autoCapitalize="none" maxLength={150} className={FIELD} />
            </Field>
            <Field id="password" label={t("login.password")}>
              <PasswordInput
                id="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? 8 : undefined}
                invalid={mismatch}
              />
            </Field>
            <Reveal open={register}>
              <Field id="confirm" label={t("auth.confirm")}>
                <PasswordInput id="confirm" autoComplete="new-password" minLength={8} invalid={mismatch} disabled={!register} />
              </Field>
            </Reveal>
            {error && (
              <p role="alert" className="mb-3 rounded-[20px] bg-danger-soft/15 px-5 py-3 text-sm text-[var(--red-ink)]">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="mt-2 h-14 w-full cursor-pointer rounded-full bg-lime text-base font-medium text-black transition-[background-color,transform] duration-150 hover:bg-lime/85 active:scale-[0.98] disabled:cursor-default disabled:opacity-60"
            >
              {busy ? t(register ? "auth.registerBusy" : "login.busy") : <Crossfade mode={mode} render={(m) => t(`auth.${m}Submit`)} />}
            </button>
          </form>

          <p className={`pt-2 text-[15px] text-muted-foreground ${RISE} delay-200`}>
            <Crossfade
              mode={mode}
              className="justify-items-center"
              render={(m) => (
                <span className="flex flex-wrap justify-center gap-x-2.5 gap-y-1">
                  {t(`auth.${m}SwitchPrompt`)}
                  <button
                    type="button"
                    onClick={() => switchMode(m === "register" ? "login" : "register")}
                    className="cursor-pointer font-medium text-foreground transition-colors hover:text-lime-ink"
                  >
                    {t(`auth.${m}SwitchAction`)}
                  </button>
                </span>
              )}
            />
          </p>
        </section>

        {/* Picture panel: the photo (when supplied) with KhaataFlow's own cards over it, and the theme toggle
            in the cut-out corner. */}
        <section className="relative hidden min-h-[640px] overflow-hidden rounded-[32px] bg-deep [--photo-edge:color-mix(in_oklch,var(--lime)_55%,var(--card))] lg:block">
          {PHOTO && <Image src={PHOTO} alt="" fill priority placeholder="blur" sizes="(min-width: 1024px) 55vw, 0px" className="object-cover object-[44%_center]" />}
          <ExampleCards />
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-(--photo-edge) ring-inset" />
          <Notch corner="tr" edge="var(--photo-edge)" r={notchRadius(64)} gap={10} bg="var(--card)" className="z-10 flex items-center gap-[10px]">
            {controls(true)}
          </Notch>
        </section>
      </div>
    </main>
  )
}

// Illustrative only: example figures showing what KhaataFlow looks like inside.
const WEEK = [
  [40, 25],
  [10, 55],
  [65, 20],
  [30, 45],
  [80, 35],
  [20, 70],
  [55, 50],
] as const

function ExampleCards() {
  const { t } = useI18n()
  return (
    <div role="img" aria-label={t("auth.exampleLabel")}>
      <div className={`absolute right-6 bottom-[112px] flex w-[300px] max-w-[calc(100%-48px)] flex-col gap-3 rounded-[24px] bg-card/80 p-4 backdrop-blur-xl ${RISE} delay-500`}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-medium">{t("auth.cardTitle")}</span>
          <span className="text-xs text-muted-foreground">{t("auth.example")}</span>
        </div>
        <div className="flex gap-2">
          <span className="flex-1 rounded-[16px] bg-raised px-3 py-2">
            <span className="block text-xl font-light">₹1,250</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Dot color="var(--chart-udhaar)" size={7} />
              {t("kind.CREDIT_GIVEN")}
            </span>
          </span>
          <span className="flex-1 rounded-[16px] bg-raised px-3 py-2">
            <span className="block text-xl font-light">₹800</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Dot color="var(--chart-vasooli)" size={7} />
              {t("kind.PAYMENT_RECEIVED")}
            </span>
          </span>
        </div>
        <div className="flex h-12 items-end gap-1.5 px-1">
          {WEEK.map(([u, v], i) => (
            <span key={i} className="flex h-full flex-1 items-end justify-center gap-0.5">
              <span className="w-1.5 rounded-t-full rounded-b-[2px] bg-[var(--chart-udhaar)]" style={{ height: `${u}%` }} />
              <span className="w-1.5 rounded-t-full rounded-b-[2px] bg-[var(--chart-vasooli)]" style={{ height: `${v}%` }} />
            </span>
          ))}
        </div>
      </div>

      <div className={`absolute top-6 right-[176px] left-6 flex max-w-[420px] flex-col gap-2 ${RISE} delay-300`}>
        <div className="flex items-center gap-2.5 self-start rounded-[20px] bg-raised px-4 py-3 text-[15px]">
          <MicIcon size={16} />“{t("login.exampleSaid")}”
        </div>
        <div className="self-end rounded-[20px] bg-paper px-4 py-3 text-[15px] text-black">{t("login.exampleReply")}</div>
      </div>

      <Notch corner="bl" edge="var(--photo-edge)" r={notchRadius(76)} gap={10} bg="var(--card)" className="z-10 max-w-[calc(100%-60px)]">
        <div className={`flex items-center gap-6 rounded-[28px] bg-background py-4 pr-4 pl-[22px] ${RISE} delay-700`}>
          <span className="flex min-w-0 flex-col gap-0.5 whitespace-nowrap">
            <span className="text-base font-medium">{t("auth.notchTitle")}</span>
            <span className="text-[13px] text-muted-foreground">{t("auth.notchSub")}</span>
          </span>
          <span className="flex flex-none">
            {["S", "V", "G"].map((initial, i) => (
              <span
                key={initial}
                className="relative -ml-2 grid size-11 place-items-center rounded-full bg-card text-[13px] font-medium shadow-[0_0_0_3px_var(--background)] first:ml-0"
              >
                {initial}
                <span
                  className="absolute right-0 bottom-0 size-2.5 rounded-full shadow-[0_0_0_2px_var(--background)]"
                  style={{ background: i === 1 ? "var(--chart-udhaar)" : "var(--chart-vasooli)" }}
                />
              </span>
            ))}
          </span>
        </div>
      </Notch>
    </div>
  )
}
