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
      bgColor: "from-indigo-900 to-purple-900",
      textColor: "text-white",
    },
  ],
  en: [
    {
      id: 1,
      title: "New Release VOFL",
      subtitle: "More Free Models",
      description: "Free Models | Unlimited Downloads | Revenue Share",
      bgColor: "from-indigo-900 to-purple-900",
      textColor: "text-white",
    },
  ],
}

export function HeroCarousel() {
  const { locale } = useLocale()
  const slides = carouselSlides[locale]

  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      <div className="relative h-[240px] md:h-[280px]">
        {/* Slide */}
        <div className="h-full">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className={`h-full bg-gradient-to-r ${slide.bgColor} flex flex-col justify-center px-8 md:px-12`}
            >
              <div className={slide.textColor}>
                <h2 className="text-3xl md:text-4xl font-bold mb-2">{slide.title}</h2>
                <p className="text-xl md:text-2xl font-semibold mb-2">{slide.subtitle}</p>
                <p className="text-sm md:text-base opacity-90">{slide.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
