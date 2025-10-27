"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/components/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

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

interface EditProfileDialogProps {
  isOpen: boolean
  onClose: () => void
  profile: Profile
  onProfileUpdate: (profile: Profile) => void
}

export function EditProfileDialog({ isOpen, onClose, profile, onProfileUpdate }: EditProfileDialogProps) {
  const { user, session } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false)
  const [isDraggingCover, setIsDraggingCover] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ avatar: number, cover: number }>({ avatar: 0, cover: 0 })
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    username: profile.username || "",
    display_name: profile.display_name || "",
    bio: profile.bio || "",
    avatar_url: profile.avatar_url || "",
    cover_url: profile.cover_url || ""
  })

  useEffect(() => {
    setFormData({
      username: profile.username || "",
      display_name: profile.display_name || "",
      bio: profile.bio || "",
      avatar_url: profile.avatar_url || "",
      cover_url: profile.cover_url || ""
    })
  }, [profile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadAvatar(file)
  }

  const uploadAvatar = async (file: File) => {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('头像文件大小不能超过5MB')
      return
    }

    // 检查是否有有效的会话
    if (!session || !session.access_token) {
      toast.error('请先登录')
      return
    }

    setIsUploadingAvatar(true)
    setUploadProgress(prev => ({ ...prev, avatar: 0 }))
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'cover') // 使用cover类型，因为头像也是图片

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = Math.min(prev.avatar + 10, 90)
          return { ...prev, avatar: newProgress }
        })
      }, 200)

      const response = await fetch('/api/upload-r2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(prev => ({ ...prev, avatar: 100 }))

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '上传失败')
      }

      const data = await response.json()
      setFormData(prev => ({
        ...prev,
        avatar_url: data.url
      }))
      toast.success('头像上传成功')
      
      // 重置进度
      setTimeout(() => {
        setUploadProgress(prev => ({ ...prev, avatar: 0 }))
      }, 1000)
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error(`头像上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
      setUploadProgress(prev => ({ ...prev, avatar: 0 }))
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadCover(file)
  }

  const uploadCover = async (file: File) => {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('封面文件大小不能超过10MB')
      return
    }

    // 检查是否有有效的会话
    if (!session || !session.access_token) {
      toast.error('请先登录')
      return
    }

    setIsUploadingCover(true)
    setUploadProgress(prev => ({ ...prev, cover: 0 }))
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'cover')

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = Math.min(prev.cover + 10, 90)
          return { ...prev, cover: newProgress }
        })
      }, 200)

      const response = await fetch('/api/upload-r2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(prev => ({ ...prev, cover: 100 }))

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '上传失败')
      }

      const data = await response.json()
      setFormData(prev => ({
        ...prev,
        cover_url: data.url
      }))
      toast.success('封面上传成功')
      
      // 重置进度
      setTimeout(() => {
        setUploadProgress(prev => ({ ...prev, cover: 0 }))
      }, 1000)
    } catch (error) {
      console.error('Error uploading cover:', error)
      toast.error(`封面上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
      setUploadProgress(prev => ({ ...prev, cover: 0 }))
    } finally {
      setIsUploadingCover(false)
    }
  }

  // 拖拽处理函数
  const handleAvatarDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingAvatar(true)
  }

  const handleAvatarDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingAvatar(false)
  }

  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingAvatar(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      uploadAvatar(file)
    }
  }

  const handleCoverDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingCover(true)
  }

  const handleCoverDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingCover(false)
  }

  const handleCoverDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingCover(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      uploadCover(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      // 从表单数据中排除用户名，因为不允许修改
      const { username, ...profileData } = formData
      const response = await fetch(`/api/profile/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const data = await response.json()
      onProfileUpdate(data.profile)
      onClose()
      toast.success("资料更新成功")
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error("更新失败，请重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑个人资料</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          <div className="flex justify-center">
            <div 
              className={`relative group ${isDraggingAvatar ? 'ring-2 ring-primary ring-offset-2 rounded-full' : ''}`}
              onDragOver={handleAvatarDragOver}
              onDragLeave={handleAvatarDragLeave}
              onDrop={handleAvatarDrop}
            >
              <Avatar className="w-24 h-24 cursor-pointer transition-all group-hover:opacity-80" onClick={() => avatarInputRef.current?.click()}>
                {formData.avatar_url ? (
                  <AvatarImage src={formData.avatar_url} alt="头像" />
                ) : null}
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/10">
                  {(formData.display_name || profile.username).charAt(0).toUpperCase()}
                </AvatarFallback>
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </Avatar>
              <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1.5 cursor-pointer shadow-lg transition-all group-hover:scale-110" onClick={() => avatarInputRef.current?.click()}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={isUploadingAvatar}
              />
            </div>
          </div>
          
          {isUploadingAvatar && uploadProgress.avatar > 0 && (
            <div className="w-full max-w-xs mx-auto">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>上传进度</span>
                <span>{uploadProgress.avatar}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${uploadProgress.avatar}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <div className="text-center text-xs text-muted-foreground">
            点击头像或拖拽图片到此处上传 (最大 5MB)
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-3">
              <Label htmlFor="display_name" className="text-sm font-medium">显示名称</Label>
              <Input
                id="display_name"
                name="display_name"
                value={formData.display_name}
                onChange={handleChange}
                placeholder="请输入显示名称"
                className="h-11"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="username" className="text-sm font-medium">用户名</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                readOnly
                disabled
                className="bg-muted cursor-not-allowed h-11"
              />
              <p className="text-xs text-muted-foreground">用户名不可修改，用于登录和他人查找您的账户</p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="bio" className="text-sm font-medium">个人简介</Label>
              <Textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="介绍一下自己吧"
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="cover_url" className="text-sm font-medium">封面图片</Label>
              <div 
                className={`relative border-2 border-dashed rounded-lg p-6 transition-all ${isDraggingCover ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}`}
                onDragOver={handleCoverDragOver}
                onDragLeave={handleCoverDragLeave}
                onDrop={handleCoverDrop}
              >
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                  disabled={isUploadingCover}
                />
                
                {formData.cover_url ? (
                  <div className="space-y-3">
                    <div className="relative w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                      <img 
                        src={formData.cover_url} 
                        alt="封面预览" 
                        className="w-full h-full object-cover"
                      />
                      {isUploadingCover && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-center">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={isUploadingCover}
                      >
                        {isUploadingCover ? "上传中..." : "更换封面"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, cover_url: "" }))}
                        className="ml-2"
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <div className="mx-auto w-12 h-12 text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" x2="12" y1="3" y2="15"></line>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">点击或拖拽上传封面图片</p>
                      <p className="text-xs text-muted-foreground">支持 JPG, PNG, GIF 格式，最大 10MB</p>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isUploadingCover}
                    >
                      {isUploadingCover ? "上传中..." : "选择文件"}
                    </Button>
                  </div>
                )}
              </div>
              
              {isUploadingCover && uploadProgress.cover > 0 && (
                <div className="w-full">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>上传进度</span>
                    <span>{uploadProgress.cover}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300 ease-out" 
                      style={{ width: `${uploadProgress.cover}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
        
        {/* 固定在底部的按钮区域 */}
        <div className="sticky bottom-0 bg-background border-t mt-6 pt-4 pb-2">
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose} className="h-11 px-6">
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="h-11 px-6 bg-primary hover:bg-primary/90"
              onClick={handleSubmit}
            >
              {isLoading ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}