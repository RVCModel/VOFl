import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 获取用户点赞状态
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')
    const userId = searchParams.get('userId')

    if (!modelId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    let isLiked = false
    
    // 只有当提供了userId时才检查用户是否已点赞
    if (userId) {
      const { data, error } = await supabase
        .from('model_likes')
        .select('*')
        .eq('model_id', modelId)
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      isLiked = !!data
    }

    // 获取模型的点赞总数
    const { data: modelData } = await supabase
      .from('models')
      .select('like_count')
      .eq('id', modelId)
      .single()

    const likeCount = modelData?.like_count || 0

    return NextResponse.json({ isLiked, likeCount })
  } catch (error) {
    console.error('获取点赞状态失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 切换点赞状态
export async function POST(request: Request) {
  try {
    const { modelId, userId } = await request.json()

    if (!modelId || !userId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 检查是否已点赞
    const { data: existingLike, error: fetchError } = await supabase
      .from('model_likes')
      .select('*')
      .eq('model_id', modelId)
      .eq('user_id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    let isLiked = false

    if (existingLike) {
      // 取消点赞
      const { error } = await supabase
        .from('model_likes')
        .delete()
        .eq('model_id', modelId)
        .eq('user_id', userId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // 点赞数由数据库触发器自动更新，无需手动更新
    } else {
      // 添加点赞
      const { error } = await supabase
        .from('model_likes')
        .insert({
          model_id: modelId,
          user_id: userId
        })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      isLiked = true

      // 点赞数由数据库触发器自动更新，无需手动更新
    }

    // 获取更新后的点赞数
    const { data: updatedModel } = await supabase
      .from('models')
      .select('like_count')
      .eq('id', modelId)
      .single()

    const likeCount = updatedModel?.like_count || 0

    return NextResponse.json({ isLiked, likeCount })
  } catch (error) {
    console.error('切换点赞状态失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}