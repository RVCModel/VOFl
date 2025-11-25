import type React from "react"
import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { TopProgressBar } from "@/components/top-progress-bar"
import { ThemeProvider } from "@/components/theme-provider"
import { LocaleProvider } from "@/components/locale-provider"
import { AuthProvider } from "@/components/auth-context"
import { createServerSupabase } from "@/lib/supabase-server"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies()
  const preferredLocale =
    (cookieStore.get("vofl_locale")?.value as any) ||
    (() => {
      const accept = headers().get("accept-language")?.toLowerCase() || ""
      if (accept.startsWith("ja") || accept.includes("ja")) return "ja"
      if (accept.startsWith("en") || accept.includes("en")) return "en"
      return "zh"
    })()

  const zh: Metadata = {
    title: "VOFL.AI - 语音合成模型网",
    description: "专业的VOFL模型和数据集分享平台,致力于gpt-sovits模型分享以及数据集分享。",
    keywords: ["gpt-sovits", "模型", "语音模型", "免费下载", "二次元", "ACG", "AI", "炼丹", "人工智能", "深度学习", "语音转换", "tts"],
    icons: {
      icon: "/favicon.ico",
    },
  }

  const en: Metadata = {
    title: "VOFL.AI - Speech Synthesis Model Hub",
    description: "Professional VOFL model and dataset sharing platform, dedicated to gpt-sovits models and datasets.",
    keywords: [
      "gpt-sovits",
      "models",
      "speech model",
      "free download",
      "anime",
      "ACG",
      "AI",
      "TTS",
      "voice conversion",
      "deep learning",
    ],
    icons: {
      icon: "/favicon.ico",
    },
  }

  return preferredLocale === "en" ? en : zh
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // SSR: inject session & user for first render to avoid flicker
  const cookieStore = await cookies()
  const preferredLocale =
    (cookieStore.get("vofl_locale")?.value as any) ||
    (() => {
      const accept = headers().get("accept-language")?.toLowerCase() || ""
      if (accept.startsWith("ja") || accept.includes("ja")) return "ja"
      if (accept.startsWith("en") || accept.includes("en")) return "en"
      return "zh"
    })()
  const supabase = await createServerSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const initialSession = session ?? null
  const initialUser = session?.user ?? null

  return (
    <html lang={preferredLocale} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <TopProgressBar />
        <ThemeProvider defaultTheme="system">
          <LocaleProvider defaultLocale={preferredLocale}>
            <AuthProvider initialSession={initialSession} initialUser={initialUser}>
              <LayoutWrapper>{children}</LayoutWrapper>
              <Toaster />
            </AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
