import type { CreateClientConfig } from "@/lib/client/client.gen"

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: "",
})
