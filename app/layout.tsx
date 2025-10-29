import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { ThemeProvider } from "@/components/theme-provider"
import { LocaleProvider } from "@/components/locale-provider"
import { AuthProvider } from "@/components/auth-context"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "VOFL.AI - 语音合成模型网",
  description: "专业的VOFL模型和数据集分享平台,致力于gpt-sovits模型分享以及数据集分享。",
  keywords: ["gpt-sovits", "模型", "语音模型", "免费下载", "二次元", "ACG", "AI", "炼丹", "人工智能", "深度学习", "语音转换", "tts"],
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider defaultTheme="system">
          <LocaleProvider>
            <AuthProvider>
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
