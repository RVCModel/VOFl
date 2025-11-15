"use client"

import { useState } from "react"
import { useLocale } from "./locale-provider"
import { translations } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { ModelList } from "./model-list"
import { DatasetList } from "./dataset-list"
import { CombinedList } from "./combined-list"

export function ContentTabs() {
  const { locale } = useLocale()
  const t = translations[locale]

  const [activeTab, setActiveTab] = useState<"all" | "models" | "datasets">("all")
  const [activeCategory, setActiveCategory] = useState("all")
  const [activeType, setActiveType] = useState("all")
  const [sortBy, setSortBy] = useState("recommended")

  const tabs = [
    { id: "all" as const, label: t.common?.all || "全部" },
    { id: "models" as const, label: t.tabs.models },
    { id: "datasets" as const, label: t.tabs.datasets },
  ]

  const modelCategories = [
    { id: "all", label: t.models?.allCategories || t.categories?.all || "全部分类" },
    { id: "ip_anime", label: t.categories?.ipAnime || "动漫IP" },
    { id: "explanation", label: t.categories?.explanation || "解说类" },
    { id: "character", label: t.categories?.character || "角色音色" },
    { id: "game", label: t.categories?.game || "游戏音色" },
    { id: "other", label: t.categories?.other || "其他" },
  ]

  const datasetCategories = [
    { id: "all", label: t.datasets?.allCategories || "全部分类" },
    { id: "ip_anime", label: t.categories?.ipAnime || "动漫IP" },
    { id: "explanation", label: t.categories?.explanation || "解说类" },
    { id: "character", label: t.categories?.character || "角色音色" },
    { id: "game", label: t.categories?.game || "游戏音色" },
    { id: "other", label: t.categories?.other || "其他" },
  ]

  const datasetTypes = [
    { id: "all", label: t.datasets?.allTypes || "全部类型" },
    { id: "audio", label: t.datasets?.voiceType || "语音" },
    { id: "text", label: t.datasets?.textType || "文本" },
    // 页面上本来就有 video / image，这里给出合理的多语言 fallback
    { id: "video", label: (t as any)?.datasets?.videoType || "视频" },
    { id: "image", label: t.datasets?.imageType || "图片" },
  ]

  const getCategoryOptions = () => {
    if (activeTab === "all") {
      return [
        { id: "all", label: t.datasets?.allCategories || "全部分类" },
        { id: "ip_anime", label: t.categories?.ipAnime || "动漫IP" },
        { id: "explanation", label: t.categories?.explanation || "解说类" },
        { id: "character", label: t.categories?.character || "角色音色" },
        { id: "game", label: t.categories?.game || "游戏音色" },
        { id: "other", label: t.categories?.other || "其他" },
      ]
    }
    return activeTab === "models" ? modelCategories : datasetCategories
  }

  const getTypeOptions = () => {
    if (activeTab === "all") {
      return datasetTypes
    }
    return activeTab === "models" ? [] : datasetTypes
  }

  const sortOptions = [
    { id: "recommended", label: t.sort.recommended },
    { id: "latest", label: t.sort.latest },
    { id: "popular", label: t.sort.popular },
    { id: "mostRun", label: t.sort.mostRun },
    { id: "mostDownload", label: t.sort.mostDownload },
    { id: "mostDiscuss", label: t.sort.mostDiscuss },
  ]

  return (
    <div className="space-y-4">
      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Categories and Sort */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {getCategoryOptions().map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(category.id)}
              className="h-8 text-xs"
            >
              {category.label}
            </Button>
          ))}

          {(activeTab === "datasets" || activeTab === "all") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                >
                  {getTypeOptions().find((option) => option.id === activeType)
                    ?.label || t.datasets?.allTypes || "全部类型"}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[120px]">
                {getTypeOptions().map((type) => (
                  <DropdownMenuItem
                    key={type.id}
                    onClick={() => setActiveType(type.id)}
                    className={activeType === type.id ? "bg-accent" : ""}
                  >
                    {type.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="bg-transparent gap-2">
              {sortOptions.find((opt) => opt.id === sortBy)?.label}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.id}
                onClick={() => setSortBy(option.id)}
                className={sortBy === option.id ? "bg-accent" : ""}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 推荐说明 */}
      {sortBy === "recommended" && (
        <div className="text-xs text-muted-foreground">
          {t?.sortDescriptions?.recommended ||
            "为你推荐：根据你的关注、点赞和标签偏好综合排序"}
        </div>
      )}

      {/* Content based on active tab */}
      <div className="mt-6">
        {activeTab === "all" && (
          <CombinedList
            limit={20}
            category={activeCategory}
            type={activeType}
            sortBy={sortBy}
          />
        )}
        {activeTab === "models" && (
          <ModelList
            limit={20}
            category={activeCategory}
            type={activeType}
            sortBy={sortBy}
          />
        )}
        {activeTab === "datasets" && (
          <DatasetList
            limit={20}
            category={activeCategory}
            type={activeType}
            sortBy={sortBy}
          />
        )}
      </div>
    </div>
  )
}

