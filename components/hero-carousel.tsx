"use client"

import * as React from "react"
import Link from "next/link"
import { useLocale } from "./locale-provider"
import { Button } from "@/components/ui/button"

const carouselSlides = {
  zh: [
    {
      id: 1,
      title: "VOFL 语音宇宙",
      subtitle: "海量免费模型，一键发布分享",
      description: "TTS 模型 · 数据集 · 创作者收益共享平台",
      primaryCta: "立即发布模型",
      secondaryCta: "浏览热门模型",
      tagline: "高质量语音 · 即刻体验",
      betaLabel: "Beta · VOFL.AI",
      textColor: "text-white",
    },
  ],
  en: [
    {
      id: 1,
      title: "New VOFL Voice Universe",
      subtitle: "More free models, share your voice",
      description: "TTS Models · Datasets · Creator revenue share platform",
      primaryCta: "Publish Model Now",
      secondaryCta: "Browse Popular Models",
      tagline: "High‑fidelity voice · Try instantly",
      betaLabel: "Beta · VOFL.AI",
      textColor: "text-white",
    },
  ],
} as const

export function HeroCarousel() {
  const { locale } = useLocale()
  const slides = (carouselSlides as any)[locale] ?? carouselSlides.en
  const slide = slides[0]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-muted/40">
      <img
        src="/bg.png"
        alt="Background"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20" />
      <div className="relative flex h-[220px] items-center gap-8 px-6 md:h-[260px] md:px-10 lg:h-[320px] lg:px-14">
        <div className="max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>{(slide as any).betaLabel}</span>
          </div>
          <h2
            className={`text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl ${
              (slide as any).textColor
            }`}
          >
            {slide.title}
          </h2>
          <p className="text-sm text-white/80 md:text-base">{slide.subtitle}</p>
          <p className="text-xs text-white/60 md:text-sm">{slide.description}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="sm" className="px-4 md:px-6">
              <Link href="/publish/model">{(slide as any).primaryCta}</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10"
            >
              <Link href="/models">{(slide as any).secondaryCta}</Link>
            </Button>
          </div>
        </div>
        <div className="hidden flex-1 justify-end md:flex">
          <div className="w-64 rounded-2xl border border-white/10 bg-black/30 p-4 shadow-xl backdrop-blur lg:w-72">
            <div className="relative mb-3 h-32 overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-inner">
              <img
                src="/bg.png"
                alt="VOFL hero visual"
                className="h-full w-full object-cover opacity-85"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-purple-600/60 via-sky-500/40 to-emerald-400/40 mix-blend-soft-light" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
            <p className="truncate text-sm font-medium text-white/90">
              {slide.subtitle || "Featured Voice Model"}
            </p>
            <p className="mt-1 truncate text-xs text-white/60">
              {slide.description}
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-white/60">
              <span>{(slide as any).tagline}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5">New</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
