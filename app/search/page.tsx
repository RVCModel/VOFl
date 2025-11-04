"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Filter, Grid, List, ChevronDown } from "lucide-react"
import { useLocale } from "@/components/locale-provider"
import { translations } from "@/lib/i18n"
import { ModelCard } from "@/components/model-card"
import { DatasetCard } from "@/components/dataset-card"
import { CombinedList } from "@/components/combined-list"
import { ModelList } from "@/components/model-list"
import { DatasetList } from "@/components/dataset-list"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// 搜索结果页面组件
function SearchResults() {
  const searchParams = useSearchParams()
  const { locale } = useLocale()
  const t = translations[locale]
  
  const query = searchParams.get("q") || ""
  const [activeTab, setActiveTab] = useState("all")
  const [sortBy, setSortBy] = useState("relevance")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState(query)
  
  // 更新URL中的搜索参数
  const updateSearch = (newQuery: string) => {
    if (newQuery.trim()) {
      const params = new URLSearchParams(searchParams)
      params.set("q", newQuery.trim())
      window.history.pushState(null, "", `/search?${params.toString()}`)
    }
  }
  
  // 处理搜索提交
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateSearch(searchQuery)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 搜索头部 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {t.search?.results || "搜索结果"}
          {query && (
            <span className="text-muted-foreground ml-2">
              "{query}"
            </span>
          )}
        </h1>
        
        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="relative max-w-2xl mt-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t.search?.placeholder || "搜索模型、数据集..."}
            className="h-12 pl-10 pr-20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-8">
            {t.common?.search || "搜索"}
          </Button>
        </form>
      </div>

      {/* 搜索选项 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">{t.common?.all || "全部"}</TabsTrigger>
            <TabsTrigger value="models">{t.common?.models || "模型"}</TabsTrigger>
            <TabsTrigger value="datasets">{t.common?.datasets || "数据集"}</TabsTrigger>
          </TabsList>
          
          {/* 排序和视图选项 */}
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t.common?.sortBy || "排序"}:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    {sortBy === "relevance" && (t.search?.relevance || "相关性")}
                    {sortBy === "latest" && (t.common?.latest || "最新")}
                    {sortBy === "popular" && (t.common?.popular || "热门")}
                    {sortBy === "downloads" && (t.common?.downloads || "下载量")}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy("relevance")}>
                    {t.search?.relevance || "相关性"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("latest")}>
                    {t.common?.latest || "最新"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("popular")}>
                    {t.common?.popular || "热门"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("downloads")}>
                    {t.common?.downloads || "下载量"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* 搜索结果内容 */}
          <div className="mt-6">
            <TabsContent value="all" className="mt-0">
              {query ? (
                <CombinedList 
                  searchQuery={query} 
                  sortBy={sortBy}
                  viewMode={viewMode}
                />
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {t.search?.enterQuery || "请输入搜索关键词"}
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="models" className="mt-0">
              {query ? (
                <ModelList 
                  searchQuery={query} 
                  sortBy={sortBy}
                  viewMode={viewMode}
                />
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {t.search?.enterQuery || "请输入搜索关键词"}
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="datasets" className="mt-0">
              {query ? (
                <DatasetList 
                  searchQuery={query} 
                  sortBy={sortBy}
                  viewMode={viewMode}
                />
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {t.search?.enterQuery || "请输入搜索关键词"}
                  </p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

// 带有Suspense的搜索页面组件
export default function SearchPage() {
  const { locale } = useLocale()
  const t = translations[locale]
  
  // 设置页面标题
  useEffect(() => {
    document.title = t.search?.pageTitle || '搜索 - VOFL语音合成模型平台'
  }, [t.search?.pageTitle])
  
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-12 w-full max-w-2xl" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    }>
      <SearchResults />
    </Suspense>
  )
}