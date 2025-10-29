"use client"

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/auth-context'
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  Heart, 
  Share2,
  Calendar,
  FileText,
  User,
  Clock,
  HardDrive,
  Tag,
  Play,
  Pause,
  Volume2,
  Bookmark
} from 'lucide-react'

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
  file_url: string
  file_size: number | null
  file_type: string | null
  created_at: string
  updated_at: string
  view_count: number
  download_count: number
  like_count: number
  collection_count: number
  is_original: boolean
  original_author: string | null
  profiles?: {
    username: string
    display_name?: string
    avatar_url: string
  }
}

interface DatasetDetailClientProps {
  initialDataset: Dataset
  initialAuthorDatasets?: Dataset[]
  searchParams?: { [key: string]: string | string[] | undefined }
}

export default function DatasetDetailClient({ initialDataset, initialAuthorDatasets, searchParams }: DatasetDetailClientProps) {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const id = params.id as string
  
  const [dataset, setDataset] = useState<Dataset | null>(initialDataset)
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isAudioLoading, setIsAudioLoading] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isCollected, setIsCollected] = useState(false)
  const [collectionCount, setCollectionCount] = useState(0)
  const [downloadCount, setDownloadCount] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [authorDatasets, setAuthorDatasets] = useState<Dataset[]>(initialAuthorDatasets || [])
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 获取作者的其他数据集
  const fetchAuthorDatasets = async (authorId: string) => {
    try {
      const response = await fetch(`/api/datasets/user/${authorId}?excludeId=${id}&limit=6`)
      
      if (!response.ok) {
        console.error('获取作者数据集失败:', response.statusText)
        return
      }
      
      const data = await response.json()
      setAuthorDatasets(data.datasets || [])
    } catch (error) {
      console.error('获取作者数据集失败:', error)
    }
  }

  // 获取数据集详情
  const fetchDataset = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        includeAuthor: 'true',
        includeAuthorDatasets: 'true'
      })
      
      if (user) {
        params.append('userId', user.id)
      }
      
      const response = await fetch(`/api/datasets/${id}?${params.toString()}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('数据集不存在或已被删除')
        } else {
          setError(`获取数据集失败: ${response.statusText}`)
        }
        throw new Error('Failed to fetch dataset')
      }
      
      const data = await response.json()
      setDataset(data)
      console.log('Author datasets received:', data.authorDatasets)
      setAuthorDatasets(data.authorDatasets || [])
      setIsLiked(data.isLiked || false)
      setIsCollected(data.isCollected || false)
      setLikeCount(data.like_count || 0)
      setCollectionCount(data.collection_count || 0)
      setDownloadCount(data.download_count || 0)
      
      // 如果是语音类型且有音频文件，设置音频URL
      if (data.type === 'voice' && data.audio_url) {
        setAudioUrl(data.audio_url)
      }
      
      setError(null)
    } catch (err) {
      console.error('Error fetching dataset:', err)
      if (!err) {
        setError('获取数据集详情时发生未知错误')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 获取点赞和收藏状态
  const fetchLikeAndCollectionStatus = async () => {
    try {
      // 获取点赞状态和数量
      const likeUrl = user 
        ? `/api/datasets/like?datasetId=${id}&userId=${user.id}`
        : `/api/datasets/like?datasetId=${id}`
      
      const likeResponse = await fetch(likeUrl)
      if (likeResponse.ok) {
        const likeData = await likeResponse.json()
        setIsLiked(likeData.isLiked || false)
        setLikeCount(likeData.likeCount || 0)
      }

      // 获取收藏状态和数量
      const collectionUrl = user 
        ? `/api/datasets/collection?datasetId=${id}&userId=${user.id}`
        : `/api/datasets/collection?datasetId=${id}`
      
      const collectionResponse = await fetch(collectionUrl)
      if (collectionResponse.ok) {
        const collectionData = await collectionResponse.json()
        setIsCollected(collectionData.isCollected || false)
        setCollectionCount(collectionData.collectionCount || 0)
      }
    } catch (error) {
      console.error('获取点赞和收藏状态失败:', error)
    }
  }

  // 处理点赞
  const handleLike = async () => {
    if (!user) {
      toast({
        title: '请先登录',
        description: '点赞功能需要登录后使用',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch('/api/datasets/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          datasetId: id,
          userId: user.id
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update like status')
      }
      
      const data = await response.json()
      setIsLiked(data.isLiked)
      setLikeCount(data.likeCount)
      
      toast({
        title: data.isLiked ? '点赞成功' : '已取消点赞',
        description: data.isLiked ? '感谢您的点赞！' : '您已取消对该数据集的点赞'
      })
    } catch (error) {
      console.error('Error updating like status:', error)
      toast({
        title: '操作失败',
        description: '点赞操作失败，请稍后再试',
        variant: 'destructive'
      })
    }
  }

  // 处理收藏
  const handleCollection = async () => {
    if (!user) {
      toast({
        title: '请先登录',
        description: '收藏功能需要登录后使用',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch('/api/datasets/collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          datasetId: id,
          userId: user.id
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update collection status')
      }
      
      const data = await response.json()
      setIsCollected(data.isCollected)
      setCollectionCount(data.collectionCount)
      
      toast({
        title: data.isCollected ? '收藏成功' : '已取消收藏',
        description: data.isCollected ? '数据集已添加到您的收藏夹' : '您已取消对该数据集的收藏'
      })
    } catch (error) {
      console.error('Error updating collection status:', error)
      toast({
        title: '操作失败',
        description: '收藏操作失败，请稍后再试',
        variant: 'destructive'
      })
    }
  }

  // 处理关注作者
  const handleFollowAuthor = async () => {
    if (!user) {
      toast({
        title: '请先登录',
        description: '关注功能需要登录后使用',
        variant: 'destructive'
      })
      return
    }

    try {
      const action = isFollowing ? 'unfollow' : 'follow'
      const response = await fetch(`/api/datasets/${id}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          authorId: dataset.user_id,
          action
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update follow status')
      }
      
      const data = await response.json()
      setIsFollowing(data.following)
      
      toast({
        title: isFollowing ? '已取消关注' : '关注成功',
        description: isFollowing ? `您已取消关注${dataset.profiles?.display_name || dataset.profiles?.username}` : `您已关注${dataset.profiles?.display_name || dataset.profiles?.username}`
      })
    } catch (error) {
      console.error('Error updating follow status:', error)
      toast({
        title: '操作失败',
        description: '关注操作失败，请稍后再试',
        variant: 'destructive'
      })
    }
  }

  // 处理下载
  const handleDownload = async () => {
    if (!user) {
      toast({
        title: '请先登录',
        description: '下载功能需要登录后使用',
        variant: 'destructive'
      })
      return
    }

    setIsDownloading(true)

    try {
      const response = await fetch(`/api/datasets/${id}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to process download')
      }
      
      const data = await response.json()
      
      if (data.success) {
        // 更新下载次数
        setDownloadCount(prev => prev + 1)
        
        // 触发下载
        const link = document.createElement('a')
        link.href = data.downloadUrl
        link.download = dataset.file_name || dataset.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        toast({
          title: '下载成功',
          description: '数据集下载已开始'
        })
      } else {
        throw new Error(data.message || 'Download failed')
      }
    } catch (error) {
      console.error('Error downloading dataset:', error)
      toast({
        title: '下载失败',
        description: '下载操作失败，请稍后再试',
        variant: 'destructive'
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: dataset?.name,
        text: dataset?.description,
        url: window.location.href,
      })
    } else {
      // 复制链接到剪贴板
      navigator.clipboard.writeText(window.location.href)
      // 这里可以添加一个toast提示
    }
  }

  const toggleAudioPlay = async () => {
    console.log('toggleAudioPlay called, isPlaying:', isPlaying, 'audioUrl:', audioUrl)

    if (!audioRef.current) {
      console.error('Audio ref is null')
      return
    }

    if (!audioUrl) {
      console.error('Audio URL is null')
      return
    }

    try {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
        console.log('Audio paused')
      } else {
        setIsAudioLoading(true)
        await audioRef.current.play()
        setIsPlaying(true)
        setIsAudioLoading(false)
        console.log('Audio playing')
      }
    } catch (error) {
      console.error('音频播放失败:', error)
      setIsPlaying(false)
      setIsAudioLoading(false)
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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '未知大小'

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // 页面加载时获取数据
  useEffect(() => {
    if (!initialDataset) {
      fetchDataset()
    } else {
      // 如果有初始数据，设置初始状态
      setIsLiked(initialDataset.isLiked || false)
      setIsCollected(initialDataset.isCollected || false)
      setLikeCount(initialDataset.like_count || 0)
      setCollectionCount(initialDataset.collection_count || 0)
      setDownloadCount(initialDataset.download_count || 0)
      
      // 如果是语音类型且有音频文件，设置音频URL
      if (initialDataset.type === 'voice' && initialDataset.audio_url) {
        setAudioUrl(initialDataset.audio_url)
      }
    }
  }, [id, initialDataset])

  // 当用户信息或数据集ID变化时，获取点赞和收藏状态
  useEffect(() => {
    if (id) {
      fetchLikeAndCollectionStatus()
    }
  }, [id, user])

  // 获取关注状态
  const fetchFollowStatus = async () => {
    if (!user || !dataset || user.id === dataset.user_id) return

    try {
      const response = await fetch(`/api/datasets/${id}/follow?userId=${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setIsFollowing(data.following || false)
      }
    } catch (error) {
      console.error('获取关注状态失败:', error)
    }
  }

  // 当用户信息和数据集加载完成后，获取关注状态
  useEffect(() => {
    if (user && dataset) {
      fetchFollowStatus()
    }
  }, [user, dataset])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">获取数据集失败</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <div className="flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>
            重试
          </Button>
          <Button variant="outline" onClick={() => router.push('/datasets')}>
            返回数据集列表
          </Button>
        </div>
      </div>
    )
  }

  if (!dataset) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">数据集不存在</h2>
        <p className="text-muted-foreground mb-4">您查找的数据集可能已被删除或不存在</p>
        <Button onClick={() => router.push('/datasets')}>
          返回数据集列表
        </Button>
      </div>
    )
  }

  // 根据数据集类型获取标签颜色
  const getTagColor = (type: string) => {
    switch (type) {
      case 'voice': return 'bg-purple-100 text-purple-700 hover:bg-purple-200';
      case 'image': return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
      case 'text': return 'bg-green-100 text-green-700 hover:bg-green-200';
      default: return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* 返回按钮 */}
      <Button 
        variant="ghost" 
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回
      </Button>

      {/* 数据集头部信息 */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* 封面图 - 增加层次感和圆角 */}
        <div className="md:w-1/3">
          <div className="aspect-video rounded-[12px] overflow-hidden bg-muted shadow-lg transition-all duration-300 hover:shadow-xl relative">
            {dataset.cover_image_url ? (
              <div className="relative w-full h-full">
                <img 
                  src={dataset.cover_image_url} 
                  alt={dataset.name}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
                {/* 添加渐变遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* 基本信息 */}
        <div className="md:w-2/3 space-y-5">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Badge className={getTagColor(dataset.type)}>{getTypeLabel(dataset.type)}</Badge>
              <Badge variant="outline">{getCategoryLabel(dataset.content_category)}</Badge>
              {dataset.is_paid && (
                <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-200">${dataset.price} USD</Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold font-sans tracking-tight">{dataset.name}</h1>
          </div>

          <p className="text-muted-foreground text-base leading-relaxed">{dataset.description}</p>

          {/* 标签 */}
          {dataset.tags && dataset.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dataset.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* 统计信息 - 更紧凑的展示 */}
          <div className="flex items-center flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              {dataset.view_count || 0} 浏览
            </div>
            <div className="flex items-center gap-1.5">
              <Download className="h-4 w-4" />
              {downloadCount} 下载
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="h-4 w-4" />
              {likeCount} 点赞
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(dataset.created_at)}
            </div>
          </div>

          {/* 操作按钮 - 视觉统一，主次分明 */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button 
              onClick={handleDownload} 
              disabled={isDownloading}
              className="rounded-full px-6 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? '处理中...' : (dataset.is_paid ? '购买' : '下载')}
              {dataset.file_type && !isDownloading && dataset.file_type !== 'unknown' && (
                <span className="ml-2 text-xs opacity-90">{dataset.file_type.toUpperCase()}</span>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleLike}
              className={`rounded-full px-5 py-2.5 border border-gray-200 transition-all duration-300 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 ${isLiked ? 'text-red-500 border-red-200 hover:bg-red-50' : ''}`}
            >
              <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              {isLiked ? '已点赞' : '点赞'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCollection}
              className={`rounded-full px-5 py-2.5 border border-gray-200 transition-all duration-300 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 ${isCollected ? 'text-blue-500 border-blue-200 hover:bg-blue-50' : ''}`}
            >
              <Bookmark className={`mr-2 h-4 w-4 ${isCollected ? 'fill-blue-500 text-blue-500' : ''}`} />
              {isCollected ? '已收藏' : '收藏'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleShare}
              className="rounded-full px-5 py-2.5 border border-gray-200 transition-all duration-300 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
            >
              <Share2 className="mr-2 h-4 w-4" />
              分享
            </Button>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* 详细信息标签页 - 改为顶部固定 */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md py-4 border-b border-input/20 -mx-4 px-4 mb-6">
        <Tabs defaultValue="details" className="w-full max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 rounded-full p-1">
            <TabsTrigger 
              value="details" 
              className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-300"
            >
              详细信息
            </TabsTrigger>
            <TabsTrigger 
              value="preview" 
              className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-300"
            >
              预览
            </TabsTrigger>
            <TabsTrigger 
              value="author" 
              className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-300"
            >
              作者信息
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 pt-2">
          <Card className="rounded-[16px] shadow-md overflow-hidden border border-input/30 transition-all duration-300 hover:shadow-lg">
            <CardHeader className="bg-background/50 border-b border-input/20">
              <div className="flex justify-between items-center w-full">
                <div>
                  <CardTitle>数据集详情</CardTitle>
                  <CardDescription>
                    查看数据集的详细信息和属性
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* 信息卡改进 - 更结构化的展示 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-muted/50 transition-colors duration-200">
                  <div className="p-2 rounded-full bg-purple-100 text-purple-700">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">类型</div>
                    <div className="font-medium">{getTypeLabel(dataset.type)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-muted/50 transition-colors duration-200">
                  <div className="p-2 rounded-full bg-blue-100 text-blue-700">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">分类</div>
                    <div className="font-medium">{getCategoryLabel(dataset.content_category)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-muted/50 transition-colors duration-200">
                  <div className="p-2 rounded-full bg-green-100 text-green-700">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">文件大小</div>
                    <div className="font-medium">{formatFileSize(dataset.file_size)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-muted/50 transition-colors duration-200">
                  <div className="p-2 rounded-full bg-amber-100 text-amber-700">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">文件类型</div>
                    <div className="font-medium">{dataset.file_type || '未知'}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-muted/50 transition-colors duration-200">
                  <div className="p-2 rounded-full bg-indigo-100 text-indigo-700">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">创建时间</div>
                    <div className="font-medium">{formatDate(dataset.created_at)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-muted/50 transition-colors duration-200">
                  <div className="p-2 rounded-full bg-red-100 text-red-700">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">更新时间</div>
                    <div className="font-medium">{formatDate(dataset.updated_at)}</div>
                  </div>
                </div>
              </div>

              {dataset.description && (
                <div>
                  <h4 className="font-medium mb-2">描述</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {dataset.description}
                  </p>
                </div>
              )}

              {dataset.tags && dataset.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">标签</h4>
                  <div className="flex flex-wrap gap-2">
                    {dataset.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6 pt-2">
          <Card className="rounded-[16px] shadow-md overflow-hidden border border-input/30 transition-all duration-300 hover:shadow-lg">
            <CardHeader className="bg-background/50 border-b border-input/20">
              <div className="flex justify-between items-center w-full">
                <div>
                  <CardTitle>数据集预览</CardTitle>
                  <CardDescription>
                    预览数据集中的部分内容
                  </CardDescription>
                </div>
                {dataset.type === 'voice' && (
                  <Button variant="ghost" size="sm" className="text-sm text-primary hover:text-primary/80">
                    试听更多片段
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {dataset.type === 'voice' ? (
                <div className="space-y-5">
                  {audioUrl ? (
                    <>
                      <div className="flex items-center gap-4">
                        {/* 优化播放按钮样式 */}
                        <Button 
                          variant="default" 
                          size="icon" 
                          onClick={toggleAudioPlay}
                          disabled={isAudioLoading}
                          className={`rounded-full h-12 w-12 transition-transform duration-300 hover:scale-110 ${isPlaying ? 'bg-pink-600 hover:bg-pink-700' : 'bg-pink-500 hover:bg-pink-600'}`}
                        >
                          {isAudioLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          ) : isPlaying ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5 ml-0.5" />
                          )}
                        </Button>
                        <div className="flex items-center gap-2">
                          <Volume2 className="h-4 w-4 text-muted-foreground" />
                          <span>音频预览</span>
                        </div>
                      </div>
                      {/* 音频播放器 - 带样式 */}
                      <div className="bg-muted/30 p-4 rounded-[12px] border border-input/20">
                        {/* 波形可视化占位区域 */}
                        <div className="h-16 mb-4 bg-muted/50 rounded-lg flex items-center justify-center">
                          <div className="flex space-x-1.5">
                            {[...Array(20)].map((_, i) => (
                              <div 
                                key={i} 
                                className={`h-8 bg-primary/20 rounded-sm transition-all duration-100 ${isPlaying ? 'animate-pulse' : ''}`}
                                style={{ width: `${Math.random() * 8 + 4}px`, height: `${Math.random() * 30 + 10}px` }}
                              ></div>
                            ))}
                          </div>
                        </div>
                        
                        <audio 
                          ref={audioRef}
                          src={audioUrl}
                          onEnded={() => setIsPlaying(false)}
                          onError={(e) => {
                            console.error('音频加载错误:', e)
                            setIsPlaying(false)
                            setIsAudioLoading(false)
                          }}
                          onLoadStart={() => {
                            console.log('音频开始加载')
                            setIsAudioLoading(true)
                          }}
                          onCanPlay={() => {
                            console.log('音频可以播放')
                            setIsAudioLoading(false)
                          }}
                          className="w-full"
                          preload="metadata"
                        />
                      </div>
                      
                      <Button variant="secondary" size="sm" className="rounded-full">
                        <Download className="mr-2 h-4 w-4" />
                        下载样本
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-10">
                      <Volume2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-60" />
                      <p className="text-base text-muted-foreground mb-2">此数据集暂无音频预览</p>
                      <p className="text-sm text-muted-foreground">请下载数据集后查看完整内容</p>
                      <Button variant="outline" className="mt-4 rounded-full">
                        <Download className="mr-2 h-4 w-4" />
                        下载数据集
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-60" />
                  <p className="text-base">此数据集类型不支持预览</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="author" className="space-y-6 pt-2">
            <Card className="rounded-[16px] shadow-md overflow-hidden border border-input/30 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="bg-background/50 border-b border-input/20">
                <div className="flex justify-between items-center w-full">
                  <div>
                    <CardTitle>作者信息</CardTitle>
                    <CardDescription>
                      了解数据集作者及其其他作品
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* 作者信息模块补充 */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
                  <Avatar className="h-16 w-16 ring-2 ring-primary/10">
                    <AvatarImage src={dataset.profiles?.avatar_url} />
                    <AvatarFallback>
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold font-sans">{dataset.profiles?.display_name || dataset.profiles?.username || '未知用户'}</h3>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="rounded-full bg-primary hover:bg-primary/90"
                        onClick={handleFollowAuthor}
                      >
                        {isFollowing ? '已关注' : '关注'}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {dataset.is_original ? '原创作者' : `转载自: ${dataset.original_author || '未知'}`}
                    </p>
                    {/* 作者简介 - 模拟数据 */}
                    <p className="text-sm text-foreground">
                      {dataset.profiles?.display_name || dataset.profiles?.username ? `${dataset.profiles?.display_name || dataset.profiles?.username} 是一位专注于AI数据创作的内容创作者，致力于提供高质量的数据集资源。` : '这位用户还没有设置个人简介。'}
                    </p>
                  </div>
                </div>
                
                {/* 作者其他数据集推荐 */}
                <div className="mt-8">
                  <h4 className="font-medium text-base mb-4 flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    更多来自此作者的数据集
                  </h4>
                  {authorDatasets.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {authorDatasets.map((authorDataset) => (
                          <Link key={authorDataset.id} href={`/datasets/${authorDataset.id}`}>
                            <Card className="rounded-[12px] overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer">
                              <div className="aspect-video bg-muted flex items-center justify-center relative">
                                {authorDataset.cover_image_url ? (
                                  <img 
                                    src={authorDataset.cover_image_url} 
                                    alt={authorDataset.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <FileText className="h-8 w-8 text-muted-foreground" />
                                )}
                                <Badge className="absolute top-2 right-2 text-xs">
                                  {authorDataset.type}
                                </Badge>
                              </div>
                              <CardContent className="p-4">
                                <h5 className="font-medium text-sm line-clamp-1">{authorDataset.name}</h5>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {authorDataset.description || '这个数据集暂无描述'}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {authorDataset.view_count || 0}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Heart className="h-3 w-3" />
                                    {authorDataset.like_count || 0}
                                  </div>
                                  {authorDataset.is_paid && (
                                    <Badge variant="secondary" className="text-xs">
                                      ${authorDataset.price} USD
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                      <Link href={`/profile/${dataset.user_id}`}>
                        <Button variant="ghost" className="w-full mt-4 text-primary hover:text-primary/80">
                          查看全部
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-60" />
                      <p className="text-sm">该作者暂无其他数据集</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}