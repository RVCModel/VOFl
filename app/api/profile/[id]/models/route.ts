import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

// 获取用户发布的模型
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params

    // 获取用户发布的模型
    const { data: modelsData, error: modelsError } = await supabase
      .from('models')
      .select(`
        id, user_id, name, type, content_category, tags, is_original, original_author,
        cover_image_url, description, visibility, is_paid, price, model_file_url,
        reference_audio_url, demo_audio_url, status, download_count, view_count, like_count, created_at, updated_at
      `)
      .eq('user_id', userId)
      .eq('visibility', 'public') // 只获取公开可见的模型
      .eq('status', 'published') // 只获取已发布的模型
      .order('created_at', { ascending: false })

    if (modelsError) {
      console.error('获取模型列表失败:', modelsError)
      return NextResponse.json(
        { error: '获取模型列表失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ models: modelsData || [] })
  } catch (error) {
    console.error('获取模型列表时发生错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}