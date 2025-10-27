"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ModelCard } from '@/components/model-card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

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
    avatar_url: string
  }
}

interface ModelListProps {
  limit?: number
  category?: string
  type?: string
  sortBy?: string
  searchQuery?: string
  viewMode?: "grid" | "list"
}

export function ModelList({ 
  limit = 20, 
  category = 'all', 
  type = 'all', 
  sortBy = 'recommended',
  searchQuery = '',
  viewMode = "grid"
}: ModelListProps) {
  const [models, setModels] = useState<Model[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchModels(0, limit, true)
  }, [limit, category, type, sortBy, searchQuery])

  const fetchModels = async (pageNum: number, pageSize: number, reset: boolean = false) => {
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
      
      const response = await fetch(`/api/models?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }
      
      const data = await response.json()
      const modelsWithProfiles = data.models || []
      
      // 更新状态
      if (reset) {
        setModels(modelsWithProfiles)
        setPage(0)
      } else {
        setModels(prev => [...prev, ...modelsWithProfiles])
      }

      // 检查是否还有更多数据
      setHasMore(data.hasMore || false)
    } catch (error) {
      console.error('获取模型列表失败:', error)
      setError('获取模型列表失败，请稍后再试')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchModels(nextPage, limit, false)
    }
  }

  // 根据视图模式渲染不同的布局
  const renderModelItem = (model: Model) => {
    return (
      <div key={model.id} className="space-y-2">
        <ModelCard
          id={model.id}
          name={model.name}
          coverImageUrl={model.cover_image_url}
          type={model.type || 'gpt-sovits'}
          downloadCount={model.download_count || 0}
          viewCount={model.view_count || 0}
          username={model.profiles?.username}
          avatarUrl={model.profiles?.avatar_url}
          isPaid={model.is_paid || false}
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

      {/* 模型列表 */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : models.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? `未找到与"${searchQuery}"相关的模型` : "暂无模型"}
          </p>
        </div>
      ) : (
        <>
          <div className={viewMode === "grid" 
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            : "space-y-4"
          }>
            {models.map(renderModelItem)}
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