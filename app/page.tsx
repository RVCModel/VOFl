import { HeroCarousel } from "@/components/hero-carousel"
import { ContentTabs } from "@/components/content-tabs"
import { AudioCard } from "@/components/audio-card"

export default function HomePage() {
  // 示例数据


  return (
    <div className="space-y-8">
      <HeroCarousel />

      <ContentTabs />

      {/* 音频卡片部分 */}
   
    </div>
  )
}
