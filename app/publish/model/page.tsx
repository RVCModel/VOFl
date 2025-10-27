"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, Upload, AlertCircle, CheckCircle } from "lucide-react"
import { translations } from "@/lib/i18n"
import { useLocale } from "@/components/locale-provider"

export default function PublishModelPage() {
  return (
    <ProtectedRoute>
      <PublishModelContent />
    </ProtectedRoute>
  )
}

function PublishModelContent() {
  const router = useRouter()
  const { user, session, isLoading } = useAuth()
  const { locale } = useLocale()
  const t = translations[locale].publishModel
  
  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    )
  }
  
  // 如果没有用户，不渲染内容（会被 ProtectedRoute 重定向）
  if (!user) {
    return null
  }
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [tagInput, setTagInput] = useState("")
  const [alert, setAlert] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({
    show: false,
    message: "",
    type: "error"
  })
  
  // 拖拽状态
  const [dragActive, setDragActive] = useState<{ [key: string]: boolean }>({
    referenceAudio: false,
    demoAudio: false,
    modelFile: false,
    datasetFile: false,
    coverImage: false
  })
  
  // 上传进度状态
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({
    referenceAudio: 0,
    demoAudio: 0,
    modelFile: 0,
    datasetFile: 0,
    coverImage: 0
  })
  
  const [basicInfo, setBasicInfo] = useState({
    name: "",
    category: "",
    language: "",
    tags: [] as string[],
    publishType: "model" // 添加发布类型，默认为模型
  })
  
  const [details, setDetails] = useState({
    description: "",
    visibility: "public",
    isPaid: "false",
    price: "",
    coverImageUrl: ""
  })
  
  const [files, setFiles] = useState({
    referenceAudio: null as File | null,
    demoAudio: null as File | null,
    modelFile: null as File | null,
    datasetFile: null as File | null
  })
  
  const [uploadStatus, setUploadStatus] = useState({
    referenceAudio: "idle" as "idle" | "uploading" | "success" | "error",
    demoAudio: "idle" as "idle" | "uploading" | "success" | "error",
    modelFile: "idle" as "idle" | "uploading" | "success" | "error",
    datasetFile: "idle" as "idle" | "uploading" | "success" | "error"
  })
  
  // 保存上传后的文件URL
  const [fileUrls, setFileUrls] = useState({
    referenceAudio: "",
    demoAudio: "",
    modelFile: "",
    datasetFile: ""
  })
  const showAlert = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
    setAlert({ show: true, message, type })
    setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }))
    }, 5000)
  }
  
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault()
      if (!basicInfo.tags.includes(tagInput.trim())) {
        setBasicInfo({
          ...basicInfo,
          tags: [...basicInfo.tags, tagInput.trim()]
        })
      }
      setTagInput("")
    }
  }
  
  const handleRemoveTag = (tagToRemove: string) => {
    setBasicInfo({
      ...basicInfo,
      tags: basicInfo.tags.filter(tag => tag !== tagToRemove)
    })
  }
  
  // 拖拽处理函数
  const handleDrag = (e: React.DragEvent, fileType: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(prev => ({ ...prev, [fileType]: true }))
    } else if (e.type === "dragleave") {
      setDragActive(prev => ({ ...prev, [fileType]: false }))
    }
  }
  
  const handleDrop = (e: React.DragEvent, fileType: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(prev => ({ ...prev, [fileType]: false }))
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      
      if (fileType === 'referenceAudio' || fileType === 'demoAudio') {
        const allowedAudioTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/m4a']
        if (!allowedAudioTypes.includes(file.type)) {
          showAlert(t.alerts.validAudioFile, 'error')
          return
        }
        if (file.size > 10 * 1024 * 1024) {
          showAlert(t.alerts.audioFileSize, 'error')
          return
        }
      } else if (fileType === 'modelFile') {
        if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
          showAlert(t.alerts.validModelFile, 'error')
          return
        }
        if (file.size > 500 * 1024 * 1024) {
          showAlert(t.alerts.modelFileSize, 'error')
          return
        }
      } else if (fileType === 'datasetFile') {
        if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
          showAlert(t.alerts.validDatasetFile, 'error')
          return
        }
        if (file.size > 500 * 1024 * 1024) {
          showAlert(t.alerts.datasetFileSize, 'error')
          return
        }
      } else if (fileType === 'coverImage') {
        if (!file.type.startsWith('image/')) {
          showAlert(t.alerts.validImageFile, 'error')
          return
        }
        if (file.size > 5 * 1024 * 1024) {
          showAlert(t.alerts.imageSize, 'error')
          return
        }
      }
      
      // 创建一个新的文件事件对象，触发原有的文件处理函数
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      const inputEvent = {
        target: { files: dataTransfer.files }
      } as unknown as React.ChangeEvent<HTMLInputElement>
      
      if (fileType === 'coverImage') {
        handleCoverImageChange(inputEvent)
      } else {
        handleFileChange(inputEvent, fileType)
      }
    }
  }
  
  // 直传到R2的上传函数
  const uploadToR2 = async (file: File, fileType: string = 'general'): Promise<string> => {
    // 获取当前用户的Supabase token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('User not authenticated')
    }

    // Step 1. 向API获取上传URL
    const res = await fetch('/api/r2-upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        fileType: fileType
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to get upload URL')

    const { uploadUrl, publicUrl } = data

    // Step 2. 直接上传到Cloudflare R2
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    })

    if (!uploadRes.ok) throw new Error('Upload failed')

    // Step 3. 上传完成后返回publicUrl
    return publicUrl
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 验证文件类型和大小
    if (fileType === 'referenceAudio' || fileType === 'demoAudio') {
      const allowedAudioTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/m4a'];
      if (!allowedAudioTypes.includes(file.type)) {
        showAlert(t.alerts.validAudioFile, 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showAlert(t.alerts.audioFileSize, 'error');
        return;
      }
    } else if (fileType === 'modelFile') {
      // 根据发布类型验证不同的文件格式
      if (basicInfo.publishType === 'model') {
        // 模型文件验证
        if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
          showAlert(t.alerts.validModelFile, 'error');
          return;
        }
        if (file.size > 500 * 1024 * 1024) {
          showAlert(t.alerts.modelFileSize, 'error');
          return;
        }
      } else {
        // 数据集示例文件验证
        const allowedAudioTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg'];
        if (!allowedAudioTypes.includes(file.type) && !file.name.endsWith('.wav') && !file.name.endsWith('.mp3')) {
          showAlert(t.alerts.validSampleFile, 'error');
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          showAlert(t.alerts.sampleFileSize, 'error');
          return;
        }
      }
    } else if (fileType === 'datasetFile') {
      // 数据集文件验证
      if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
        showAlert(t.alerts.validDatasetFile, 'error');
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        showAlert(t.alerts.datasetFileSize, 'error');
        return;
      }
    }
    
    setFiles({ ...files, [fileType]: file });
    setUploadStatus({ ...uploadStatus, [fileType]: 'uploading' });
    setUploadProgress({ ...uploadProgress, [fileType]: 0 });
    
    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          if (newProgress[fileType] < 90) {
            newProgress[fileType] += 10;
          }
          return newProgress;
        });
      }, 200);
      
      // 将前端文件类型转换为后端API期望的文件类型
      let apiFileType = fileType;
      if (fileType === 'modelFile') {
        // 如果是数据集样本文件，使用reference-audio类型
        if (basicInfo.publishType !== 'model') {
          apiFileType = 'reference-audio';
        } else {
          apiFileType = 'model-file';
        }
      } else if (fileType === 'datasetFile') {
        apiFileType = 'dataset-file';
      } else if (fileType === 'referenceAudio') {
        apiFileType = 'reference-audio';
      } else if (fileType === 'demoAudio') {
        apiFileType = 'demo-audio';
      } else if (fileType === 'coverImage') {
        apiFileType = 'cover';
      }
      
      // 使用直传R2的方式上传文件
      const fileUrl = await uploadToR2(file, apiFileType);
      
      clearInterval(progressInterval);
      setUploadProgress({ ...uploadProgress, [fileType]: 100 });
      
      setFiles({ ...files, [fileType]: file });
      setUploadStatus({ ...uploadStatus, [fileType]: 'success' });
      // 保存上传后的文件URL
      setFileUrls({ ...fileUrls, [fileType]: fileUrl });
      showAlert(t.alerts.fileUploadSuccess, 'success');
    } catch (error) {
      console.error(t.alerts.uploadFailed, error);
      setUploadStatus({ ...uploadStatus, [fileType]: 'error' });
      showAlert(t.alerts.fileUploadFailed, 'error');
    }
  };
  
  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // 验证文件类型和大小
    if (!file.type.startsWith('image/')) {
      showAlert(t.alerts.validImageFile, 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showAlert(t.alerts.imageSize, 'error')
      return
    }
    
    setIsUploadingCover(true)
    setUploadProgress({ ...uploadProgress, coverImage: 0 })
    
    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          if (newProgress.coverImage < 90) {
            newProgress.coverImage += 10
          }
          return newProgress
        })
      }, 200)
      
      // 使用直传R2的方式上传文件
      const fileUrl = await uploadToR2(file, 'cover')
      
      clearInterval(progressInterval)
      setUploadProgress({ ...uploadProgress, coverImage: 100 })
      
      setDetails({ ...details, coverImageUrl: fileUrl })
      setIsUploadingCover(false)
      showAlert(t.alerts.coverImageUploadSuccess, 'success')
    } catch (error) {
      console.error(t.alerts.uploadFailed, error)
      setIsUploadingCover(false)
      showAlert(t.alerts.coverImageUploadFailed, 'error')
    }
  }
  
  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }
  
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }
  
  const handleSubmit = async () => {
    // 验证所有必填字段
    if (!basicInfo.name || !basicInfo.category || !basicInfo.language) {
      showAlert(t.alerts.requiredFields, 'error')
      return
    }
    
    // 根据发布类型验证文件
    if (basicInfo.publishType === 'model') {
      if (!files.referenceAudio || !files.demoAudio || !files.modelFile) {
        showAlert(t.alerts.requiredFiles, 'error')
        return
      }
      
      if (uploadStatus.referenceAudio !== 'success' || 
          uploadStatus.demoAudio !== 'success' || 
          uploadStatus.modelFile !== 'success') {
        showAlert(t.alerts.waitForUpload, 'error')
        return
      }
    } else {
      if (!files.datasetFile || !files.modelFile) {
        showAlert(t.alerts.uploadDatasetAndSample, 'error')
        return
      }
      
      if (uploadStatus.datasetFile !== 'success' || uploadStatus.modelFile !== 'success') {
        showAlert(t.alerts.waitForUpload, 'error')
        return
      }
    }
    
    setIsSubmitting(true)
    
    try {
      // 获取当前用户
      if (!user) {
        throw new Error(t.alerts.userNotLoggedIn)
      }
      
      // 根据发布类型选择表名
      const tableName = basicInfo.publishType === 'model' ? 'models' : 'datasets'
      
      // 构建插入数据
      const insertData: any = {
        name: basicInfo.name,
        content_category: basicInfo.category,
        tags: basicInfo.tags,
        description: details.description,
        visibility: details.visibility,
        is_paid: details.isPaid === 'true',
        price: details.isPaid === 'true' ? parseFloat(details.price) : null,
        cover_image_url: details.coverImageUrl,
        user_id: user.id,
        status: 'draft'
      }
      
      // 如果是模型，添加模型特有字段
      if (basicInfo.publishType === 'model') {
        insertData.type = 'gpt-sovits'
        insertData.reference_audio_url = fileUrls.referenceAudio
        insertData.demo_audio_url = fileUrls.demoAudio
        insertData.model_file_url = fileUrls.modelFile
      } else {
        insertData.type = 'voice'
        insertData.file_url = fileUrls.datasetFile
        // 暂时不保存示例文件URL，因为数据库表没有这个字段
        // 如果需要保存示例文件，需要修改数据库表结构
      }
      
      // 创建记录
      const { data: record, error } = await supabase
        .from(tableName)
        .insert(insertData)
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      showAlert(`${basicInfo.publishType === 'model' ? t.alerts.modelCreated : t.alerts.datasetCreated}！`, 'success')
      
      // 跳转到详情页
      setTimeout(() => {
        router.push(`/${basicInfo.publishType === 'model' ? 'models' : 'datasets'}/${record.id}`)
      }, 1500)
    } catch (error) {
      console.error(`${basicInfo.publishType === 'model' ? t.alerts.modelCreationFailed : t.alerts.datasetCreationFailed}:`, error)
      showAlert(`${basicInfo.publishType === 'model' ? t.alerts.modelCreationFailed : t.alerts.datasetCreationFailed}，请重试`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const renderStep1 = () => (
    <Card className="shadow-lg transition-all duration-300 hover:shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">{t.step1.title}</CardTitle>
        <CardDescription className="text-muted-foreground">{t.step1.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t.step1.publishType}</Label>
          <RadioGroup
            value={basicInfo.publishType}
            onValueChange={(value) => setBasicInfo({ ...basicInfo, publishType: value })}
            className="flex flex-row gap-6 p-4 bg-muted/30 rounded-lg"
          >
            <div className="flex items-center space-x-3 cursor-pointer">
              <RadioGroupItem value="model" id="model" className="transition-all duration-200" />
              <Label htmlFor="model" className="cursor-pointer font-medium">{t.step1.publishModel}</Label>
            </div>
            <div className="flex items-center space-x-3 cursor-pointer">
              <RadioGroupItem value="dataset" id="dataset" className="transition-all duration-200" />
              <Label htmlFor="dataset" className="cursor-pointer font-medium">{t.step1.publishDataset}</Label>
            </div>
          </RadioGroup>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">{basicInfo.publishType === "model" ? t.step1.modelName : t.step1.datasetName} *</Label>
            <Input
              id="name"
              value={basicInfo.name}
              onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
              placeholder={basicInfo.publishType === "model" ? t.step1.modelNamePlaceholder : t.step1.datasetNamePlaceholder}
              required
              className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 border-muted-foreground/20"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="language" className="text-sm font-medium">{t.step1.language} *</Label>
            <Select value={basicInfo.language} onValueChange={(value) => setBasicInfo({ ...basicInfo, language: value })}>
              <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 border-muted-foreground/20">
                <SelectValue placeholder={t.step1.languagePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chinese">{t.languages.chinese}</SelectItem>
                <SelectItem value="english">{t.languages.english}</SelectItem>
                <SelectItem value="japanese">{t.languages.japanese}</SelectItem>
                <SelectItem value="korean">{t.languages.korean}</SelectItem>
                <SelectItem value="other">{t.languages.other}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-medium">{basicInfo.publishType === "model" ? t.step1.modelCategory : t.step1.datasetCategory} *</Label>
          <Select value={basicInfo.category} onValueChange={(value) => setBasicInfo({ ...basicInfo, category: value })}>
            <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 border-muted-foreground/20">
              <SelectValue placeholder={basicInfo.publishType === "model" ? t.step1.modelCategoryPlaceholder : t.step1.datasetCategoryPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {basicInfo.publishType === "model" ? (
                <>
                  <SelectItem value="ip_anime">{t.categories.ipAnime}</SelectItem>
                  <SelectItem value="explanation">{t.categories.explanation}</SelectItem>
                  <SelectItem value="character">{t.categories.character}</SelectItem>
                  <SelectItem value="game">{t.categories.game}</SelectItem>
                  <SelectItem value="other">{t.categories.other}</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="ip_anime">{t.categories.ipAnimeDataset}</SelectItem>
                  <SelectItem value="explanation">{t.categories.explanationDataset}</SelectItem>
                  <SelectItem value="character">{t.categories.characterDataset}</SelectItem>
                  <SelectItem value="game">{t.categories.gameDataset}</SelectItem>
                  <SelectItem value="other">{t.categories.otherDataset}</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="tags" className="text-sm font-medium">{t.step1.tags}</Label>
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder={t.step1.tagsPlaceholder}
            onKeyDown={handleAddTag}
            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 border-muted-foreground/20"
          />
          {basicInfo.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {basicInfo.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1 px-3 py-1 transition-all duration-200 hover:bg-secondary/80">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer transition-all duration-200 hover:text-destructive"
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-6">
        <Button 
          type="button" 
          onClick={handleNextStep} 
          className="ml-auto px-8 shadow-md transition-all duration-200 hover:shadow-lg"
          disabled={!basicInfo.name || !basicInfo.category || !basicInfo.language}
        >
          {t.next}
        </Button>
      </CardFooter>
    </Card>
  )
  
  const renderStep2 = () => (
    <Card className="shadow-lg transition-all duration-300 hover:shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">{basicInfo.publishType === "model" ? t.step2.modelTitle : t.step2.datasetTitle}</CardTitle>
        <CardDescription className="text-muted-foreground">{basicInfo.publishType === "model" ? t.step2.modelDescription : t.step2.datasetDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="coverImage" className="text-sm font-medium">{t.step2.coverImage} *</Label>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              dragActive.coverImage
                ? "border-primary bg-primary/10 scale-[1.01]"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20"
            }`}
            onDragEnter={(e) => handleDrag(e, 'coverImage')}
            onDragLeave={(e) => handleDrag(e, 'coverImage')}
            onDragOver={(e) => handleDrag(e, 'coverImage')}
            onDrop={(e) => handleDrop(e, 'coverImage')}
            onClick={() => document.getElementById('coverImage')?.click()}
          >
            <Input
              id="coverImage"
              type="file"
              accept="image/*"
              onChange={handleCoverImageChange}
              disabled={isUploadingCover}
              className="hidden"
            />
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <p className="text-base font-medium mb-2">
              {t.step2.dragOrClickImage}
            </p>
            <p className="text-sm text-muted-foreground">
              {t.step2.imageFormat}
            </p>
            {isUploadingCover && (
              <div className="mt-6">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.coverImage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{t.uploading} {uploadProgress.coverImage}%</p>
              </div>
            )}
            {!isUploadingCover && details.coverImageUrl && (
              <div className="mt-6">
                <div className="flex items-center justify-center text-green-600 mb-2">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">{t.uploadSuccess}</span>
                </div>
                <img 
                  src={details.coverImageUrl} 
                  alt={t.step2.coverImagePreview} 
                  className="mt-2 max-w-full h-32 object-cover rounded-lg mx-auto shadow-md"
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">{basicInfo.publishType === "model" ? t.step2.modelIntro : t.step2.datasetIntro}</Label>
          <Textarea
            id="description"
            value={details.description}
            onChange={(e) => setDetails({ ...details, description: e.target.value })}
            placeholder={basicInfo.publishType === "model" ? t.step2.modelIntroPlaceholder : t.step2.datasetIntroPlaceholder}
            rows={6}
            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 resize-none border-muted-foreground/20"
          />
        </div>
        
        <div className="space-y-4">
          <Label className="text-sm font-medium">{t.step2.permissionSettings}</Label>
          <RadioGroup
            value={details.visibility}
            onValueChange={(value) => setDetails({ ...details, visibility: value })}
            className="flex flex-row gap-6 p-4 bg-muted/30 rounded-lg"
          >
            <div className="flex items-center space-x-3 cursor-pointer">
              <RadioGroupItem value="public" id="public" className="transition-all duration-200" />
              <Label htmlFor="public" className="cursor-pointer font-medium">{t.step2.public}</Label>
            </div>
            <div className="flex items-center space-x-3 cursor-pointer">
              <RadioGroupItem value="private" id="private" className="transition-all duration-200" />
              <Label htmlFor="private" className="cursor-pointer font-medium">{t.step2.private}</Label>
            </div>
          </RadioGroup>
        </div>
        
        <div className="space-y-4">
          <Label className="text-sm font-medium">{t.step2.paymentSettings}</Label>
          <RadioGroup
            value={details.isPaid}
            onValueChange={(value) => setDetails({ ...details, isPaid: value })}
            className="flex flex-row gap-6 p-4 bg-muted/30 rounded-lg"
          >
            <div className="flex items-center space-x-3 cursor-pointer">
              <RadioGroupItem value="false" id="free" className="transition-all duration-200" />
              <Label htmlFor="free" className="cursor-pointer font-medium">{t.step2.free}</Label>
            </div>
            <div className="flex items-center space-x-3 cursor-pointer">
              <RadioGroupItem value="true" id="paid" className="transition-all duration-200" />
              <Label htmlFor="paid" className="cursor-pointer font-medium">{t.step2.paid}</Label>
            </div>
          </RadioGroup>
        </div>
        
        {details.isPaid === "true" && (
          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm font-medium">{t.step2.price}</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={details.price}
              onChange={(e) => setDetails({ ...details, price: e.target.value })}
              placeholder={t.step2.pricePlaceholder}
              required
              className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 border-muted-foreground/20"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-6">
        <Button type="button" variant="outline" onClick={handlePrevStep} className="px-6 transition-all duration-200">
          {t.step2.prevStep}
        </Button>
        <Button type="button" onClick={handleNextStep} className="ml-auto px-8 shadow-md transition-all duration-200 hover:shadow-lg">
          {t.step2.nextStep}
        </Button>
      </CardFooter>
    </Card>
  )
  
  const renderStep3 = () => (
    <Card className="shadow-lg transition-all duration-300 hover:shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">{basicInfo.publishType === "model" ? t.step3.title : t.step3.datasetTitle}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {basicInfo.publishType === "model" 
            ? t.step3.modelDescription
            : t.step3.datasetDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {basicInfo.publishType === "model" ? (
          <>
            <div className="space-y-2">
          <Label htmlFor="referenceAudio" className="text-sm font-medium">{t.step3.referenceAudio} (MP3/WAV, {t.step3.maxSize10})</Label>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              dragActive.referenceAudio
                ? "border-primary bg-primary/10 scale-[1.01]"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20"
            }`}
            onDragEnter={(e) => handleDrag(e, 'referenceAudio')}
            onDragLeave={(e) => handleDrag(e, 'referenceAudio')}
            onDragOver={(e) => handleDrag(e, 'referenceAudio')}
            onDrop={(e) => handleDrop(e, 'referenceAudio')}
            onClick={() => document.getElementById('referenceAudio')?.click()}
          >
            <Input
              id="referenceAudio"
              type="file"
              accept=".mp3,.wav"
              onChange={(e) => handleFileChange(e, 'referenceAudio')}
              disabled={uploadStatus.referenceAudio === 'uploading'}
              className="hidden"
            />
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <p className="text-base font-medium mb-2">
              {t.step3.dragOrClickAudio}
            </p>
            <p className="text-sm text-muted-foreground">
              {t.step3.audioFormat}
            </p>
            {uploadStatus.referenceAudio === 'uploading' && (
              <div className="mt-6">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.referenceAudio}%` }}
                  ></div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{t.uploading} {uploadProgress.referenceAudio}%</p>
              </div>
            )}
            {uploadStatus.referenceAudio === 'success' && (
              <div className="mt-6 flex items-center justify-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">{t.uploadSuccess}</span>
              </div>
            )}
            {uploadStatus.referenceAudio === 'error' && (
              <div className="mt-6 flex items-center justify-center text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">{t.uploadError}</span>
              </div>
            )}
            {files.referenceAudio && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {t.selected}: {files.referenceAudio.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(files.referenceAudio.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>
        </div>
            
            <div className="space-y-2">
              <Label htmlFor="demoAudio" className="text-sm font-medium">{t.step3.demoAudio}</Label>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                  dragActive.demoAudio
                    ? "border-primary bg-primary/10 scale-[1.01]"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20"
                }`}
                onDragEnter={(e) => handleDrag(e, 'demoAudio')}
                onDragLeave={(e) => handleDrag(e, 'demoAudio')}
                onDragOver={(e) => handleDrag(e, 'demoAudio')}
                onDrop={(e) => handleDrop(e, 'demoAudio')}
                onClick={() => document.getElementById('demoAudio')?.click()}
              >
                <Input
                  id="demoAudio"
                  type="file"
                  accept=".mp3,.wav"
                  onChange={(e) => handleFileChange(e, 'demoAudio')}
                  disabled={uploadStatus.demoAudio === 'uploading'}
                  className="hidden"
                />
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <p className="text-base font-medium mb-2">
                  {t.step3.dragOrClickAudio}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.step3.audioFormat}
                </p>
                {uploadStatus.demoAudio === 'uploading' && (
                  <div className="mt-6">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-primary h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.demoAudio}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{t.uploading} {uploadProgress.demoAudio}%</p>
                  </div>
                )}
                {uploadStatus.demoAudio === 'success' && (
                  <div className="mt-6 flex items-center justify-center text-green-600">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">{t.uploadSuccess}</span>
                  </div>
                )}
                {uploadStatus.demoAudio === 'error' && (
                  <div className="mt-6 flex items-center justify-center text-red-600">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">{t.uploadError}</span>
                  </div>
                )}
                {files.demoAudio && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {t.selected}: {files.demoAudio.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(files.demoAudio.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="datasetFile" className="text-sm font-medium">{t.step3.datasetFile}</Label>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                dragActive.datasetFile
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20"
              }`}
              onDragEnter={(e) => handleDrag(e, 'datasetFile')}
              onDragLeave={(e) => handleDrag(e, 'datasetFile')}
              onDragOver={(e) => handleDrag(e, 'datasetFile')}
              onDrop={(e) => handleDrop(e, 'datasetFile')}
              onClick={() => document.getElementById('datasetFile')?.click()}
            >
              <Input
                id="datasetFile"
                type="file"
                accept=".zip"
                onChange={(e) => handleFileChange(e, 'datasetFile')}
                disabled={uploadStatus.datasetFile === 'uploading'}
                className="hidden"
              />
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <p className="text-base font-medium mb-2">
                {t.step3.dragOrClickDataset}
              </p>
              <p className="text-sm text-muted-foreground">
                {t.step3.datasetFormat}
              </p>
              {uploadStatus.datasetFile === 'uploading' && (
                <div className="mt-6">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.datasetFile}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{t.uploading} {uploadProgress.datasetFile}%</p>
                </div>
              )}
              {uploadStatus.datasetFile === 'success' && (
                <div className="mt-6 flex items-center justify-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">{t.uploadSuccess}</span>
                </div>
              )}
              {uploadStatus.datasetFile === 'error' && (
                <div className="mt-6 flex items-center justify-center text-red-600">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">{t.uploadError}</span>
                </div>
              )}
              {files.datasetFile && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {t.selected}: {files.datasetFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(files.datasetFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="modelFile" className="text-sm font-medium">{basicInfo.publishType === "model" ? t.step3.modelFile : t.step3.sampleFile} ({basicInfo.publishType === "model" ? "ZIP" : "MP3/WAV"}, {basicInfo.publishType === "model" ? t.step3.maxSize500 : t.step3.maxSize10})</Label>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              dragActive.modelFile
                ? "border-primary bg-primary/10 scale-[1.01]"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20"
            }`}
            onDragEnter={(e) => handleDrag(e, 'modelFile')}
            onDragLeave={(e) => handleDrag(e, 'modelFile')}
            onDragOver={(e) => handleDrag(e, 'modelFile')}
            onDrop={(e) => handleDrop(e, 'modelFile')}
            onClick={() => document.getElementById('modelFile')?.click()}
          >
            <Input
              id="modelFile"
              type="file"
              accept={basicInfo.publishType === "model" ? ".zip" : ".mp3,.wav"}
              onChange={(e) => handleFileChange(e, 'modelFile')}
              disabled={uploadStatus.modelFile === 'uploading'}
              className="hidden"
            />
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <p className="text-base font-medium mb-2">
              {t.step3.dragOrClickModel}
            </p>
            <p className="text-sm text-muted-foreground">
              {t.step3.modelFormat}
            </p>
            {uploadStatus.modelFile === 'uploading' && (
              <div className="mt-6">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.modelFile}%` }}
                  ></div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{t.uploading} {uploadProgress.modelFile}%</p>
              </div>
            )}
            {uploadStatus.modelFile === 'success' && (
              <div className="mt-6 flex items-center justify-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">{t.uploadSuccess}</span>
              </div>
            )}
            {uploadStatus.modelFile === 'error' && (
              <div className="mt-6 flex items-center justify-center text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">{t.uploadError}</span>
              </div>
            )}
            {files.modelFile && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {t.selected}: {files.modelFile.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(files.modelFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-6">
        <Button type="button" variant="outline" onClick={handlePrevStep} className="px-6 transition-all duration-200">
          {t.step3.prevStep}
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="ml-auto px-8 shadow-md transition-all duration-200 hover:shadow-lg">
          {isSubmitting ? t.step3.saving : t.step3.save}
        </Button>
      </CardFooter>
    </Card>
  )

  const renderStep4 = () => (
    <Card className="shadow-lg transition-all duration-300 hover:shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">{t.step3.title}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {basicInfo.publishType === "model" 
            ? t.step3.modelDescription
            : t.step3.datasetDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="modelFile" className="text-sm font-medium">{basicInfo.publishType === "model" ? t.step3.modelFile : t.step3.sampleFile} ({basicInfo.publishType === "model" ? "ZIP" : "MP3/WAV"}, {basicInfo.publishType === "model" ? t.step3.maxSize500 : t.step3.maxSize10})</Label>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              dragActive.modelFile
                ? "border-primary bg-primary/10 scale-[1.01]"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20"
            }`}
            onDragEnter={(e) => handleDrag(e, 'modelFile')}
            onDragLeave={(e) => handleDrag(e, 'modelFile')}
            onDragOver={(e) => handleDrag(e, 'modelFile')}
            onDrop={(e) => handleDrop(e, 'modelFile')}
            onClick={() => document.getElementById('modelFile')?.click()}
          >
            <Input
              id="modelFile"
              type="file"
              accept={basicInfo.publishType === "model" ? ".zip" : ".mp3,.wav"}
              onChange={(e) => handleFileChange(e, 'modelFile')}
              disabled={uploadStatus.modelFile === 'uploading'}
              className="hidden"
            />
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <p className="text-base font-medium mb-2">
              {t.step3.dragOrClickModel}
            </p>
            <p className="text-sm text-muted-foreground">
              {t.step3.modelFormat}
            </p>
            {uploadStatus.modelFile === 'uploading' && (
              <div className="mt-6">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.modelFile}%` }}
                  ></div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{t.uploading} {uploadProgress.modelFile}%</p>
              </div>
            )}
            {uploadStatus.modelFile === 'success' && (
              <div className="mt-6 flex items-center justify-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">{t.uploadSuccess}</span>
              </div>
            )}
            {uploadStatus.modelFile === 'error' && (
              <div className="mt-6 flex items-center justify-center text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">{t.uploadError}</span>
              </div>
            )}
            {files.modelFile && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {t.selected}: {files.modelFile.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(files.modelFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-6">
        <Button type="button" variant="outline" onClick={handlePrevStep} className="px-6 transition-all duration-200">
          {t.step3.prevStep}
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="ml-auto px-8 shadow-md transition-all duration-200 hover:shadow-lg">
          {isSubmitting ? t.step3.saving : t.step3.save}
        </Button>
      </CardFooter>
    </Card>
  )
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {alert.show && (
        <div className="mb-6">
          <Alert variant={alert.type === 'error' ? 'destructive' : 'default'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        </div>
      )}
      
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2 text-center">{t.title}</h1>
        <p className="text-muted-foreground text-center text-lg">{t.description}</p>
      </div>
      
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3].map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  currentStep >= step
                    ? "bg-primary text-primary-foreground shadow-md scale-110"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > step ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  step
                )}
              </div>
              {index < 2 && (
                <div
                  className={`w-16 h-1 mx-2 transition-all duration-300 ${
                    currentStep > step
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm">
          <span className={`transition-all duration-300 ${currentStep === 1 ? "font-medium text-primary" : "text-muted-foreground"}`}>
            {t.steps.basicInfo}
          </span>
          <span className={`transition-all duration-300 ${currentStep === 2 ? "font-medium text-primary" : "text-muted-foreground"}`}>
            {t.steps.detailedInfo}
          </span>
          <span className={`transition-all duration-300 ${currentStep === 3 ? "font-medium text-primary" : "text-muted-foreground"}`}>
            {t.steps.fileUpload}
          </span>
        </div>
      </div>
      
      <div className="transition-all duration-500">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  )
}