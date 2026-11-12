import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

import { API_URL, TOKEN_COOKIE } from "@/lib/session"

// Readable without signing in: the screens' words in each language.
const PUBLIC = ["i18n"]

/** Forwards /api/v1/<path>/ to the API's own /api/v1/<path>/, adding the token from the httpOnly cookie. */
async function forward(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const token = (await cookies()).get(TOKEN_COOKIE)?.value
  if (!token && !PUBLIC.includes(path[0]))
    return NextResponse.json(
      { error: { code: "NOT_AUTHENTICATED", message: "Sign in again." } },
      { status: 401 }
    )

  const headers = new Headers()
  if (token) headers.set("authorization", `Token ${token}`)
  const type = req.headers.get("content-type")
  if (type) headers.set("content-type", type)
  const hasBody = !["GET", "HEAD"].includes(req.method)

  const res = await fetch(
    `${API_URL}/api/v1/${path.map(encodeURIComponent).join("/")}/${req.nextUrl.search}`,
    {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      cache: "no-store",
    }
  )
  const out = new NextResponse(res.status === 204 ? null : res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
      ...Object.fromEntries(
        ["cache-control", "x-content-type-options"].flatMap((h) => {
          const v = res.headers.get(h)
          return v ? [[h, v]] : []
        })
      ),
    },
  })
  if (res.status === 401) out.cookies.delete(TOKEN_COOKIE)
  return out
}

export { forward as DELETE, forward as GET, forward as POST, forward as PUT }
