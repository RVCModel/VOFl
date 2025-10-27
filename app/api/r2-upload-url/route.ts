import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@supabase/supabase-js'

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 创建 R2 客户端
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

// 验证 Supabase 用户
async function verifyUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { filename, contentType, fileType = 'general' } = await request.json()
    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 })
    }

    // 生成唯一 Key
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const key = `${fileType}/${user.id}/${timestamp}-${random}-${filename}`

    // 创建上传命令
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: contentType,
    })

    // 生成签名上传 URL（有效期 1 小时）
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`

    return NextResponse.json({ uploadUrl: signedUrl, key, publicUrl })
  } catch (error) {
    console.error('Error creating R2 signed URL:', error)
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }
}