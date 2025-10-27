import { NextRequest, NextResponse } from 'next/server'
import { S3Client, UploadPartCommand } from '@aws-sdk/client-s3'
import { createServiceClient } from '@/lib/supabase'

// 设置CORS头
function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// 处理OPTIONS请求
export async function OPTIONS(request: NextRequest) {
  return setCorsHeaders(new NextResponse(null, { status: 200 }))
}

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
  
  try {
    // 使用 access token 验证用户身份
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      console.error('Auth error:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Auth exception:', error)
    return null
  }
}

// 上传文件分块
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await verifyUser(request)
    if (!user) {
      return setCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const formData = await request.formData()
    const uploadId = formData.get('uploadId') as string
    const key = formData.get('key') as string
    const partNumber = parseInt(formData.get('partNumber') as string)
    const chunk = formData.get('chunk') as File

    if (!uploadId || !key || !partNumber || !chunk) {
      console.error('Missing parameters:', { uploadId, key, partNumber, chunkSize: chunk?.size })
      return setCorsHeaders(NextResponse.json({ error: 'Missing required parameters' }, { status: 400 }))
    }

    // 验证用户是否有权限上传此文件（文件路径应包含用户ID）
    if (!key.includes(`/${user.id}/`)) {
      console.error('Permission denied for user:', user.id, 'key:', key)
      return setCorsHeaders(NextResponse.json({ error: 'Permission denied' }, { status: 403 }))
    }

    // 检查分块大小 - Vercel限制约为4.5MB
    const chunkSize = chunk.size
    const maxChunkSize = 500 * 1024 // 500KB - 与前端保持一致
    
    if (chunkSize > maxChunkSize) {
      console.error(`Chunk size ${chunkSize} exceeds maximum allowed size ${maxChunkSize}`)
      return setCorsHeaders(NextResponse.json({ 
        error: 'Chunk too large', 
        details: `Maximum chunk size is ${maxChunkSize / 1024}KB, got ${chunkSize / 1024}KB` 
      }, { status: 413 }))
    }

    console.log(`Processing chunk ${partNumber} for upload ${uploadId}, size: ${chunkSize / 1024 / 1024}MB`)

    // 将文件转换为缓冲区
    const buffer = Buffer.from(await chunk.arrayBuffer())

    // 上传分块
    const uploadCommand = new UploadPartCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: buffer,
    })

    const result = await r2Client.send(uploadCommand)
    console.log(`Successfully uploaded chunk ${partNumber}, ETag: ${result.ETag}`)

    // 返回分块的ETag
    return setCorsHeaders(NextResponse.json({
      partNumber,
      etag: result.ETag,
    }))

  } catch (error) {
    console.error('Chunk upload error:', error)
    return setCorsHeaders(NextResponse.json(
      { error: 'Failed to upload chunk', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    ))
  }
}