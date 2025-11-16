import { createServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createServiceClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const limit = parseInt(searchParams.get('limit') || '40')

    // 解析 Authorization 中的 Bearer token 获取用户
    let authUserId: string | null = null
    const authHeader =
      request.headers.get('authorization') ||
      request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const {
        data: { user },
      } = await supabase.auth.getUser(token)
      authUserId = user?.id || null
    }

    // 调用数据库中的推荐函数
    const { data, error } = await supabase.rpc(
      'get_home_recommendations',
      {
        p_user_id: authUserId,
        p_limit: limit,
      },
    )

    if (error) {
      console.error('调用推荐函数失败:', error)
      return NextResponse.json(
        { error: '获取推荐列表失败，请稍后重试' },
        { status: 500 },
      )
    }

    const items = (data || []).map((row: any) => ({
      item_type: row.kind, // 'model' | 'dataset'
      id: row.item_id,
      user_id: row.user_id,
      name: row.name,
      cover_image_url: row.cover_image_url,
      content_category: row.content_category,
      type: row.type,
      like_count: row.like_count,
      view_count: row.view_count,
      download_count: row.download_count,
      created_at: row.created_at,
    }))

    return NextResponse.json({
      items,
      hasMore: items.length >= limit,
      total: items.length,
    })
  } catch (error) {
    console.error('获取推荐列表失败:', error)
    return NextResponse.json(
      { error: '获取推荐列表失败，请稍后重试' },
      { status: 500 },
    )
  }
}

