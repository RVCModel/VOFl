"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ModelCard } from '@/components/model-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search,
  Filter,
} from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { translations } from '@/lib/i18n'

interface Model {
  id: string
  name: string
  type: string
  category: string
  language: string
  tags: string[]
  description: string
  is_paid: boolean
  price: number | null
  cover_image_url: string
  user_id: string
  status: string
  created_at: string
  view_count: number
  download_count: number
  profiles?: {
    username: string
    display_name?: string
    avatar_url: string
  }
}

export default function ModelsPage() {
  const { locale } = useLocale()
  const t = translations[locale]

  const [models, setModels] = useState<Model[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  // 设置页面标题
  useEffect(() => {
    document.title = t.models?.pageTitle || 'TTS 模型 - VOFL 语音平台'
  }, [t.models?.pageTitle])

  // 过滤条件变化时重置分页并重新拉取
  useEffect(() => {
    setPage(0)
    setHasMore(true)
    fetchModels(0, true)
  }, [searchQuery, categoryFilter, sortBy])

  const fetchModels = async (pageToLoad = 0, replace = false) => {
    if (pageToLoad === 0) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }

    try {
      const params = new URLSearchParams({
        sortBy,
        limit: '20',
        page: String(pageToLoad),
        ...(searchQuery && { searchQuery }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
      })

      const response = await fetch(`/api/models?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setModels((prev) =>
          replace || pageToLoad === 0 ? data.models : [...prev, ...(data.models || [])],
        )
        setHasMore(Boolean(data.hasMore))
      } else {
        console.error('Failed to fetch models:', data.error)
      }
    } catch (error) {
      console.error('获取模型列表失败:', error)
    } finally {
      if (pageToLoad === 0) {
        setIsLoading(false)
      } else {
        setIsLoadingMore(false)
      }
    }
  }

  const handleLoadMore = () => {
    if (!hasMore || isLoadingMore) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchModels(nextPage)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t.models?.title || 'TTS 模型'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t.models?.description || '浏览和使用社区发布的语音合成模型'}
        </p>
      </div>

      {/* 搜索与筛选 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
          <Input
            placeholder={t.models?.searchPlaceholder || '搜索模型名称或描述...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t.models?.categoryFilter || '分类'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t.models?.allCategories || '全部分类'}
              </SelectItem>
              <SelectItem value="ip_anime">
                {t.categories?.ipAnime || '动漫 / 虚拟 IP'}
              </SelectItem>
              <SelectItem value="explanation">
                {t.categories?.explanation || '讲解 / 解说'}
              </SelectItem>
              <SelectItem value="character">
                {t.categories?.character || '角色配音'}
              </SelectItem>
              <SelectItem value="game">
                {t.categories?.game || '游戏角色'}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t.models?.sortBy || '排序'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">
                {t.models?.newest || '最新发布'}
              </SelectItem>
              <SelectItem value="popular">
                {t.models?.popular || '综合推荐'}
              </SelectItem>
              <SelectItem value="views">
                {t.models?.views || '浏览最多'}
              </SelectItem>
              <SelectItem value="name">
                {t.models?.name || '名称排序'}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 模型列表 */}
      {isLoading && page === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : models.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {t.models?.noModelsFound || '没有找到匹配的模型'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {models.map((model) => (
              <div key={model.id} className="space-y-2">
                <ModelCard
                  id={model.id}
                  name={model.name}
                  coverImageUrl={model.cover_image_url}
                  type={model.type}
                  downloadCount={model.download_count || 0}
                  viewCount={model.view_count || 0}
                  username={model.profiles?.username}
                  displayName={model.profiles?.display_name}
                  avatarUrl={model.profiles?.avatar_url}
                  isPaid={model.is_paid}
                />
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore
                  ? t.models?.loadingMore || '加载中...'
                  : t.models?.loadMore || '显示更多'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

