import { notFound } from "next/navigation"

import { KhataApp } from "@/components/app/khata-app"
import { SCREEN_PATH } from "@/components/app/khata-data"

const PATHS = Object.values(SCREEN_PATH)

export const generateStaticParams = () =>
  PATHS.map((path) => ({ screen: path === "/" ? [] : [path.slice(1)] }))

export default async function Page({
  params,
}: {
  params: Promise<{ screen?: string[] }>
}) {
  const { screen = [] } = await params
  if (!PATHS.includes(`/${screen.join("/")}`)) notFound()
  return <KhataApp />
}
