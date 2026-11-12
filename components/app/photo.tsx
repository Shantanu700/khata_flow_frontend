"use client"

import * as React from "react"
import { Dialog } from "radix-ui"
import { toast } from "sonner"

import { errorText, useI18n } from "@/components/app/i18n"
import { initial } from "@/components/app/khata-data"
import { FormActions, FormError } from "@/components/app/ledger"
import {
  data,
  deleteV1MePhoto,
  deleteV1PartiesPhoto,
  putV1MePhoto,
  putV1PartiesPhoto,
  type Party,
} from "@/lib/api"
import { cn } from "@/lib/utils"

const SIDE = 256

/** "parties/3" or "me": where a photo lives on the API. */
export const photoSrc = (path: string, key?: string | null) =>
  key ? `/api/v1/${path}/photo/?v=${key}` : null

/** The photo, filling its round frame, or the name's first letter. */
export function Face({ name, src }: { name: string; src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- served by the signed-in proxy, not Next's image optimiser
    <img
      src={src}
      alt=""
      draggable={false}
      className="size-full rounded-[inherit] object-cover"
    />
  ) : (
    initial(name)
  )
}

/** A centred 256 px square JPEG. Redrawing it drops the camera's hidden details (location included). */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = SIDE
  canvas
    .getContext("2d")!
    .drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      SIDE,
      SIDE
    )
  bitmap.close()
  return new Promise((done, fail) =>
    canvas.toBlob(
      (blob) => (blob ? done(blob) : fail(new Error("encode"))),
      "image/jpeg",
      0.86
    )
  )
}

/** A new photo, null to remove it, or undefined to leave it. */
export type PhotoChange = Blob | null | undefined

const asFile = (photo: Blob) =>
  new File([photo], "photo.jpg", { type: photo.type || "image/jpeg" })

/** The session with the shop's new photo, or undefined when nothing changed. */
export async function saveMyPhoto(change: PhotoChange) {
  if (change === undefined) return undefined
  return change === null
    ? data(deleteV1MePhoto())
    : data(putV1MePhoto({ body: { photo: asFile(change) } }))
}

/** The party with its new photo, or undefined when nothing changed. */
export async function savePartyPhoto(id: number, change: PhotoChange) {
  if (change === undefined) return undefined
  const saved =
    change === null
      ? data(deleteV1PartiesPhoto({ path: { id } }))
      : data(
          putV1PartiesPhoto({ path: { id }, body: { photo: asFile(change) } })
        )
  return saved as Promise<Party>
}

/** Optional photo for a form: a round preview with Add / Change and Remove. */
export function PhotoField({
  name,
  src,
  change,
  onChange,
}: {
  name: string
  src: string | null
  change: PhotoChange
  onChange: (change: PhotoChange) => void
}) {
  const { t } = useI18n()
  const [error, setError] = React.useState("")
  const input = React.useRef<HTMLInputElement>(null)
  const preview = React.useMemo(
    () => (change ? URL.createObjectURL(change) : null),
    [change]
  )
  React.useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview]
  )
  const shown = change === null ? null : (preview ?? src)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError("")
    try {
      onChange(await shrink(file))
    } catch {
      setError(t("photo.bad"))
    }
  }

  return (
    <div className="flex items-center gap-4">
      <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-raised text-2xl">
        <Face name={name || "?"} src={shown} />
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="h-10 cursor-pointer rounded-full bg-raised px-4 text-sm transition-transform duration-150 active:scale-[0.97]"
        >
          {shown ? t("photo.change") : t("photo.add")}
        </button>
        {shown && (
          <button
            type="button"
            onClick={() => onChange(src ? null : undefined)}
            className="h-10 cursor-pointer rounded-full px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("photo.remove")}
          </button>
        )}
        <span
          className={cn(
            "basis-full px-1 text-xs",
            error ? "text-[var(--red-ink)]" : "text-muted-foreground"
          )}
        >
          {error || t("photo.optional")}
        </span>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        hidden
        onChange={(e) => {
          void pick(e.target.files?.[0])
          e.target.value = ""
        }}
      />
    </div>
  )
}

/** The shop's own photo, from the rail. */
export function ShopPhotoForm({
  name,
  src,
  onSave,
  onDone,
}: {
  name: string
  src: string | null
  onSave: (change: PhotoChange) => Promise<unknown>
  onDone: () => void
}) {
  const { t } = useI18n()
  const [change, setChange] = React.useState<PhotoChange>()
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (change === undefined) return onDone()
    setBusy(true)
    setError("")
    try {
      await onSave(change)
      toast.success(t("toast.updated", { name }))
      onDone()
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <Dialog.Title className="text-2xl font-normal">
          {t("photo.shop")}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          {t("photo.shopBody")}
        </Dialog.Description>
      </div>
      <PhotoField name={name} src={src} change={change} onChange={setChange} />
      <FormError error={error} />
      <FormActions busy={busy} submit={t("form.save")} />
    </form>
  )
}
