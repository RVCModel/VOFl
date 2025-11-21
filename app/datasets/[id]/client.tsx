"use client"

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from '@/components/locale-provider'
import { translations } from '@/lib/i18n'
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
  preview_audio_urls?: string[]
  preview_texts?: string[]
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
  const { user, session } = useAuth()
  const { locale } = useLocale()
  const t = translations[locale]
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
        
      }
      
      const response = await fetch(`/api/datasets/${id}?${params.toString()}` , {
        headers: session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : undefined,
      })
      
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
        ? `/api/datasets/like?datasetId=${id}`
        : `/api/datasets/like?datasetId=${id}`
      
      const likeResponse = await fetch(likeUrl, {
        headers: session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : undefined,
      })
      if (likeResponse.ok) {
        const likeData = await likeResponse.json()
        setIsLiked(likeData.isLiked || false)
        setLikeCount(likeData.likeCount || 0)
      }

      // 获取收藏状态和数量
      const collectionUrl = user 
        ? `/api/datasets/collection?datasetId=${id}`
        : `/api/datasets/collection?datasetId=${id}`
      
      const collectionResponse = await fetch(collectionUrl, {
        headers: session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : undefined,
      })
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
        title: t.datasetDetail.loginRequired,
        description: t.datasetDetail.likeLoginRequired,
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch('/api/datasets/like', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({ datasetId: id }) })
      
      if (!response.ok) {
        throw new Error('Failed to update like status')
      }
      
      const data = await response.json()
      setIsLiked(data.isLiked)
      setLikeCount(data.likeCount)
      
      toast({
        title: data.isLiked ? t.datasetDetail.likeSuccess : t.datasetDetail.unlikeSuccess,
        description: data.isLiked ? t.datasetDetail.likeThanks : t.datasetDetail.unlikeDescription
      })
    } catch (error) {
      console.error('Error updating like status:', error)
      toast({
        title: t.datasetDetail.operationFailed,
        description: t.datasetDetail.likeOperationFailed,
        variant: 'destructive'
      })
    }
  }

  // 处理收藏
  const handleCollection = async () => {
    if (!user) {
      toast({
        title: t.datasetDetail.loginRequired,
        description: t.datasetDetail.collectionLoginRequired,
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch('/api/datasets/collection', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({ datasetId: id }) })
      
      if (!response.ok) {
        throw new Error('Failed to update collection status')
      }
      
      const data = await response.json()
      setIsCollected(data.isCollected)
      setCollectionCount(data.collectionCount)
      
      toast({
        title: data.isCollected ? t.datasetDetail.collectSuccess : t.datasetDetail.uncollectSuccess,
        description: data.isCollected ? t.datasetDetail.collectionAdded : t.datasetDetail.uncollectionDescription
      })
    } catch (error) {
      console.error('Error updating collection status:', error)
      toast({
        title: t.datasetDetail.operationFailed,
        description: t.datasetDetail.collectionOperationFailed,
        variant: 'destructive'
      })
    }
  }

  // 处理关注作者
  const handleFollowAuthor = async () => {
    if (!user) {
      toast({
        title: t.datasetDetail.loginRequired,
        description: t.datasetDetail.followLoginRequired,
        variant: 'destructive'
      })
      return
    }

    try {
      const action = isFollowing ? 'unfollow' : 'follow'
      const response = await fetch(`/api/datasets/${id}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          action
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update follow status')
      }
      
      const data = await response.json()
      setIsFollowing(data.following)
      
      toast({
        title: isFollowing ? t.datasetDetail.unfollowSuccess : t.datasetDetail.followSuccess,
        description: isFollowing ? t.datasetDetail.unfollowDescription.replace('{author}', dataset.profiles?.display_name || dataset.profiles?.username) : t.datasetDetail.followDescription.replace('{author}', dataset.profiles?.display_name || dataset.profiles?.username)
      })
    } catch (error) {
      console.error('Error updating follow status:', error)
      toast({
        title: t.datasetDetail.operationFailed,
        description: t.datasetDetail.followOperationFailed,
        variant: 'destructive'
      })
    }
  }

  // 处理下载
  const handleDownload = async () => {
    if (!user) {
      toast({
        title: t.datasetDetail.loginRequired,
        description: t.datasetDetail.downloadLoginRequired,
        variant: 'destructive'
      })
      return
    }

    setIsDownloading(true)

    try {
      const response = await fetch(`/api/datasets/${id}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          datasetId: id
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
          title: t.datasetDetail.downloadSuccess,
          description: t.datasetDetail.downloadStarted
        })
      } else {
        throw new Error(data.message || 'Download failed')
      }
    } catch (error) {
      console.error('Error downloading dataset:', error)
      toast({
        title: t.datasetDetail.downloadFailed,
        description: t.datasetDetail.downloadOperationFailed,
        variant: 'destructive'
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: dataset?.name,
          text: dataset?.description,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast({
          title: t.datasetDetail.linkCopied,
          description: t.datasetDetail.linkCopiedDescription
        })
      }
    } catch (error) {
      console.error('Error sharing:', error)
      toast({
        title: t.datasetDetail.shareFailed,
        description: t.datasetDetail.shareFailedDescription,
        variant: 'destructive'
      })
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
      'ip_anime': t.datasetDetail.ipAnime,
      'explanation': t.datasetDetail.explanation,
      'character': t.datasetDetail.character,
      'game': t.datasetDetail.game,
      'other': t.datasetDetail.other
    }
    return categories[category] || category
  }

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'voice': t.datasetDetail.voice,
      'text': t.datasetDetail.text,
      'image': t.datasetDetail.image,
      'other': t.datasetDetail.other
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
      const response = await fetch(`/api/datasets/${id}/follow`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
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
        <h2 className="text-2xl font-bold mb-2">{t.datasetDetail.fetchFailed}</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <div className="flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>
            {t.datasetDetail.retry}
          </Button>
          <Button variant="outline" onClick={() => router.push('/datasets')}>
            {t.datasetDetail.backToDatasets}
          </Button>
        </div>
      </div>
    )
  }

  if (!dataset) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">{t.datasetDetail.notFound}</h2>
        <p className="text-muted-foreground mb-4">{t.datasetDetail.notFoundDescription}</p>
        <Button onClick={() => router.push('/datasets')}>
          {t.datasetDetail.backToDatasets}
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
        {t.datasetDetail.back}
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
              {dataset.view_count || 0} {t.datasetDetail.views}
            </div>
            <div className="flex items-center gap-1.5">
              <Download className="h-4 w-4" />
              {downloadCount} {t.datasetDetail.downloads}
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="h-4 w-4" />
              {likeCount} {t.datasetDetail.likes}
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
              {isDownloading ? t.datasetDetail.processing : (dataset.is_paid ? t.datasetDetail.purchaseAndDownload : t.datasetDetail.download)}
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
              {isLiked ? t.datasetDetail.liked : t.datasetDetail.like}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCollection}
              className={`rounded-full px-5 py-2.5 border border-gray-200 transition-all duration-300 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 ${isCollected ? 'text-blue-500 border-blue-200 hover:bg-blue-50' : ''}`}
            >
              <Bookmark className={`mr-2 h-4 w-4 ${isCollected ? 'fill-blue-500 text-blue-500' : ''}`} />
              {isCollected ? t.datasetDetail.collected : t.datasetDetail.collect}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleShare}
              className="rounded-full px-5 py-2.5 border border-gray-200 transition-all duration-300 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
            >
              <Share2 className="mr-2 h-4 w-4" />
              {t.datasetDetail.share}
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
              {t.datasetDetail.tabs.details}
            </TabsTrigger>
            <TabsTrigger 
              value="preview" 
              className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-300"
            >
              {t.datasetDetail.tabs.preview}
            </TabsTrigger>
            <TabsTrigger 
              value="author" 
              className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-300"
            >
              {t.datasetDetail.tabs.author}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 pt-2">
          <Card className="rounded-[16px] shadow-md overflow-hidden border border-input/30 transition-all duration-300 hover:shadow-lg">
            <CardHeader className="bg-background/50 border-b border-input/20">
              <div className="flex justify-between items-center w-full">
                <div>
                  <CardTitle>{t.datasetDetail.datasetDetails}</CardTitle>
                  <CardDescription>
                    {t.datasetDetail.viewDatasetDetails}
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
                    <div className="text-xs text-muted-foreground">{t.datasetDetail.type}</div>
                    <div className="font-medium">{getTypeLabel(dataset.type)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-muted/50 transition-colors duration-200">
                  <div className="p-2 rounded-full bg-blue-100 text-blue-700">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t.datasetDetail.category}</div>
                    <div className="font-medium">{getCategoryLabel(dataset.content_category)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-muted/50 transition-colors duration-200">
                  <div className="p-2 rounded-full bg-green-100 text-green-700">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t.datasetDetail.fileSize}</div>
                    <div className="font-medium">{formatFileSize(dataset.file_size)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-muted/50 transition-colors duration-200">
                  <div className="p-2 rounded-full bg-amber-100 text-amber-700">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t.datasetDetail.fileType}</div>
                    <div className="font-medium">{dataset.file_type || t.datasetDetail.unknown}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-muted/50 transition-colors duration-200">
                  <div className="p-2 rounded-full bg-indigo-100 text-indigo-700">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t.datasetDetail.createdAt}</div>
                    <div className="font-medium">{formatDate(dataset.created_at)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-muted/50 transition-colors duration-200">
                  <div className="p-2 rounded-full bg-red-100 text-red-700">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t.datasetDetail.updatedAt}</div>
                    <div className="font-medium">{formatDate(dataset.updated_at)}</div>
                  </div>
                </div>
              </div>

              {dataset.description && (
                <div>
                  <h4 className="font-medium mb-2">{t.datasetDetail.description}</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {dataset.description}
                  </p>
                </div>
              )}

              {dataset.tags && dataset.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">{t.datasetDetail.tags}</h4>
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
                  <CardTitle>{t.datasetDetail.datasetPreview}</CardTitle>
                  <CardDescription>
                    {t.datasetDetail.previewDescription}
                  </CardDescription>
                </div>
                {dataset.type === 'voice' && (
                  <Button variant="ghost" size="sm" className="text-sm text-primary hover:text-primary/80">
                    {t.datasetDetail.listenMore}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {dataset.type === 'voice' &&
                Array.isArray(dataset.preview_audio_urls) &&
                dataset.preview_audio_urls.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {dataset.preview_audio_urls.map((url, index) => {
                      const text =
                        dataset.preview_texts?.[index] ||
                        t.datasetDetail.noAudioPreview
                      return (
                        <div
                          key={index}
                          className="rounded-2xl border border-input/40 bg-card/95 px-4 py-3 md:px-5 md:py-4 flex flex-col md:flex-row md:items-stretch gap-4"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                              <span className="font-medium">
                                audio · #{index + 1}
                              </span>
                              <span className="opacity-70">preview</span>
                            </div>
                            <audio
                              controls
                              src={url}
                              className="w-full mt-1"
                              preload="metadata"
                            />
                          </div>

                          <div className="md:w-1/2 md:border-l border-t md:border-t-0 border-dashed border-input/40 md:pl-4 pt-3 md:pt-0">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                              text
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">
                              {text}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

              {dataset.type === 'voice' && false &&
                Array.isArray(dataset.preview_audio_urls) &&
                dataset.preview_audio_urls.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {dataset.preview_audio_urls.map((url, index) => {
                      const text =
                        dataset.preview_texts?.[index] ||
                        t.datasetDetail.noAudioPreview
                      return (
                        <div
                          key={index}
                          className="rounded-[12px] border border-input/30 bg-muted/30 p-4 space-y-3"
                        >
                          <div className="grid grid-cols-2 gap-4 text-[11px] text-muted-foreground">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold uppercase tracking-wide">
                                  audio
                                </span>
                                <span className="opacity-70">
                                  duration (s)
                                </span>
                              </div>
                              <div className="flex items-end gap-1 h-10">
                                {Array.from({ length: 8 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="w-1.5 rounded-sm bg-primary/25"
                                    style={{
                                      height: `${6 + (i % 4) * 6}px`,
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold uppercase tracking-wide">
                                  text
                                </span>
                                <span className="opacity-70">
                                  string · lengths
                                </span>
                              </div>
                              <div className="flex items-end gap-1 h-10">
                                {Array.from({ length: 8 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="w-1.5 rounded-sm bg-muted-foreground/30"
                                    style={{
                                      height: `${4 + ((i + 3) % 5) * 5}px`,
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 items-center pt-2 border-t border-dashed border-input/40">
                            <audio
                              controls
                              src={url}
                              className="w-full"
                              preload="metadata"
                            />
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                              {text}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

              {dataset.type === 'voice' &&
              (!Array.isArray(dataset.preview_audio_urls) ||
                dataset.preview_audio_urls.length === 0) ? (
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
                          <span>{t.datasetDetail.audioPreview}</span>
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
                        {t.datasetDetail.downloadSample}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-10">
                      <Volume2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-60" />
                      <p className="text-base text-muted-foreground mb-2">{t.datasetDetail.noAudioPreview}</p>
                      <p className="text-sm text-muted-foreground">{t.datasetDetail.downloadToView}</p>
                      <Button variant="outline" className="mt-4 rounded-full">
                        <Download className="mr-2 h-4 w-4" />
                        {t.datasetDetail.download}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                dataset.type !== 'voice' && (
                  <div className="text-center py-10 text-muted-foreground">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-60" />
                    <p className="text-base">{t.datasetDetail.noPreviewSupport}</p>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="author" className="space-y-6 pt-2">
            <Card className="rounded-[16px] shadow-md overflow-hidden border border-input/30 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="bg-background/50 border-b border-input/20">
                <div className="flex justify-between items-center w-full">
                  <div>
                    <CardTitle>{t.datasetDetail.authorInfo}</CardTitle>
                    <CardDescription>
                      {t.datasetDetail.authorDescription}
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
                      <h3 className="text-xl font-bold font-sans">{dataset.profiles?.display_name || dataset.profiles?.username || t.datasetDetail.unknownUser}</h3>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="rounded-full bg-primary hover:bg-primary/90"
                        onClick={handleFollowAuthor}
                      >
                        {isFollowing ? t.datasetDetail.following : t.datasetDetail.follow}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {dataset.is_original ? t.datasetDetail.originalAuthor : `${t.datasetDetail.repostedFrom}: ${dataset.original_author || t.datasetDetail.unknown}`}
                    </p>
                    {/* 作者简介 - 模拟数据 */}
                    <p className="text-sm text-foreground">
                      {dataset.profiles?.display_name || dataset.profiles?.username ? `${dataset.profiles?.display_name || dataset.profiles?.username} ${t.datasetDetail.authorBio}` : t.datasetDetail.noAuthorBio}
                    </p>
                  </div>
                </div>
                
                {/* 作者其他数据集推荐 */}
                <div className="mt-8">
                  <h4 className="font-medium text-base mb-4 flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    {t.datasetDetail.moreFromAuthor}
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
                                  {authorDataset.description || t.datasetDetail.noDatasetDescription}
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
                          {t.datasetDetail.viewAll}
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-60" />
                      <p className="text-sm">{t.datasetDetail.noOtherDatasets}</p>
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