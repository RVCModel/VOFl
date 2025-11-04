"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DatasetCard } from '@/components/dataset-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  Filter
} from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { translations } from '@/lib/i18n'

interface Dataset {
  id: string
  name: string
  type: string
  content_category: string
  tags: string[]
  description: string
  is_paid: boolean
  price: number | null
  cover_image_url: string
  user_id: string
  status: string
  file_size: number | null
  file_type: string | null
  created_at: string
  view_count: number
  download_count: number
  profiles?: {
    username: string
    display_name?: string
    avatar_url: string
  }
}

export default function DatasetsPage() {
  const { locale } = useLocale()
  const t = translations[locale]
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  // 设置页面标题
  useEffect(() => {
    document.title = t.datasets?.pageTitle || '数据集 - VOFL语音合成模型平台'
  }, [t.datasets?.pageTitle])

  useEffect(() => {
    fetchDatasets()
  }, [searchQuery, categoryFilter, typeFilter, sortBy])

  const fetchDatasets = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        sortBy,
        ...(searchQuery && { searchQuery }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(typeFilter !== 'all' && { type })
      })
      
      const response = await fetch(`/api/datasets?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setDatasets(data.datasets)
      } else {
        console.error('Failed to fetch datasets:', data.error)
      }
    } catch (error) {
      console.error('获取数据集列表失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      'ip_anime': '动漫IP',
      'explanation': '解说类',
      'character': '角色音色',
      'game': '游戏音色',
      'other': '其他'
    }
    return categories[category] || category
  }

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'voice': '语音',
      'text': '文本',
      'image': '图像',
      'other': '其他'
    }
    return types[type] || type
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.datasets?.title || "数据集"}</h1>
        <p className="mt-2 text-muted-foreground">{t.datasets?.description || "获取高质量的语音训练数据集"}</p>
      </div>

      {/* 搜索和过滤器 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t.datasets?.searchPlaceholder || "搜索数据集名称或描述..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t.datasets?.categoryFilter || "分类"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.datasets?.allCategories || "全部分类"}</SelectItem>
              <SelectItem value="ip_anime">{t.categories?.ipAnime || "动漫IP"}</SelectItem>
              <SelectItem value="explanation">{t.categories?.explanation || "解说类"}</SelectItem>
              <SelectItem value="character">{t.categories?.character || "角色音色"}</SelectItem>
              <SelectItem value="game">{t.categories?.game || "游戏音色"}</SelectItem>
              <SelectItem value="other">{t.categories?.other || "其他"}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t.datasets?.typeFilter || "类型"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.datasets?.allTypes || "全部类型"}</SelectItem>
              <SelectItem value="voice">{t.datasets?.voiceType || "语音"}</SelectItem>
              <SelectItem value="text">{t.datasets?.textType || "文本"}</SelectItem>
              <SelectItem value="image">{t.datasets?.imageType || "图像"}</SelectItem>
              <SelectItem value="other">{t.datasets?.otherType || "其他"}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t.datasets?.sortBy || "排序"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t.datasets?.newest || "最新"}</SelectItem>
              <SelectItem value="popular">{t.datasets?.popular || "热门"}</SelectItem>
              <SelectItem value="views">{t.datasets?.views || "浏览"}</SelectItem>
              <SelectItem value="name">{t.datasets?.name || "名称"}</SelectItem>
              <SelectItem value="size">{t.datasets?.size || "大小"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 数据集列表 */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : datasets.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">{t.datasets?.noDatasetsFound || "没有找到匹配的数据集"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {datasets.map((dataset) => (
            <DatasetCard
              key={dataset.id}
              id={dataset.id}
              name={dataset.name}
              coverImageUrl={dataset.cover_image_url}
              type={dataset.type}
              contentCategory={dataset.content_category}
              downloadCount={dataset.download_count || 0}
              viewCount={dataset.view_count || 0}
              username={dataset.profiles?.username}
              displayName={dataset.profiles?.display_name}
              avatarUrl={dataset.profiles?.avatar_url}
              isPaid={dataset.is_paid}
              price={dataset.price}
              fileSize={dataset.file_size}
              fileType={dataset.file_type}
            />
          ))}
        </div>
      )}
    </div>
  )
}
