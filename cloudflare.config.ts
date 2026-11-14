import { bindings, defineConfig, defineWorker } from "cf/config"

export default defineConfig({
  worker: defineWorker({
    name: "app",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-14",
    // lib/session.ts reads the API address from process.env, which nodejs_compat fills from env below.
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      KHATAFLOW_API_URL: bindings.text(
        "https://khataflow-api-leaq.onrender.com"
      ),
    },
  }),
})
