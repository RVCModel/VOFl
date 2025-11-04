'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Bell, Heart, MessageSquare, UserPlus, Settings, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'
import { useLocale } from '@/components/locale-provider'
import { translations } from '@/lib/i18n'

interface Message {
  id: string
  type: 'system' | 'activity' | 'reply' | 'like' | 'follow'
  title: string
  content: string
  related_user?: {
    id: string
    username: string
    display_name: string
    avatar_url: string
  }
  related_item_type?: string
  related_item_id?: string
  is_read: boolean
  created_at: string
  updated_at: string
}

interface MessagesResponse {
  messages: Message[]
  unreadCount: number
  pagination: {
    page: number
    limit: number
    total: number
  }
}

export default function MessagesPage() {
  const { user, session } = useAuth()
  const { locale } = useLocale()
  const t = translations[locale]
  const [messages, setMessages] = useState<Message[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const hasAutoMarkedRef = useRef(false)

  // 获取消息列表
  const fetchMessages = async (type?: string) => {
    if (!session) return

    setLoading(true)
    try {
      const token = session.access_token
      let url = '/api/messages?'
      
      if (type && type !== 'all') {
        url += `type=${type}&`
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(t.messages.errors.fetch)
      }

      const data: MessagesResponse = await response.json()
      setMessages(data.messages)
      setUnreadCount(data.unreadCount)
      
      // 添加调试信息
      console.log('获取到的消息:', data.messages)
      console.log('未读消息数量:', data.unreadCount)
    } catch (error) {
      console.error('获取消息时发生错误:', error)
    } finally {
      setLoading(false)
    }
  }

  // 标记消息为已读
  const markAsRead = async (messageId?: string) => {
    if (!session) return

    try {
      const token = session.access_token
      const response = await fetch('/api/messages', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messageId,
          markAll: !messageId
        })
      })

      if (!response.ok) {
        throw new Error(t.messages.errors.mark)
      }

      // 标记成功后，重新获取消息列表以更新UI
      fetchMessages(activeTab)
    } catch (error) {
      console.error('标记消息为已读时发生错误:', error)
    }
  }

  // 标记所有消息为已读
  const markAllAsRead = async () => {
    setMarkingAllRead(true)
    await markAsRead()
    setMarkingAllRead(false)
  }

  // 当用户访问消息页面时，延迟自动标记所有消息为已读
  useEffect(() => {
    // 延迟5秒后再自动标记所有消息为已读，让用户有时间看到未读状态
    if (session && !loading && unreadCount > 0 && !hasAutoMarkedRef.current) {
      const timer = setTimeout(() => {
        hasAutoMarkedRef.current = true
        markAllAsRead()
      }, 5000) // 5秒后自动标记为已读
      
      return () => clearTimeout(timer)
    }
  }, [session, loading, unreadCount])

  // 获取消息类型图标
  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <Settings className="h-4 w-4" />
      case 'activity':
        return <Bell className="h-4 w-4" />
      case 'reply':
        return <MessageSquare className="h-4 w-4" />
      case 'like':
        return <Heart className="h-4 w-4" />
      case 'follow':
        return <UserPlus className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  // 获取消息类型名称
  const getMessageTypeName = (type: string) => {
    switch (type) {
      case 'system':
        return t.messages.typeNames.system
      case 'activity':
        return t.messages.typeNames.activity
      case 'reply':
        return t.messages.typeNames.reply
      case 'like':
        return t.messages.typeNames.like
      case 'follow':
        return t.messages.typeNames.follow
      default:
        return t.messages.typeNames.unknown
    }
  }

  // 格式化时间
  const formatTime = (dateString: string) => {
    const dateLocale = locale === 'zh' ? zhCN : enUS
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: dateLocale 
    })
  }

  useEffect(() => {
    if (session) {
      fetchMessages()
    }
  }, [session])

  useEffect(() => {
    fetchMessages(activeTab)
  }, [activeTab])

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p>{t.messages.pleaseLogin}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{t.messages.title}</CardTitle>
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={markAllAsRead}
                disabled={markingAllRead}
              >
                {markingAllRead ? t.messages.marking : t.messages.markAllAsRead}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all" className="relative">
                {t.messages.types.all}
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="system">
                <div className="flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.messages.types.system}</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="activity">
                <div className="flex items-center gap-1">
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.messages.types.activity}</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="reply">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.messages.types.reply}</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="like">
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.messages.types.like}</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="follow">
                <div className="flex items-center gap-1">
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.messages.types.follow}</span>
                </div>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <p>{t.messages.loading}</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <p>{t.messages.empty}{activeTab !== 'all' ? getMessageTypeName(activeTab) : ''}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        message.is_read ? 'bg-background' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {message.related_user ? (
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={message.related_user.avatar_url} alt={message.related_user.display_name} />
                              <AvatarFallback>{message.related_user.display_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                              {getMessageIcon(message.type)}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {message.related_user ? message.related_user.display_name : getMessageTypeName(message.type)}
                              </span>
                              {!message.is_read && (
                                <Badge variant="secondary" className="text-xs">
                                  未读
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {formatTime(message.created_at)}
                              </span>
                              {!message.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(message.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <h4 className="font-medium mt-1">{message.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}