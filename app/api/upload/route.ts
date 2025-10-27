import { createServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'cover', 'reference-audio', 'demo-audio', 'model-file'
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    if (!type) {
      return NextResponse.json(
        { error: 'File type not specified' },
        { status: 400 }
      )
    }
    
    // 验证文件类型和大小
    const validTypes = {
      'cover': ['image/jpeg', 'image/png', 'image/webp'],
      'reference-audio': ['audio/mpeg', 'audio/wav'],
      'demo-audio': ['audio/mpeg', 'audio/wav'],
      'model-file': ['application/zip', 'application/x-zip-compressed']
    }
    
    if (!validTypes[type as keyof typeof validTypes].includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type for ${type}` },
        { status: 400 }
      )
    }
    
    // 音频文件大小限制为2MB
    if ((type === 'reference-audio' || type === 'demo-audio') && file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file size must be less than 2MB' },
        { status: 400 }
      )
    }
    
    // 模型文件大小限制为500MB
    if (type === 'model-file' && file.size > 500 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Model file size must be less than 500MB' },
        { status: 400 }
      )
    }
    
    // 获取当前用户
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // 生成唯一文件名
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${type}/${Date.now()}.${fileExt}`
    
    // 上传文件到Supabase存储
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }
    
    // 获取公共URL
    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(fileName)
    
    return NextResponse.json({
      url: urlData.publicUrl,
      path: fileName,
      size: file.size,
      type: file.type
    })
  } catch (error) {
    console.error('Error in upload API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}