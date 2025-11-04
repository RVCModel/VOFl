"use client"

import * as React from "react"
import { useLocale } from "./locale-provider"

const carouselSlides = {
  zh: [
    {
      id: 1,
      title: "全新上线VOFL",
      subtitle: "更多免费模型",
      description: "模型免费 | 无限下载 | 创作分成",
      textColor: "text-white",
    },
  ],
  en: [
    {
      id: 1,
      title: "New Release VOFL",
      subtitle: "More Free Models",
      description: "Free Models | Unlimited Downloads | Revenue Share",
      textColor: "text-white",
    },
  ],
}

export function HeroCarousel() {
  return (
<div className="relative h-[240px] md:h-[280px] lg:h-[360px] max-h-[50vh]">
  {/* 背景图片 */}
  <img 
    src="/bg.png" 
    alt="Background" 
    className="w-full h-full object-cover"
    style={{ width: '100%' }}
  />
</div>
  )
}
