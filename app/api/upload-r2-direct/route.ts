import { NextRequest, NextResponse } from 'next/server'
import { S3Client, CreateMultipartUploadCommand, CompleteMultipartUploadCommand, GetObjectCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createServiceClient } from '@/lib/supabase'

// 设置CORS头
function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
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

// 生成唯一文件名
function generateFileName(originalName: string, userId: string, type: string) {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = originalName.split('.').pop()
  return `${type}/${userId}/${timestamp}-${randomString}.${extension}`
}

// 初始化多部分上传并返回预签名URL
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await verifyUser(request)
    if (!user) {
      return setCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { fileName, fileType, fileCategory, fileSize, totalChunks } = await request.json()

    if (!fileName || !fileType || !fileCategory || !totalChunks) {
      return setCorsHeaders(NextResponse.json({ error: 'Missing required parameters' }, { status: 400 }))
    }

    // 验证文件类型（MIME类型）
    const allowedTypes = [
      'application/zip', 
      'application/x-zip-compressed', 
      'application/octet-stream',
      'application/x-rar-compressed', 
      'application/x-7z-compressed'
    ]

    if (!allowedTypes.includes(fileType)) {
      return setCorsHeaders(NextResponse.json({ error: 'Invalid file type' }, { status: 400 }))
    }

    // 生成唯一文件名
    const key = generateFileName(fileName, user.id, fileCategory)

    // 创建多部分上传
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: fileType,
    })

    const { UploadId } = await r2Client.send(createCommand)

    if (!UploadId) {
      return setCorsHeaders(NextResponse.json({ error: 'Failed to create multipart upload' }, { status: 500 }))
    }

    // 返回上传ID和文件键，客户端将使用这些信息直接上传到R2
    return setCorsHeaders(NextResponse.json({
      uploadId: UploadId,
      key,
      fileName,
      fileType,
      // 返回R2端点，客户端将使用它直接上传
      endpoint: process.env.R2_ENDPOINT_URL,
      bucket: process.env.R2_BUCKET_NAME,
      region: 'auto',
      // 返回访问密钥，客户端将使用它们进行签名
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }))

  } catch (error) {
    console.error('Multipart upload initialization error:', error)
    return setCorsHeaders(NextResponse.json(
      { error: 'Failed to initialize upload', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    ))
  }
}

// 完成多部分上传
export async function PUT(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await verifyUser(request)
    if (!user) {
      return setCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { uploadId, key, parts } = await request.json()

    if (!uploadId || !key || !parts) {
      return setCorsHeaders(NextResponse.json({ error: 'Missing required parameters' }, { status: 400 }))
    }

    // 验证用户是否有权限完成此上传（文件路径应包含用户ID）
    if (!key.includes(`/${user.id}/`)) {
      return setCorsHeaders(NextResponse.json({ error: 'Permission denied' }, { status: 403 }))
    }

    // 完成多部分上传
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((part: any) => ({
          ETag: part.ETag,
          PartNumber: part.PartNumber,
        })),
      },
    })

    const result = await r2Client.send(completeCommand)

    // 生成公开访问 URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`

    return setCorsHeaders(NextResponse.json({
      url: publicUrl,
      key,
      etag: result.ETag,
    }))

  } catch (error) {
    console.error('Multipart upload completion error:', error)
    return setCorsHeaders(NextResponse.json(
      { error: 'Failed to complete upload', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    ))
  }
}

// 取消多部分上传
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await verifyUser(request)
    if (!user) {
      return setCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { uploadId, key } = await request.json()

    if (!uploadId || !key) {
      return setCorsHeaders(NextResponse.json({ error: 'Missing required parameters' }, { status: 400 }))
    }

    // 验证用户是否有权限取消此上传（文件路径应包含用户ID）
    if (!key.includes(`/${user.id}/`)) {
      return setCorsHeaders(NextResponse.json({ error: 'Permission denied' }, { status: 403 }))
    }

    // 取消多部分上传
    const abortCommand = new AbortMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      UploadId: uploadId,
    })

    await r2Client.send(abortCommand)

    return setCorsHeaders(NextResponse.json({ success: true }))

  } catch (error) {
    console.error('Multipart upload abort error:', error)
    return setCorsHeaders(NextResponse.json(
      { error: 'Failed to abort upload', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    ))
  }
}