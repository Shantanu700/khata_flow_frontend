import type { Metadata, Viewport } from "next"
import { Geist_Mono, Urbanist } from "next/font/google"

import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
  adjustFontFallback: false,
})
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "KhaataFlow",
  description: "Voice-first shop book for kirana merchants",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn("dark", urbanist.variable, fontMono.variable)}
    >
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  )
}
