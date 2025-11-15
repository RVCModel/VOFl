"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { DatasetCard } from '@/components/dataset-card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth-context'
import { useLocale } from '@/components/locale-provider'
import { translations } from '@/lib/i18n'

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

interface DatasetListProps {
  limit?: number
  category?: string
  type?: string
  sortBy?: string
  searchQuery?: string
  viewMode?: "grid" | "list"
}

export function DatasetList({ 
  limit = 20, 
  category = 'all', 
  type = 'all', 
  sortBy = 'recommended',
  searchQuery = '',
  viewMode = "grid"
}: DatasetListProps) {
  const { user, session } = useAuth()
  const { locale } = useLocale()
  const t = translations[locale]
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDatasets(0, limit, true)
  }, [limit, category, type, sortBy, searchQuery])

  const fetchDatasets = async (pageNum: number, pageSize: number, reset: boolean = false) => {
    try {
      setError(null)
      if (reset) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      const params = new URLSearchParams({
        limit: pageSize.toString(),
        page: pageNum.toString(),
        category,
        type,
        sortBy,
        ...(searchQuery && { searchQuery })
      })
      // no userId param; backend uses Authorization
      
      const response = await fetch(`/api/datasets?${params}`, {
        headers: session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : undefined,
      })
      if (!response.ok) {
        throw new Error('Failed to fetch datasets')
      }
      
      const data = await response.json()
      
      if (reset) {
        setDatasets(data.datasets || [])
        setPage(0)
      } else {
        setDatasets(prev => [...prev, ...(data.datasets || [])])
      }
      
      setHasMore(data.hasMore || false)
    } catch (error) {
      console.error('获取数据集列表失败:', error)
      setError('获取数据集列表失败，请稍后再试')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchDatasets(nextPage, limit, false)
    }
  }

  // 根据视图模式渲染不同的布局
  const renderDatasetItem = (dataset: Dataset) => {
    return (
      <div key={dataset.id} className="space-y-2">
        <DatasetCard
          id={dataset.id}
          name={dataset.name}
          coverImageUrl={dataset.cover_image_url}
          type={dataset.type || 'gpt-sovits'}
          contentCategory={(dataset as any).content_category as any}
          downloadCount={dataset.download_count || 0}
          viewCount={dataset.view_count || 0}
          username={dataset.profiles?.username}
          displayName={dataset.profiles?.display_name}
          avatarUrl={dataset.profiles?.avatar_url}
          isPaid={dataset.is_paid || false}
          recommended={(dataset as any).rec_meta && ((dataset as any).rec_meta.prefBoost || 0) > 0}
          recommendedLabel={t?.badges?.recommended || '为你推荐'}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p>{error}</p>
        </div>
      )}

      {/* 数据集列表 */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : datasets.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? `未找到与"${searchQuery}"相关的数据集` : "暂无数据集"}
          </p>
        </div>
      ) : (
        <>
          <div className={viewMode === "grid" 
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            : "space-y-4"
          }>
            {datasets.map(renderDatasetItem)}
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
