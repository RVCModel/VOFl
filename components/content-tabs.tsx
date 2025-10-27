"use client"

import { useState } from "react"
import { useLocale } from "./locale-provider"
import { translations } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { ModelList } from "./model-list"
import { DatasetList } from "./dataset-list"
import { CombinedList } from "./combined-list"

export function ContentTabs() {
  const { locale } = useLocale()
  const t = translations[locale]

  const [activeTab, setActiveTab] = useState("all")
  const [activeCategory, setActiveCategory] = useState("all")
  const [activeType, setActiveType] = useState("all")
  const [sortBy, setSortBy] = useState("recommended")

  const tabs = [
    { id: "all", label: "全部" },
    { id: "models", label: t.tabs.models },
    { id: "datasets", label: t.tabs.datasets },
  ]

  const modelCategories = [
    { id: "all", label: t.categories.all },
    { id: "ip_anime", label: "动漫IP" },
    { id: "explanation", label: "解说" },
    { id: "character", label: "角色" },
    { id: "game", label: "游戏" },
    { id: "other", label: "其他" },
  ]

  // 数据集分类选项
  const datasetCategories = [
    { id: "all", label: "全部分类" },
    { id: "speech", label: "语音合成" },
    { id: "voice-conversion", label: "声音转换" },
    { id: "speech-recognition", label: "语音识别" },
    { id: "tts", label: "文本转语音" },
    { id: "other", label: "其他" }
  ]

  // 数据集类型选项
  const datasetTypes = [
    { id: "all", label: "全部类型" },
    { id: "audio", label: "音频" },
    { id: "text", label: "文本" },
    { id: "video", label: "视频" },
    { id: "image", label: "图像" }
  ]

  // 根据当前标签页获取分类选项
  const getCategoryOptions = () => {
    if (activeTab === "all") {
      // 为"全部"标签页提供合并的分类选项
      return [
        { id: "all", label: "全部分类" },
        { id: "ip_anime", label: "动漫IP" },
        { id: "explanation", label: "解说" },
        { id: "character", label: "角色" },
        { id: "game", label: "游戏" },
        { id: "speech", label: "语音合成" },
        { id: "voice-conversion", label: "声音转换" },
        { id: "speech-recognition", label: "语音识别" },
        { id: "tts", label: "文本转语音" },
        { id: "other", label: "其他" }
      ]
    }
    return activeTab === "models" ? modelCategories : datasetCategories
  }

  // 根据当前标签页获取类型选项
  const getTypeOptions = () => {
    if (activeTab === "all") {
      // 为"全部"标签页提供合并的类型选项
      return [
        { id: "all", label: "全部类型" },
        { id: "audio", label: "音频" },
        { id: "text", label: "文本" },
        { id: "video", label: "视频" },
        { id: "image", label: "图像" }
      ]
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
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        ))}
      </div>

      {/* Categories and Sort */}
      <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {getCategoryOptions().map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(category.id)}
                className="text-xs h-8"
              >
                {category.label}
              </Button>
            ))}
            
            {/* 类型筛选下拉菜单 - 仅在数据集和全部标签页显示 */}
            {(activeTab === "datasets" || activeTab === "all") && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
                    {getTypeOptions().find(option => option.id === activeType)?.label || "类型"}
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
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
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
