import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 获取用户点赞的模型列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID参数' }, { status: 400 })
    }

    // 计算偏移量
    const offset = (page - 1) * limit

    // 获取用户点赞的模型
    const { data, error } = await supabase
      .from('model_likes')
      .select(`
        id,
        created_at,
        model_id,
        models (
          id,
          name,
          type,
          content_category,
          tags,
          cover_image_url,
          description,
          visibility,
          is_paid,
          price,
          like_count,
          view_count,
          download_count,
          created_at,
          profiles (
            username,
            avatar_url
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 获取总数
    const { count, error: countError } = await supabase
      .from('model_likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    // 提取模型数据
    const models = data?.map(item => item.models).filter(Boolean) || []

    return NextResponse.json({
      models,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('获取用户点赞模型失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}