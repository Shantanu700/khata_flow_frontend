import "server-only"

/** The KhataFlow API, reached only from the server: the browser talks to /api/kf/* instead. */
export const API_URL = (process.env.KHATAFLOW_API_URL ?? "https://localhost:8000").replace(/\/$/, "")

/** httpOnly, so page scripts never see the API token. */
export const TOKEN_COOKIE = "kf_token"

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
}
