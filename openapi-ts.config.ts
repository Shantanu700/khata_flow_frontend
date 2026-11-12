import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  input: "https://localhost:8000/api/schema/",
  output: "lib/client",
  plugins: [
    "@hey-api/typescript",
    "@hey-api/sdk",
    {
      name: "@hey-api/client-fetch",
      throwOnError: true,
      runtimeConfigPath: "./lib/hey-api",
    },
  ],
})
