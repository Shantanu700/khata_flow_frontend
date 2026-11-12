import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // The generated API client calls the API's own paths, which end in "/" (app/api/v1 proxies them).
  skipTrailingSlashRedirect: true,
}

export default nextConfig
