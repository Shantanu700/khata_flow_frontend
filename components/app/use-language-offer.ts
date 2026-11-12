"use client"

import * as React from "react"
import { toast } from "sonner"

import { useLanguages } from "@/components/app/data"
import { useI18n } from "@/components/app/i18n"
import { useShell } from "@/components/app/shell"
import type { VoiceCommand } from "@/lib/api"

/** The words came in a language other than the one on the screens: offer to switch, in the same one tap. */
export function useLanguageOffer(landed: VoiceCommand | null) {
  const { t, code } = useI18n()
  const { setLanguage } = useShell()
  const languages = useLanguages()

  React.useEffect(() => {
    const detected = landed?.detected_language
    if (!landed || !detected) return
    // Hinglish screens are Latin script, so Devanagari typed there is worth offering Hindi for; Prisma writes all
    // Hindi speech in Devanagari, so speech is not.
    const from =
      code === "hi-Latn" && landed.input_mode === "TEXT"
        ? code
        : code.split("-")[0]
    const to = detected.split("-")[0]
    if (from === to) return
    // Hindi and Marathi are both Devanagari: a script-based tag cannot always tell them apart.
    if ((from === "hi" || from === "mr") && (to === "hi" || to === "mr")) return
    // Hinglish is Hindi in Latin letters; English words inside it are not a language switch.
    if (code === "hi-Latn" && to === "en") return
    const match = languages.data?.find((l) => l.code === detected)
    const name = match?.native_name ?? match?.name ?? detected
    toast(t("bolo.languageMismatch", { language: name }), {
      id: "language-mismatch",
      description: t("bolo.languageMismatchBody", { language: name }),
      action: {
        label: t("bolo.languageMismatchAction"),
        onClick: () => {
          setLanguage(detected).catch(() => undefined)
        },
      },
      duration: 7000,
    })
    // Only a new message asks again; switching language must not re-open the toast for an old one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landed])
}
