"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/components/auth-context"
import { PublicRoute } from "@/components/public-route"
import { ModelCard } from "@/components/model-card"
import { DatasetCard } from "@/components/dataset-card"
import { EditProfileDialog } from "@/components/edit-profile-dialog"
import { useLocale } from "@/components/locale-provider"
import { translations } from "@/lib/i18n"
import { useEffect as useClientEffect } from 'react'

interface Profile {
  id: string
  username: string
  display_name: string
  bio: string
  avatar_url: string
  cover_url: string
  followers_count: number
  following_count: number
  likes_count: number
  created_at: string
  updated_at: string
}

interface Model {
  id: string
  name: string
  type: string
  cover_image_url: string | null
  download_count: number
  view_count: number
  is_paid: boolean
  profiles?: {
    username?: string
    display_name?: string
    avatar_url?: string
  } | null
}

export default function ProfilePage() {
  const { user } = useAuth()
  const { id } = useParams()
  const router = useRouter()
  const { locale } = useLocale()
  const t = translations[locale]
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [models, setModels] = useState<Model[]>([])
  const [datasets, setDatasets] = useState<any[]>([])
  const [likedModels, setLikedModels] = useState<Model[]>([])
  const [likedDatasets, setLikedDatasets] = useState<any[]>([])
  const [collectedModels, setCollectedModels] = useState<Model[]>([])
  const [collectedDatasets, setCollectedDatasets] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('models')

  // 判断是否是自己的主页
  const isOwnProfile = user?.id === id

  // 动态设置页面标题
  useClientEffect(() => {
    if (profile) {
      document.title = `${profile.display_name || profile.username} - VOFL用户`
    }
  }, [profile])

  useEffect(() => {
    fetchProfile()
    fetchModels()
    fetchDatasets()
    
    // 获取点赞和收藏的内容（所有用户都可以看到）
    fetchLikedModels()
    fetchLikedDatasets()
    fetchCollectedModels()
    fetchCollectedDatasets()
    
    // 如果已登录且不是自己的主页，检查是否已关注
    if (user && !isOwnProfile) {
      checkIfFollowing()
    }
  }, [id, user, isOwnProfile])

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profile/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      const data = await response.json()
      setProfile(data.profile)
    } catch (error) {
      console.error('Error fetching profile:', error)
      // 如果获取失败，重定向到首页
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchModels = async () => {
    try {
      console.log('尝试获取用户模型，用户ID:', id)
      // 获取用户发布的模型
      const response = await fetch(`/api/profile/${id}/models`)
      if (!response.ok) {
        console.error('获取模型列表失败:', response.statusText)
        return
      }
      
      const data = await response.json()
      console.log('API查询结果:', data)
      
      // 直接设置模型数据，无论是否为空
      setModels(data.models || [])
      console.log('设置的模型数据数量:', (data.models || []).length)
    } catch (error) {
      console.error('获取模型列表时发生错误:', error)
    }
  }

  const fetchDatasets = async () => {
    try {
      console.log('尝试获取用户数据集，用户ID:', id)
      // 获取用户发布的数据集
      const response = await fetch(`/api/profile/${id}/datasets`)
      if (!response.ok) {
        console.error('获取数据集列表失败:', response.statusText)
        return
      }
      
      const data = await response.json()
      console.log('API查询结果:', data)
      
      // 直接设置数据集数据，无论是否为空
      setDatasets(data.datasets || [])
      console.log('设置的数据集数据数量:', (data.datasets || []).length)
    } catch (error) {
      console.error('获取数据集列表时发生错误:', error)
    }
  }

  const fetchLikedModels = async () => {
    try {
      console.log('尝试获取用户点赞的模型，用户ID:', id)
      // 获取用户点赞的模型
      const response = await fetch(`/api/profile/${id}/liked-models`)
      if (!response.ok) {
        console.error('获取点赞模型列表失败:', response.statusText)
        return
      }
      
      const data = await response.json()
      console.log('API查询结果:', data)
      
      // 直接设置点赞模型数据，无论是否为空
      setLikedModels(data.models || [])
      console.log('设置的点赞模型数据数量:', (data.models || []).length)
    } catch (error) {
      console.error('获取点赞模型列表时发生错误:', error)
    }
  }

  const fetchLikedDatasets = async () => {
    try {
      console.log('尝试获取用户点赞的数据集，用户ID:', id)
      // 获取用户点赞的数据集
      const response = await fetch(`/api/profile/${id}/liked-datasets`)
      if (!response.ok) {
        console.error('获取点赞数据集列表失败:', response.statusText)
        return
      }
      
      const data = await response.json()
      console.log('API查询结果:', data)
      
      // 直接设置点赞数据集数据，无论是否为空
      setLikedDatasets(data.datasets || [])
      console.log('设置的点赞数据集数据数量:', (data.datasets || []).length)
    } catch (error) {
      console.error('获取点赞数据集列表时发生错误:', error)
    }
  }

  const fetchCollectedModels = async () => {
    try {
      console.log('尝试获取用户收藏的模型，用户ID:', id)
      // 获取用户收藏的模型
      const response = await fetch(`/api/profile/${id}/collected-models`)
      if (!response.ok) {
        console.error('获取收藏模型列表失败:', response.statusText)
        return
      }
      
      const data = await response.json()
      console.log('API查询结果:', data)
      
      // 直接设置收藏模型数据，无论是否为空
      setCollectedModels(data.models || [])
      console.log('设置的收藏模型数据数量:', (data.models || []).length)
    } catch (error) {
      console.error('获取收藏模型列表时发生错误:', error)
    }
  }

  const fetchCollectedDatasets = async () => {
    try {
      console.log('尝试获取用户收藏的数据集，用户ID:', id)
      // 获取用户收藏的数据集
      const response = await fetch(`/api/profile/${id}/collected-datasets`)
      if (!response.ok) {
        console.error('获取收藏数据集列表失败:', response.statusText)
        return
      }
      
      const data = await response.json()
      console.log('API查询结果:', data)
      
      // 直接设置收藏数据集数据，无论是否为空
      setCollectedDatasets(data.datasets || [])
      console.log('设置的收藏数据集数据数量:', (data.datasets || []).length)
    } catch (error) {
      console.error('获取收藏数据集列表时发生错误:', error)
    }
  }

  const checkIfFollowing = async () => {
    try {
      const response = await fetch(`/api/follow/check?followingId=${id}`, {
        headers: {
          'Authorization': `Bearer ${await supabase.auth.getSession().then(res => res.data.session?.access_token)}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setIsFollowing(data.isFollowing)
      }
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }

  const handleFollow = async () => {
    if (!user) return
    
    // 检查是否尝试关注自己
    if (user.id === id) {
      alert('不能关注自己')
      return
    }
    
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ followingId: id })
      })
      
      if (response.ok) {
        setIsFollowing(true)
        // 更新粉丝数
        if (profile) {
          setProfile({
            ...profile,
            followers_count: profile.followers_count + 1
          })
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || '关注失败')
      }
    } catch (error) {
      console.error('Error following user:', error)
      alert('关注失败，请稍后再试')
    }
  }

  const handleUnfollow = async () => {
    if (!user) return
    
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const response = await fetch(`/api/follow?followingId=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        setIsFollowing(false)
        // 更新粉丝数
        if (profile) {
          setProfile({
            ...profile,
            followers_count: Math.max(0, profile.followers_count - 1)
          })
        }
      }
    } catch (error) {
      console.error('Error unfollowing user:', error)
    }
  }

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile)
  }

  if (isLoading) {
    return (
      <PublicRoute>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <span className="ml-2">{t.profile.loading}</span>
        </div>
      </PublicRoute>
    )
  }

  if (!profile) {
    return (
      <PublicRoute>
        <div className="flex justify-center items-center h-screen">
          <p>{t.profile.userNotFound}</p>
        </div>
      </PublicRoute>
    )
  }

  return (
    <PublicRoute>
      <div className="w-full">
        {/* 封面图 */}
        <div className="relative w-full h-48 bg-gray-200 dark:bg-gray-800">
          {profile.cover_url ? (
            <img src={profile.cover_url} alt="封面图" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
          )}
        </div>

        <div className="container mx-auto px-4">
          {/* 用户信息头部 */}
          <div className="relative flex flex-col md:flex-row items-start gap-6 -mt-12 z-10">
            <Avatar className="w-24 h-24 border-4 border-white dark:border-gray-950 shadow-lg">
              {profile.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.display_name || profile.username} />
              ) : null}
              <AvatarFallback className="text-lg">
                {(profile.display_name || profile.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 mt-14">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
                  {profile.bio && (
                    <p className="mt-2 text-muted-foreground">{profile.bio}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div>{profile.followers_count} {t.profile.followers}</div>
                    <div>{profile.following_count} {t.profile.following}</div>
                    <div>{profile.likes_count} {t.profile.likes}</div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {isOwnProfile ? (
                    user && (
                      <Button 
                        onClick={() => setIsEditDialogOpen(true)}
                        className="px-6"
                      >
                        {t.profile.editProfile}
                      </Button>
                    )
                  ) : (
                    user && (
                      <>
                        <Button 
                          variant={isFollowing ? "outline" : "default"}
                          onClick={isFollowing ? handleUnfollow : handleFollow}
                          className="px-6"
                        >
                          {isFollowing ? t.profile.following : t.profile.follow}
                        </Button>
                        <Button variant="outline" className="px-4">
                          {t.profile.sendMessage}
                        </Button>
                      </>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-6">
          {/* 内容标签页 */}
          <Tabs defaultValue="models" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="models">{t.profile.models}</TabsTrigger>
              <TabsTrigger value="datasets">{t.profile.datasets}</TabsTrigger>
              <TabsTrigger value="likes">{t.profile.likesTab}</TabsTrigger>
              <TabsTrigger value="collections">{t.profile.collections}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="models" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {models.length > 0 ? (
                      models.map((model) => (
                        <div key={model.id} className="space-y-2">
                          <ModelCard
                            id={model.id}
                            name={model.name}
                            coverImageUrl={model.cover_image_url}
                            type={model.type}
                            downloadCount={model.download_count || 0}
                            viewCount={model.view_count || 0}
                            isPaid={model.is_paid || false}
                            username={profile?.username}
                            displayName={profile?.display_name}
                            avatarUrl={profile?.avatar_url}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        {t.profile.noModels}
                      </div>
                    )}
                  </div>
            </TabsContent>
            
            <TabsContent value="datasets" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {datasets.length > 0 ? (
                      datasets.map((dataset) => (
                        <div key={dataset.id} className="space-y-2">
                          <DatasetCard
                            id={dataset.id}
                            name={dataset.name}
                            coverImageUrl={dataset.cover_image_url}
                            type={dataset.type}
                            downloadCount={dataset.download_count || 0}
                            viewCount={dataset.view_count || 0}
                            isPaid={dataset.is_paid || false}
                            username={profile?.username}
                            displayName={profile?.display_name}
                            avatarUrl={profile?.avatar_url}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        {t.profile.noDatasets}
                      </div>
                    )}
                  </div>
            </TabsContent>
            
            <TabsContent value="likes" className="space-y-4">
              <Tabs defaultValue="liked-models" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="liked-models">{t.profile.likedModels}</TabsTrigger>
                  <TabsTrigger value="liked-datasets">{t.profile.likedDatasets}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="liked-models" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {likedModels.length > 0 ? (
                      likedModels.map((model) => (
                        <div key={model.id} className="space-y-2">
                          <ModelCard
                            id={model.id}
                            name={model.name}
                            coverImageUrl={model.cover_image_url}
                            type={model.type}
                            downloadCount={model.download_count || 0}
                            viewCount={model.view_count || 0}
                            isPaid={model.is_paid || false}
                            username={model.profiles?.username}
                            displayName={model.profiles?.display_name}
                            avatarUrl={model.profiles?.avatar_url}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        {t.profile.noLikedModels}
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="liked-datasets" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {likedDatasets.length > 0 ? (
                      likedDatasets.map((dataset) => (
                        <div key={dataset.id} className="space-y-2">
                          <DatasetCard
                            id={dataset.id}
                            name={dataset.name}
                            coverImageUrl={dataset.cover_image_url}
                            type={dataset.type}
                            downloadCount={dataset.download_count || 0}
                            viewCount={dataset.view_count || 0}
                            isPaid={dataset.is_paid || false}
                            username={dataset.profiles?.username}
                            displayName={dataset.profiles?.display_name}
                            avatarUrl={dataset.profiles?.avatar_url}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        {t.profile.noLikedDatasets}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>
            
            <TabsContent value="collections" className="space-y-4">
              <Tabs defaultValue="collected-models" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="collected-models">{t.profile.collectedModels}</TabsTrigger>
                  <TabsTrigger value="collected-datasets">{t.profile.collectedDatasets}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="collected-models" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {collectedModels.length > 0 ? (
                      collectedModels.map((model) => (
                        <div key={model.id} className="space-y-2">
                          <ModelCard
                            id={model.id}
                            name={model.name}
                            coverImageUrl={model.cover_image_url}
                            type={model.type}
                            downloadCount={model.download_count || 0}
                            viewCount={model.view_count || 0}
                            isPaid={model.is_paid || false}
                            username={model.profiles?.username}
                            displayName={model.profiles?.display_name}
                            avatarUrl={model.profiles?.avatar_url}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        {t.profile.noCollectedModels}
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="collected-datasets" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {collectedDatasets.length > 0 ? (
                      collectedDatasets.map((dataset) => (
                        <div key={dataset.id} className="space-y-2">
                          <DatasetCard
                            id={dataset.id}
                            name={dataset.name}
                            coverImageUrl={dataset.cover_image_url}
                            type={dataset.type}
                            downloadCount={dataset.download_count || 0}
                            viewCount={dataset.view_count || 0}
                            isPaid={dataset.is_paid || false}
                            username={dataset.profiles?.username}
                            displayName={dataset.profiles?.display_name}
                            avatarUrl={dataset.profiles?.avatar_url}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        {t.profile.noCollectedDatasets}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>

        {/* 编辑资料弹窗 */}
        {isOwnProfile && (
          <EditProfileDialog
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            profile={profile}
            onProfileUpdate={handleProfileUpdate}
          />
        )}
      </div>
    </PublicRoute>
  )
}