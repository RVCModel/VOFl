'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Upload, X, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

interface DatasetFormData {
  name: string
  type: string
  contentCategory: string
  tags: string[]
  isOriginal: boolean
  originalAuthor: string
  coverImageUrl: string
  description: string
  visibility: string
  isPaid: boolean
  price: number
  files: Array<{
    id: string
    name: string
    url: string
    size: number
    type: string
  }>
}

export default function PublishDatasetPage() {
  return (
    <ProtectedRoute>
      <PublishDatasetContent />
    </ProtectedRoute>
  )
}

function PublishDatasetContent() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }
  
  // 如果没有用户，不渲染内容（会被 ProtectedRoute 重定向）
  if (!user) {
    return null
  }
  const [activeTab, setActiveTab] = useState('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [tagInput, setTagInput] = useState('')
  
  const [formData, setFormData] = useState<DatasetFormData>({
    name: '',
    type: 'training-data',
    contentCategory: 'voice',
    tags: [],
    isOriginal: true,
    originalAuthor: '',
    coverImageUrl: '',
    description: '',
    visibility: 'public',
    isPaid: false,
    price: 0,
    files: []
  })

  // 更新表单数据
  const updateFormData = (field: keyof DatasetFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // 添加标签
  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      updateFormData('tags', [...formData.tags, tagInput.trim()])
      setTagInput('')
    }
  }

  // 移除标签
  const removeTag = (tagToRemove: string) => {
    updateFormData('tags', formData.tags.filter(tag => tag !== tagToRemove))
  }

  // 上传封面图
  const uploadCoverImage = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'cover')
      
      const response = await fetch('/api/upload-r2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.session?.access_token}`
        },
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Failed to upload cover image')
      }
      
      const data = await response.json()
      updateFormData('coverImageUrl', data.url)
      
      toast({
        title: '上传成功',
        description: '封面图已成功上传',
      })
    } catch (error) {
      toast({
        title: '上传失败',
        description: '封面图上传失败，请重试',
        variant: 'destructive'
      })
    }
  }

  // 上传数据集文件
  const uploadDatasetFile = async (file: File) => {
    try {
      setUploadProgress(0)
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'dataset-file')
      
      const response = await fetch('/api/upload-r2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.session?.access_token}`
        },
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Failed to upload dataset file')
      }
      
      const data = await response.json()
      updateFormData('files', [...formData.files, {
        id: Date.now().toString(),
        name: file.name,
        url: data.url,
        size: data.size,
        type: data.type
      }])
      
      setUploadProgress(100)
      
      toast({
        title: '上传成功',
        description: '数据集文件已成功上传',
      })
    } catch (error) {
      toast({
        title: '上传失败',
        description: '数据集文件上传失败，请重试',
        variant: 'destructive'
      })
    }
  }

  // 移除文件
  const removeFile = (fileId: string) => {
    updateFormData('files', formData.files.filter(file => file.id !== fileId))
  }

  // 提交表单
  const submitForm = async () => {
    if (!user) return
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/datasets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.session.access_token}`
        },
        body: JSON.stringify({
          user_id: user.id,
          name: formData.name,
          type: formData.type,
          content_category: formData.contentCategory,
          tags: formData.tags,
          is_original: formData.isOriginal,
          original_author: formData.originalAuthor,
          cover_image_url: formData.coverImageUrl,
          description: formData.description,
          visibility: formData.visibility,
          is_paid: formData.isPaid,
          price: formData.price,
          files: formData.files,
          status: 'published'
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create dataset')
      }
      
      const dataset = await response.json()
      
      toast({
        title: '发布成功',
        description: '数据集已成功发布',
      })
      
      router.push(`/datasets/${dataset.id}`)
    } catch (error) {
      toast({
        title: '发布失败',
        description: '数据集发布失败，请重试',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 验证当前步骤是否完成
  const isStepValid = (step: string) => {
    switch (step) {
      case 'basic':
        return formData.name && formData.type && formData.contentCategory
      case 'details':
        return formData.description && formData.visibility
      case 'files':
        return formData.files.length > 0
      default:
        return false
    }
  }

  // 切换到下一步
  const nextTab = () => {
    const tabs = ['basic', 'details', 'files']
    const currentIndex = tabs.indexOf(activeTab)
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1])
    }
  }

  // 切换到上一步
  const prevTab = () => {
    const tabs = ['basic', 'details', 'files']
    const currentIndex = tabs.indexOf(activeTab)
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1])
    }
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">发布数据集</h1>
        <p className="text-muted-foreground mt-2">
          分享您的数据集，让更多用户能够使用和训练模型
        </p>
      </div>

      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${activeTab === 'basic' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            1
          </div>
          <span className={`ml-2 ${activeTab === 'basic' ? 'font-medium' : ''}`}>基本信息</span>
        </div>
        <div className={`mx-4 h-0.5 w-16 ${activeTab === 'details' || activeTab === 'files' ? 'bg-primary' : 'bg-muted'}`} />
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${activeTab === 'details' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            2
          </div>
          <span className={`ml-2 ${activeTab === 'details' ? 'font-medium' : ''}`}>详细信息</span>
        </div>
        <div className={`mx-4 h-0.5 w-16 ${activeTab === 'files' ? 'bg-primary' : 'bg-muted'}`} />
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${activeTab === 'files' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            3
          </div>
          <span className={`ml-2 ${activeTab === 'files' ? 'font-medium' : ''}`}>文件上传</span>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="details">详细信息</TabsTrigger>
          <TabsTrigger value="files">文件上传</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>填写数据集的基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">数据集名称</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="请输入数据集名称"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">数据集类型</Label>
                  <Select value={formData.type} onValueChange={(value) => updateFormData('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择数据集类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="training-data">训练数据</SelectItem>
                      <SelectItem value="validation-data">验证数据</SelectItem>
                      <SelectItem value="test-data">测试数据</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="contentCategory">内容类别</Label>
                  <Select value={formData.contentCategory} onValueChange={(value) => updateFormData('contentCategory', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择内容类别" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="voice">语音</SelectItem>
                      <SelectItem value="music">音乐</SelectItem>
                      <SelectItem value="speech">演讲</SelectItem>
                      <SelectItem value="audiobook">有声书</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>标签</Label>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="输入标签后按回车或点击添加"
                      onKeyDown={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isOriginal"
                    checked={formData.isOriginal}
                    onCheckedChange={(checked) => updateFormData('isOriginal', checked)}
                  />
                  <Label htmlFor="isOriginal">原创内容</Label>
                </div>
                {!formData.isOriginal && (
                  <div className="space-y-2 mt-2">
                    <Label htmlFor="originalAuthor">原作者</Label>
                    <Input
                      id="originalAuthor"
                      value={formData.originalAuthor}
                      onChange={(e) => updateFormData('originalAuthor', e.target.value)}
                      placeholder="请输入原作者名称"
                    />
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={nextTab} disabled={!isStepValid('basic')}>
                下一步
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>详细信息</CardTitle>
              <CardDescription>填写数据集的详细信息和权限设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="coverImage">封面图</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {formData.coverImageUrl ? (
                    <div className="space-y-2">
                      <img
                        src={formData.coverImageUrl}
                        alt="封面图"
                        className="mx-auto h-40 w-auto object-contain"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => updateFormData('coverImageUrl', '')}
                      >
                        移除封面图
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="text-sm text-gray-600">
                        点击上传封面图，或拖拽文件到此处
                      </div>
                      <input
                        type="file"
                        id="coverImage"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            uploadCoverImage(e.target.files[0])
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('coverImage')?.click()}
                      >
                        选择文件
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">数据集介绍</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="请详细描述您的数据集，包括数据来源、格式、大小、适用场景等"
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="visibility">权限设置</Label>
                  <Select value={formData.visibility} onValueChange={(value) => updateFormData('visibility', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择权限设置" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">公开</SelectItem>
                      <SelectItem value="private">仅自己可见</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPaid"
                      checked={formData.isPaid}
                      onCheckedChange={(checked) => updateFormData('isPaid', checked)}
                    />
                    <Label htmlFor="isPaid">付费数据集</Label>
                  </div>
                  {formData.isPaid && (
                    <div className="mt-2">
                      <Label htmlFor="price">价格（元）</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => updateFormData('price', parseFloat(e.target.value))}
                        placeholder="请输入价格"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={prevTab}>
                上一步
              </Button>
              <Button onClick={nextTab} disabled={!isStepValid('details')}>
                下一步
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>文件上传</CardTitle>
              <CardDescription>上传数据集文件</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>数据集文件</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div className="space-y-2">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="text-sm text-gray-600">
                      点击上传数据集文件，或拖拽文件到此处
                    </div>
                    <div className="text-xs text-gray-500">
                      支持的文件格式：.zip, .rar, .7z, .tar.gz
                    </div>
                    <input
                      type="file"
                      id="datasetFile"
                      className="hidden"
                      accept=".zip,.rar,.7z,.tar.gz"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          uploadDatasetFile(e.target.files[0])
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('datasetFile')?.click()}
                    >
                      选择文件
                    </Button>
                  </div>
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2">
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}
              </div>

              {formData.files.length > 0 && (
                <div className="space-y-2">
                  <Label>已上传的文件</Label>
                  <div className="space-y-2">
                    {formData.files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex-1">
                          <div className="font-medium">{file.name}</div>
                          <div className="text-sm text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={prevTab}>
                上一步
              </Button>
              <Button onClick={submitForm} disabled={!isStepValid('files') || isSubmitting}>
                {isSubmitting ? '发布中...' : '发布数据集'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}