import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { createServiceClient } from '@/lib/supabase'
import formidable from 'formidable'
import fs from 'fs'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

// 创建 Cloudflare R2 客户端
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

// 验证用户身份
async function verifyUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return null
  }
  
  return user
}

// 生成唯一文件名
function generateFileName(originalName: string, userId: string, type: string) {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = originalName.split('.').pop()
  return `${type}/${userId}/${timestamp}-${randomString}.${extension}`
}

// 手动解析表单数据
async function parseFormData(request: NextRequest): Promise<{ fields: any, files: any }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 500 * 1024 * 1024, // 500MB
      multiples: false,
    })

    // 将NextRequest转换为formidable可接受的格式
    const req = request as any
    req.headers = Object.fromEntries(request.headers.entries())

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err)
        return
      }
      resolve({ fields, files })
    })
  })
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await verifyUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 解析表单数据
    const { fields, files } = await parseFormData(request)
    const file = files.file?.[0]
    const type = fields.type?.[0] || 'general'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 验证文件类型和大小
    const allowedTypes = {
      'cover': ['image/jpeg', 'image/png', 'image/webp'],
      'reference-audio': ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/m4a'],
      'demo-audio': ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/m4a'],
      'model-file': ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
      'dataset-file': ['application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/x-7z-compressed'],
      'general': ['*']
    }

    const typeAllowedTypes = allowedTypes[type as keyof typeof allowedTypes] || allowedTypes.general
    if (!typeAllowedTypes.includes('*') && !typeAllowedTypes.includes(file.mimetype || '')) {
      return NextResponse.json({ 
        error: `Invalid file type. Allowed types: ${typeAllowedTypes.join(', ')}` 
      }, { status: 400 })
    }

    // 根据文件类型设置不同的最大大小限制
    const maxSizeByType = {
      'model-file': 500 * 1024 * 1024, // 500MB for model files
      'dataset-file': 500 * 1024 * 1024, // 500MB for dataset files
      'cover': 5 * 1024 * 1024, // 5MB for cover images
      'reference-audio': 10 * 1024 * 1024, // 10MB for reference audio
      'demo-audio': 10 * 1024 * 1024, // 10MB for demo audio
      'general': 100 * 1024 * 1024, // 100MB for general files
    }
    
    const maxSize = maxSizeByType[type as keyof typeof maxSizeByType] || 100 * 1024 * 1024
    const maxSizeMB = maxSize / (1024 * 1024)
    
    if (file.size > maxSize) {
      return NextResponse.json({ error: `File too large. Maximum size is ${maxSizeMB}MB` }, { status: 400 })
    }

    // 生成唯一文件名
    const fileName = generateFileName(file.originalFilename || 'file', user.id, type)

    // 读取文件内容
    const fileContent = await fs.promises.readFile(file.filepath)

    // 上传文件到 Cloudflare R2
    const upload = new Upload({
      client: r2Client,
      params: {
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: fileName,
        Body: fileContent,
        ContentType: file.mimetype || 'application/octet-stream',
      },
    })

    await upload.done()

    // 生成公开访问 URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`

    // 返回文件信息
    return NextResponse.json({
      url: publicUrl,
      name: file.originalFilename,
      size: file.size,
      type: file.mimetype,
      key: fileName
    })

  } catch (error) {
    console.error('Upload error:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    console.error('R2_PUBLIC_URL:', process.env.R2_PUBLIC_URL)
    console.error('R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME)
    
    return NextResponse.json(
      { error: 'Failed to upload file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await verifyUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 获取请求体
    const { key } = await request.json()

    if (!key) {
      return NextResponse.json({ error: 'File key is required' }, { status: 400 })
    }

    // 验证用户是否有权限删除此文件（文件路径应包含用户ID）
    if (!key.includes(`/${user.id}/`)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // 从 Cloudflare R2 删除文件
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })

    await r2Client.send(command)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}