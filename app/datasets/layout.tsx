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
      title: "Datasets - VOFL.AI - Speech Synthesis Model Hub",
      description:
        "Discover and share high-quality datasets for speech synthesis, TTS, and AI creation on VOFL.AI.",
      keywords: [
        "gpt-sovits",
        "datasets",
        "speech dataset",
        "free download",
        "anime",
        "ACG",
        "AI",
        "TTS",
        "voice conversion",
        "deep learning",
      ],
    }
  }

  return {
    title: "数据集 - VOFL.AI - 语音合成模型网",
    description: "专业的VOFL模型和数据集分享平台，致力于gpt-sovits模型分享以及数据集分享。",
    keywords: ["gpt-sovits", "模型", "语音模型", "免费下载", "二次元", "ACG", "AI", "炼丹", "人工智能", "深度学习", "语音转换", "tts"],
  }
}

export default function DatasetsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
