import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

import { API_URL, TOKEN_COOKIE, cookieOptions } from "@/lib/session"

/** Sign in (or with ?register, open a new shop): trade the credentials for the API token and keep it in
 *  an httpOnly cookie. */
export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.has("register") ? "register" : "login"
  const res = await fetch(`${API_URL}/api/v1/auth/${action}/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await req.text(),
    cache: "no-store",
  })
  const body = await res.json()
  if (!res.ok) return NextResponse.json(body, { status: res.status })
  const { token, ...session } = body
  const out = NextResponse.json(session)
  out.cookies.set(TOKEN_COOKIE, token, cookieOptions)
  return out
}

/** Sign out: revoke the token on the server, then forget it. */
export async function DELETE() {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value
  if (token)
    await fetch(`${API_URL}/api/v1/auth/logout/`, {
      method: "POST",
      headers: { authorization: `Token ${token}` },
      cache: "no-store",
    }).catch(() => undefined)
  const out = NextResponse.json({ ok: true })
  out.cookies.delete(TOKEN_COOKIE)
  return out
}
