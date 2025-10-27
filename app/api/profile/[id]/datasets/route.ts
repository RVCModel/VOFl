import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

// 获取用户发布的数据集
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params

    // 获取用户发布的数据集
    const { data: datasetsData, error: datasetsError } = await supabase
      .from('datasets')
      .select(`
        id, user_id, name, type, content_category, tags, is_original, original_author,
        cover_image_url, description, visibility, is_paid, price, file_url,
        file_size, file_type, status, download_count, view_count, like_count, created_at, updated_at
      `)
      .eq('user_id', userId)
      .eq('visibility', 'public') // 只获取公开可见的数据集
      .eq('status', 'published') // 只获取已发布的数据集
      .order('created_at', { ascending: false })

    if (datasetsError) {
      console.error('获取数据集列表失败:', datasetsError)
      return NextResponse.json(
        { error: '获取数据集列表失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ datasets: datasetsData || [] })
  } catch (error) {
    console.error('获取数据集列表时发生错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}