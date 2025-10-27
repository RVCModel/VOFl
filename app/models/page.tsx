"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ModelCard } from '@/components/model-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { 
  Search, 
  Filter
} from 'lucide-react'

interface Model {
  id: string
  name: string
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
  const [models, setModels] = useState<Model[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  // 设置页面标题
  useEffect(() => {
    document.title = 'TTS模型 - VOFL语音合成模型平台'
  }, [])

  useEffect(() => {
    fetchModels()
  }, [searchQuery, categoryFilter, sortBy])

  const fetchModels = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        sortBy,
        ...(searchQuery && { search: searchQuery }),
        ...(categoryFilter !== 'all' && { category: categoryFilter })
      })
      
      const response = await fetch(`/api/models?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setModels(data.models)
      } else {
        console.error('Failed to fetch models:', data.error)
      }
    } catch (error) {
      console.error('获取模型列表失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">TTS 模型</h1>
        <p className="mt-2 text-muted-foreground">浏览和下载各种语音合成模型</p>
      </div>

      {/* 搜索和过滤器 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="搜索模型名称或描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              <SelectItem value="ip_anime">动漫IP</SelectItem>
              <SelectItem value="explanation">解说类</SelectItem>
              <SelectItem value="character">角色音色</SelectItem>
              <SelectItem value="game">游戏音色</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="排序" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">最新</SelectItem>
              <SelectItem value="popular">热门</SelectItem>
              <SelectItem value="views">浏览</SelectItem>
              <SelectItem value="name">名称</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 模型列表 */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : models.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">没有找到匹配的模型</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
      )}
    </div>
  )
}
