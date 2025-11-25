"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLocale } from '@/components/locale-provider'
import { translations } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth-context'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { 
  Download, 
  Play, 
  Pause, 
  Heart, 
  Share2, 
  User, 
  Users,
  Clock,
  Tag,
  FileAudio,
  Volume2,
  MessageCircle,
  Send,
  Reply,
  Bookmark,
  BookmarkCheck
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useEffect as useClientEffect } from 'react'

interface Model {
  id: string
  name: string
  content_category: string
  type: string
  tags: string[]
  description: string
  visibility: string
  is_paid: boolean
  price: number | null
  cover_image_url: string
  reference_audio_url: string
  demo_audio_url: string
  user_id: string
  status: string
  created_at: string
  updated_at: string
  download_count: number
  view_count: number
  like_count: number
  collection_count: number
  is_original: boolean
  original_author: string | null
  profiles?: {
    username: string
    display_name?: string
    avatar_url: string
    followers_count: number
    following_count: number
  }
}

interface Comment {
  id: string
  content: string
  user_id: string
  model_id: string
  parent_id: string | null
  created_at: string
  profiles?: {
    username: string
    display_name?: string
    avatar_url: string
  }
  replies?: Comment[]
}

interface ModelDetailClientProps {
  initialModel: Model
  searchParams?: { [key: string]: string | string[] | undefined }
}

export default function ModelDetailClient({ initialModel, searchParams }: ModelDetailClientProps) {
  const { locale } = useLocale()
  const t = translations[locale]
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [model, setModel] = useState<Model | null>(initialModel)
  const [isLoading, setIsLoading] = useState(false) // 初始数据已加载，所以设为false
  const [isPlayingReference, setIsPlayingReference] = useState(false)
  const [isPlayingDemo, setIsPlayingDemo] = useState(false)
  const [referenceAudio, setReferenceAudio] = useState<HTMLAudioElement | null>(null)
  const [demoAudio, setDemoAudio] = useState<HTMLAudioElement | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  
  // 评论相关状态
  const [comments, setComments] = useState<Comment[]>([])
  const [commentContent, setCommentContent] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  // 使用Map来管理每个评论的回复内容
  const [replyContents, setReplyContents] = useState<Map<string, string>>(new Map())
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  
  // 点赞和收藏相关状态
  const [isLiked, setIsLiked] = useState(false)
  const [isCollected, setIsCollected] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [collectionCount, setCollectionCount] = useState(0)
  const [isProcessingLike, setIsProcessingLike] = useState(false)
  const [isProcessingCollection, setIsProcessingCollection] = useState(false)

  useEffect(() => {
    if (id) {
      // 初始数据已在服务端获取，这里只需要获取评论
      fetchComments()
      // 获取点赞和收藏状态
      fetchLikeAndCollectionStatus()
    }
  }, [id])

  // 检查关注状态
  const fetchFollowStatus = async () => {
    if (!user || !model || user.id === model.user_id) return
    
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const response = await fetch(`/api/follow/check?followingId=${model.user_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setIsFollowing(data.isFollowing || false)
      }
    } catch (error) {
      console.error('获取关注状态失败:', error)
    }
  }

  // 当用户信息和模型加载完成后，获取关注状态
  useEffect(() => {
    if (user && model) {
      fetchFollowStatus()
    }
  }, [user, model])

  // 动态设置页面标题
  useEffect(() => {
    if (model && model.name) {
      document.title = `${model.name}-VOFL-语音合成模型平台`
    }
  }, [model])

  // 获取点赞和收藏状态
  const fetchLikeAndCollectionStatus = async () => {
    if (!id) return
    
    try {
      // 获取点赞状态
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // 用户已登录，获取点赞状态和总数
        const likeResponse = await fetch(`/api/models/like?modelId=${id}&userId=${session.user.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        if (likeResponse.ok) {
          const likeData = await likeResponse.json()
          setIsLiked(likeData.isLiked)
          setLikeCount(likeData.likeCount || 0)
        }
        
        // 获取收藏状态和总数
        const collectionResponse = await fetch(`/api/models/collection?modelId=${id}&userId=${session.user.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        if (collectionResponse.ok) {
          const collectionData = await collectionResponse.json()
          setIsCollected(collectionData.isCollected)
          setCollectionCount(collectionData.collectionCount || 0)
        }
      } else {
        // 用户未登录，只获取总数
        const likeResponse = await fetch(`/api/models/like?modelId=${id}`, {
          method: 'GET'
        })
        
        if (likeResponse.ok) {
          const likeData = await likeResponse.json()
          setLikeCount(likeData.likeCount || 0)
        }
        
        const collectionResponse = await fetch(`/api/models/collection?modelId=${id}`, {
          method: 'GET'
        })
        
        if (collectionResponse.ok) {
          const collectionData = await collectionResponse.json()
          setCollectionCount(collectionData.collectionCount || 0)
        }
      }
    } catch (error) {
      console.error('获取点赞和收藏状态失败:', error)
    }
  }

  const fetchComments = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const headers: Record<string, string> = {}
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/models/${id}/comments`, {
        method: "GET",
        headers,
      })

      if (!response.ok) {
        throw new Error("获取评论失败")
      }

      const { comments } = await response.json()
      setComments(comments || [])
    } catch (error) {
      console.error("获取评论失败:", error)
    }
  }

// 使用useCallback优化处理函数，防止不必要的重新渲染
  const handleCommentSubmit = useCallback(async () => {
    if (!user || !commentContent.trim()) return

    setIsSubmittingComment(true)
    try {
      // 获取当前用户的session token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('未登录')
      }

      const response = await fetch(`/api/models/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          content: commentContent.trim(),
          model_id: id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '提交评论失败')
      }

      setCommentContent('')
      await fetchComments()
    } catch (error) {
      console.error('提交评论失败:', error)
      alert('提交评论失败，请重试')
    } finally {
      setIsSubmittingComment(false)
    }
  }, [user, commentContent, id])

  const handleReplySubmit = useCallback(async (parentId: string) => {
    if (!user || !model) {
      router.push('/login')
      return
    }

    const content = replyContents.get(parentId) || ''
    if (!content.trim()) return

    setIsSubmittingReply(true)
    try {
      const response = await fetch(`/api/models/${model.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          parent_id: parentId,
        }),
      })

      if (response.ok) {
        // 清空该评论的回复内容
        setReplyContents(prev => {
          const newMap = new Map(prev)
          newMap.delete(parentId)
          return newMap
        })
        setReplyingTo(null)
        fetchComments() // 重新获取评论列表
      } else {
        alert('回复失败，请重试')
      }
    } catch (error) {
      console.error('回复失败:', error)
      alert('回复失败，请重试')
    } finally {
      setIsSubmittingReply(false)
    }
  }, [user, model, replyContents, replyingTo])

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!user) return

    try {
      // 获取当前用户的session token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('未登录')
      }

      // 调用新的API端点删除评论
      const response = await fetch(`/api/models/${id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '删除评论失败')
      }

      await fetchComments()
    } catch (error) {
      console.error('删除评论失败:', error)
      alert(`删除评论失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, [user, id])

  const handleDownload = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!model) return

    setIsDownloading(true)
    try {
      // 获取当前用户的session token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('未登录')
      }

      // 调用新的下载API端点
      const response = await fetch(`/api/models/${model.id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '下载失败')
      }

      const data = await response.json()
      
      // 触发下载
      window.open(data.download_url, '_blank')
    } catch (error) {
      console.error('下载失败:', error)
      alert(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsDownloading(false)
    }
  }

  // 初始化音频元素
  useEffect(() => {
    if (model?.reference_audio_url) {
      const audio = new Audio(model.reference_audio_url)
      audio.addEventListener('ended', () => setIsPlayingReference(false))
      setReferenceAudio(audio)
    }
    
    if (model?.demo_audio_url) {
      const audio = new Audio(model.demo_audio_url)
      audio.addEventListener('ended', () => setIsPlayingDemo(false))
      setDemoAudio(audio)
    }
    
    return () => {
      if (referenceAudio) {
        referenceAudio.pause()
        referenceAudio.removeEventListener('ended', () => setIsPlayingReference(false))
      }
      if (demoAudio) {
        demoAudio.pause()
        demoAudio.removeEventListener('ended', () => setIsPlayingDemo(false))
      }
    }
  }, [model])

  const togglePlayReference = () => {
    if (!referenceAudio) return
    
    if (isPlayingReference) {
      referenceAudio.pause()
      setIsPlayingReference(false)
    } else {
      // 如果演示音频正在播放，先停止它
      if (isPlayingDemo && demoAudio) {
        demoAudio.pause()
        setIsPlayingDemo(false)
      }
      referenceAudio.play()
      setIsPlayingReference(true)
    }
  }

  const togglePlayDemo = () => {
    if (!demoAudio) return
    
    if (isPlayingDemo) {
      demoAudio.pause()
      setIsPlayingDemo(false)
    } else {
      // 如果参考音频正在播放，先停止它
      if (isPlayingReference && referenceAudio) {
        referenceAudio.pause()
        setIsPlayingReference(false)
      }
      demoAudio.play()
      setIsPlayingDemo(true)
    }
  }

  const toggleFollow = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!model) return

    // 不能关注自己
    if (user.id === model.user_id) {
      alert('不能关注自己')
      return
    }

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      
      if (isFollowing) {
        // 取消关注
        const response = await fetch(`/api/follow?followingId=${model.user_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '取消关注失败')
        }
      } else {
        // 添加关注
        const response = await fetch('/api/follow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            followingId: model.user_id
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '关注失败')
        }
      }
      
      setIsFollowing(!isFollowing)
    } catch (error) {
      console.error('操作失败:', error)
      alert('操作失败，请重试')
    }
  }

  // 切换点赞状态
  const toggleLike = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!model || isProcessingLike) return

    setIsProcessingLike(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('未登录')
      }

      const response = await fetch(`/api/models/like?modelId=${id}&userId=${session.user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          modelId: id,
          userId: session.user.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setIsLiked(data.isLiked)
        setLikeCount(data.likeCount || 0)
      } else {
        throw new Error('操作失败')
      }
    } catch (error) {
      console.error('点赞操作失败:', error)
      alert('操作失败，请重试')
    } finally {
      setIsProcessingLike(false)
    }
  }

  // 切换收藏状态
  const toggleCollection = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!model || isProcessingCollection) return

    setIsProcessingCollection(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('未登录')
      }

      const response = await fetch(`/api/models/collection?modelId=${id}&userId=${session.user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          modelId: id,
          userId: session.user.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setIsCollected(data.isCollected)
        setCollectionCount(data.collectionCount || 0)
      } else {
        throw new Error('操作失败')
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
      alert('操作失败，请重试')
    } finally {
      setIsProcessingCollection(false)
    }
  }

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      'ip_anime': t.modelDetail.ipAnime,
      'explanation': t.modelDetail.explanation,
      'character': t.modelDetail.character,
      'game': t.modelDetail.game
    }
    return categories[category] || category
  }

  // 独立的回复框组件，避免父组件重新渲染导致焦点丢失
  const ReplyBox = ({ commentId, username }: { commentId: string, username: string }) => {
    // 使用本地状态管理输入内容，完全独立于全局状态
    const [localContent, setLocalContent] = useState('')
    const [isLocalSubmitting, setIsLocalSubmitting] = useState(false)
    
    // 使用useRef来保存commentId，避免在useEffect依赖数组中引起重新渲染
    const commentIdRef = useRef(commentId)
    commentIdRef.current = commentId
    
    // 使用useRef保存textarea的DOM引用，确保焦点稳定
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    
    // 组件挂载时自动获取焦点
    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }, [])
    
    // 从全局状态同步内容，只在组件首次挂载时执行
    useEffect(() => {
      const content = replyContents.get(commentIdRef.current)
      if (content && !localContent) {
        setLocalContent(content)
      }
    }, [replyContents, localContent])
    
    const handleSubmit = async () => {
      if (!localContent.trim()) return
      
      setIsLocalSubmitting(true)
      try {
        // 更新全局状态
        setReplyContents(prev => {
          const newMap = new Map(prev)
          newMap.set(commentIdRef.current, localContent)
          return newMap
        })
        
        // 提交回复
        await handleReplySubmit(commentIdRef.current)
      } finally {
        setIsLocalSubmitting(false)
      }
    }
    
    const handleCancel = () => {
      setReplyingTo(null)
      setReplyContents(prev => {
        const newMap = new Map(prev)
        newMap.delete(commentIdRef.current)
        return newMap
      })
    }
    
    return (
      <div key={`reply-${commentId}`} className="space-y-3 mt-2 p-3 bg-background rounded-[12px] border border-input/30">
        <Textarea
          ref={textareaRef}
          placeholder={`${t.modelDetail.replyTo} ${username}...`}
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          rows={2}
          className="border border-input rounded-[8px] focus:ring-primary transition-all"
          // 移除autoFocus，改用ref手动控制焦点
        />
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="hover:bg-primary/10 transition-colors duration-200"
          >
            {t.modelDetail.cancel}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!localContent.trim() || isLocalSubmitting}
            className="bg-primary hover:bg-primary/90 transition-all duration-200"
          >
            {isLocalSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                {t.modelDetail.sending}
              </>
            ) : (
              <>
                <Send className="h-3 w-3 mr-1" />
                {t.modelDetail.reply}
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // 递归渲染评论组件
  const CommentItem = useMemo(() => {
    return ({ comment, depth = 0 }: { comment: Comment, depth?: number }) => {
      const isModelAuthor = model?.user_id === user?.id  // 当前用户是否是模型作者
      const isCommentAuthor = comment.user_id === user?.id  // 当前用户是否是评论作者
      const canDelete = isModelAuthor || isCommentAuthor  // 模型作者或评论作者可以删除
      const maxDepth = 5 // 限制最大嵌套深度，避免UI过于复杂

      return (
        <div key={comment.id} className="space-y-3">
          {/* 评论内容 */}
          <div className="flex space-x-3">
            <Avatar className="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden shadow-sm cursor-pointer hover:scale-105 transition-transform duration-200">
                    <AvatarImage src={comment.profiles?.avatar_url || '/placeholder-user.jpg'} />
                    <AvatarFallback className="rounded-full">{comment.profiles?.display_name?.charAt(0) || comment.profiles?.username?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium font-[Poppins]">{comment.profiles?.display_name || comment.profiles?.username || t.modelDetail.unknownUser}</span>
                {comment.user_id === model?.user_id && (
                  <Badge variant="secondary" className="text-xs">{t.modelDetail.author}</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { 
                    addSuffix: true, 
                    locale: zhCN 
                  })}
                </span>
              </div>
              <p className="text-sm text-foreground">{comment.content}</p>
              
              {/* 操作按钮 */}
              <div className="flex items-center space-x-2">
                {user && depth < maxDepth && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="h-8 px-2 text-xs hover:bg-primary/10 transition-colors duration-200"
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    {t.modelDetail.reply}
                  </Button>
                )}
                
                {canDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors duration-200"
                      >
                        {t.modelDetail.delete}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.modelDetail.confirmDelete}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t.modelDetail.deleteWarning}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.modelDetail.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteComment(comment.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {t.modelDetail.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {/* 回复框 - 使用独立的ReplyBox组件 */}
              {replyingTo === comment.id && (
                <ReplyBox 
                  commentId={comment.id} 
                  username={comment.profiles?.display_name || comment.profiles?.username || t.modelDetail.unknownUser} 
                />
              )}
            </div>
          </div>

          {/* 嵌套回复 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className={`mt-3 space-y-3 ${depth > 0 ? 'pl-4' : 'pl-4'} border-l-2 border-muted`}>
              {comment.replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      )
    }
  }, [model?.user_id, user?.id, replyingTo, isSubmittingReply, handleDeleteComment, handleReplySubmit])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="text-lg">{t.modelDetail.loading}</span>
          </div>
        </div>
      </div>
    )
  }

  if (!model) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t.modelDetail.modelNotFound}</h1>
          <Button onClick={() => router.push('/models')}>
            {t.modelDetail.backToModels}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-background min-h-screen">
      {/* 封面图与标题区域 */}
      <div className="relative rounded-[16px] overflow-hidden mb-8 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
        <img 
          src={model.cover_image_url || '/placeholder.jpg'} 
          alt={model.name}
          className="w-full h-[200px] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-primary text-white text-xs rounded-full font-medium">
              {t.modelDetail.aiVoiceModel}
            </Badge>
            <Badge variant="secondary">{getCategoryLabel(model.content_category)}</Badge>
            {model.tags && model.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-md font-[Poppins]">{model.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/90 mt-2">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {formatDistanceToNow(new Date(model.created_at), { 
                addSuffix: true, 
                locale: zhCN 
              })}
            </div>
            <div className="flex items-center gap-4">
              {/* 点赞按钮 */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-white/90 hover:text-white hover:bg-white/20"
                onClick={toggleLike}
                disabled={isProcessingLike}
              >
                {isLiked ? (
                  <Heart className="h-4 w-4 mr-1 text-white fill-current" />
                ) : (
                  <Heart className="h-4 w-4 mr-1" />
                )}
                {likeCount || 0}
              </Button>
              {/* 收藏按钮 */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-white/90 hover:text-white hover:bg-white/20"
                onClick={toggleCollection}
                disabled={isProcessingCollection}
              >
                {isCollected ? (
                  <BookmarkCheck className="h-4 w-4 mr-1 text-white fill-current" />
                ) : (
                  <Bookmark className="h-4 w-4 mr-1" />
                )}
                {collectionCount || 0}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：模型信息 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 标签区域 */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{model.type}</Badge>
            {model.tags && model.tags.map((tag, index) => (
              <Badge key={index} variant="outline">{tag}</Badge>
            ))}
          </div>

          {/* 模型介绍 */}
          <Card className="rounded-[16px] overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 border-l-4 border-primary pl-4 font-[Poppins]">
                <FileAudio className="h-5 w-5" />
                {t.modelDetail.modelIntro}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-foreground leading-relaxed">{model.description || t.modelDetail.noIntro}</p>
            </CardContent>
          </Card>

          {/* 评论区 */}
          <Card className="rounded-[16px] overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-[Poppins]">
                <MessageCircle className="h-5 w-5" />
                {t.modelDetail.comments} ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 发表评论 */}
              {user ? (
                <div className="space-y-3">
                  <Textarea
                    placeholder={t.modelDetail.postComment}
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    rows={3}
                    className="border border-input rounded-[12px] focus:ring-primary transition-all"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleCommentSubmit}
                      disabled={!commentContent.trim() || isSubmittingComment}
                      className="bg-primary hover:bg-primary/90 transition-all duration-200"
                    >
                      {isSubmittingComment ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {t.modelDetail.sending}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {t.modelDetail.sendComment}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 bg-muted rounded-[12px]">
                  <p className="text-muted-foreground mb-4">{t.modelDetail.loginToComment}</p>
                  <Button 
                    onClick={() => router.push('/login')}
                    className="bg-primary hover:bg-primary/90 transition-all duration-200"
                  >
                    {t.modelDetail.login}
                  </Button>
                </div>
              )}

              <Separator />

              {/* 评论列表 */}
              <div className="space-y-6">
                {comments.length > 0 ? (
                  comments.map((comment, index) => (
                    <div 
                      key={comment.id} 
                      className={`${index % 2 === 0 ? 'bg-muted/30' : 'bg-white'} p-4 rounded-[12px] transition-all hover:shadow-sm`}
                    >
                      <CommentItem comment={comment} />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">{t.modelDetail.noComments}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：作者信息、音频试听和下载 */}
        <div className="space-y-6">
          {/* 作者信息卡片 */}
          <Card className="rounded-[16px] overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-[Poppins] font-semibold">
                <User className="h-5 w-5" />
                {t.modelDetail.authorInfo}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16 cursor-pointer hover:scale-105 transition-transform duration-200">
                  <AvatarImage src={model.profiles?.avatar_url || '/placeholder-user.jpg'} />
                  <AvatarFallback>{model.profiles?.display_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg text-foreground font-[Poppins]">{model.profiles?.display_name || '未知用户'}</h3>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{t.modelDetail.following}: {model.profiles?.following_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      <span>{t.modelDetail.followers}: {model.profiles?.followers_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => router.push(`/profile/${model.user_id}`)}
                >
                  {t.modelDetail.viewProfile}
                </Button>
                {isFollowing ? (
                  <Button 
                    variant="default"
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200"
                    onClick={toggleFollow}
                  >
                    {t.modelDetail.following}
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    className="flex-1 hover:bg-primary/10 hover:text-primary hover:border-primary transition-all duration-200"
                    onClick={toggleFollow}
                  >
                    {t.modelDetail.follow}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 音频试听 */}
          <div className="space-y-4">
            {/* 参考音频 */}
            <Card className="rounded-[16px] overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-[Poppins] font-semibold">
                  <Volume2 className="h-5 w-5" />
                  {t.modelDetail.referenceAudio}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-32 overflow-hidden rounded-[12px] mb-2">
                  <img 
                    src={model.cover_image_url || '/placeholder.jpg'} 
                    alt={t.modelDetail.referenceAudioCover}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <button
                      onClick={togglePlayReference}
                      className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-transform duration-200 hover:scale-110"
                      aria-label={isPlayingReference ? t.modelDetail.pause : t.modelDetail.play}
                    >
                      {isPlayingReference ? (
                        <Pause className="h-6 w-6 text-primary" />
                      ) : (
                        <Play className="h-6 w-6 text-primary ml-1" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  {t.modelDetail.originalSample}
                </p>
              </CardContent>
            </Card>

            {/* 演示音频 */}
            <Card className="rounded-[16px] overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-[Poppins] font-semibold">
                  <Volume2 className="h-5 w-5" />
                  {t.modelDetail.demoAudio}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-32 overflow-hidden rounded-[12px] mb-2">
                  <img 
                    src={model.cover_image_url || '/placeholder.jpg'} 
                    alt={t.modelDetail.demoAudioCover}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <button
                      onClick={togglePlayDemo}
                      className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-transform duration-200 hover:scale-110"
                      aria-label={isPlayingDemo ? t.modelDetail.pause : t.modelDetail.play}
                    >
                      {isPlayingDemo ? (
                        <Pause className="h-6 w-6 text-primary" />
                      ) : (
                        <Play className="h-6 w-6 text-primary ml-1" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  {t.modelDetail.aiGeneratedSample}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 下载模型 */}
          <Card className="rounded-[16px] overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between font-[Poppins] font-semibold">
                <span>{t.modelDetail.downloadModel}</span>
                {model.is_paid && (
                  <Badge variant="destructive">
                    ${model.price} USD
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>{t.modelDetail.downloadCount}</span>
                <span>{model.download_count || 0}</span>
              </div>
              <Button 
                className="w-full bg-primary hover:bg-primary/90 transition-all duration-200 group"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t.modelDetail.processing}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                    {model.is_paid ? t.modelDetail.purchaseAndDownload : t.modelDetail.download}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 分享 */}
          <Card className="rounded-[16px] overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-[Poppins] font-semibold">
                <Share2 className="h-5 w-5" />
                {t.modelDetail.shareModel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full hover:bg-primary/10 transition-all duration-200"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  alert(t.modelDetail.linkCopied)
                }}
              >
                {t.modelDetail.copyLink}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
