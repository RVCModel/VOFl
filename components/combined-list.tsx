"use client"

import { useState, useEffect } from 'react'
import { ModelCard } from '@/components/model-card'
import { DatasetCard } from '@/components/dataset-card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth-context'
import { useLocale } from '@/components/locale-provider'
import { translations } from '@/lib/i18n'

interface Model {
  id: string
  name: string
  type: string
  is_paid: boolean
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

interface Dataset {
  id: string
  name: string
  type: string
  is_paid: boolean
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

interface CombinedItem {
  id: string
  name: string
  type: string
  item_type: 'model' | 'dataset'
  is_paid: boolean
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

interface CombinedListProps {
  limit?: number
  category?: string
  type?: string
  sortBy?: string
  searchQuery?: string
  viewMode?: "grid" | "list"
}

export function CombinedList({ 
  limit = 20, 
  category = 'all', 
  type = 'all', 
  sortBy = 'recommended',
  searchQuery = '',
  viewMode = "grid"
}: CombinedListProps) {
  const { user, session } = useAuth()
  const { locale } = useLocale()
  const t = translations[locale]
  const [items, setItems] = useState<CombinedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [seed] = useState(() => Math.random().toString(36).slice(2))

  useEffect(() => {
    fetchItems(0, limit, true)
  }, [limit, category, type, sortBy, searchQuery])

  const fetchItems = async (pageNum: number, pageSize: number, reset: boolean = false) => {
    try {
      setError(null)
      if (reset) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      // 构建查询参数
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: pageSize.toString(),
        seed,
      })

      if (searchQuery) {
        params.append('searchQuery', searchQuery)
      }

      if (category !== 'all') {
        params.append('category', category)
      }

      if (type !== 'all') {
        params.append('type', type)
      }

      params.append('sortBy', sortBy)
      // no userId in query; backend reads Authorization for personalization

      // 调用API获取数据
      const response = await fetch(`/api/combined?${params.toString()}` , {
        headers: session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : undefined,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch items')
      }

      // 更新状态
      if (reset) {
        setItems(data.items)
        setPage(0)
      } else {
        setItems(prev => [...prev, ...data.items])
      }

      setHasMore(data.hasMore)
      setError(null)
    } catch (error) {
      console.error('获取组合列表失败:', error)
      setError(error instanceof Error ? error.message : '获取组合列表失败，请稍后再试')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchItems(nextPage, limit, false)
    }
  }

  // 根据视图模式渲染不同的布局
  const renderItem = (item: CombinedItem & { rec_meta?: any; content_category?: string }) => {
    if (item.item_type === 'model') {
      return (
        <div key={item.id} className="space-y-2">
          <ModelCard
            id={item.id}
            name={item.name}
            coverImageUrl={item.cover_image_url}
            type={item.type || 'gpt-sovits'}
            downloadCount={item.download_count || 0}
            viewCount={item.view_count || 0}
            username={item.profiles?.username}
            displayName={item.profiles?.display_name}
            avatarUrl={item.profiles?.avatar_url}
            isPaid={item.is_paid || false}
            recommended={!!item.rec_meta && (item.rec_meta.prefBoost || 0) > 0}
            recommendedLabel={t?.badges?.recommended || '为你推荐'}
          />
        </div>
      )
    } else {
      return (
        <div key={item.id} className="space-y-2">
          <DatasetCard
            id={item.id}
            name={item.name}
            coverImageUrl={item.cover_image_url}
            type={item.type || 'gpt-sovits'}
            contentCategory={item.content_category as any}
            downloadCount={item.download_count || 0}
            viewCount={item.view_count || 0}
            username={item.profiles?.username}
            displayName={item.profiles?.display_name}
            avatarUrl={item.profiles?.avatar_url}
            isPaid={item.is_paid || false}
            recommended={!!item.rec_meta && (item.rec_meta.prefBoost || 0) > 0}
            recommendedLabel={t?.badges?.recommended || '为你推荐'}
          />
        </div>
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p>{error}</p>
        </div>
      )}

      {/* 组合列表 */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? `未找到与"${searchQuery}"相关的内容` : "暂无内容"}
          </p>
        </div>
      ) : (
        <>
          <div className={viewMode === "grid" 
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            : "space-y-4"
          }>
            {items.map(renderItem)}
          </div>

          {/* 加载更多按钮 */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={loadMore}
                disabled={isLoadingMore}
                variant="outline"
                className="min-w-[120px]"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    加载中...
                  </>
                ) : (
                  "加载更多"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}