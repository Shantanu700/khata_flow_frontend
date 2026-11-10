import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"

export const size = { width: 64, height: 64 }
export const contentType = "image/png"

/** The browser-tab icon: the K mark on a dark disc, so its white half shows on light tabs too. */
export default async function Icon() {
  const mark = await readFile(
    path.join(process.cwd(), "public/images/logo/khataflow-mark.png")
  )
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        background: "#1a1b18",
      }}
    >
      <img
        src={`data:image/png;base64,${mark.toString("base64")}`}
        width={46}
        height={46}
        alt=""
      />
    </div>,
    size
  )
}
