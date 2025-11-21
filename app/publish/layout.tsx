import type React from "react"
import type { Metadata } from "next"
import { cookies, headers } from "next/headers"

const resolveLocale = async () => {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get("vofl_locale")?.value as string | undefined
  if (fromCookie) return fromCookie
  const accept = headers().get("accept-language")?.toLowerCase() || ""
  if (accept.startsWith("en") || accept.includes("en")) return "en"
  return "zh"
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()

  if (locale === "en") {
    return {
      title: "Publish - VOFL.AI - Speech Synthesis Model Hub",
      description: "Publish your models or datasets to VOFL.AI and share with the community.",
    }
  }

  return {
    title: "发布 - VOFL.AI - 语音合成模型网",
    description: "在 VOFL.AI 发布你的模型或数据集，与社区分享。",
  }
}

export default function PublishLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
