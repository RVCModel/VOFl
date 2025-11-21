import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 获取用户收藏状态
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    let userId: string | null = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id || null
    }

    if (!modelId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    let isCollected = false
    
    // 只有当提供了userId时才检查用户是否已收藏
    if (userId) {
      const { data, error } = await supabase
        .from('model_collections')
        .select('*')
        .eq('model_id', modelId)
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      isCollected = !!data
    }

    // 获取模型的收藏总数
    const { data: modelData } = await supabase
      .from('models')
      .select('collection_count')
      .eq('id', modelId)
      .single()

    const collectionCount = modelData?.collection_count || 0

    return NextResponse.json({ isCollected, collectionCount })
  } catch (error) {
    console.error('获取收藏状态失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 切换收藏状态
export async function POST(request: Request) {
  try {
    const { modelId } = await request.json()

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '用户认证失败' }, { status: 401 })
    }
    const userId = user.id

    if (!modelId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 检查是否已收藏
    const { data: existingCollection, error: fetchError } = await supabase
      .from('model_collections')
      .select('*')
      .eq('model_id', modelId)
      .eq('user_id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    let isCollected = false

    if (existingCollection) {
      // 取消收藏
      const { error } = await supabase
        .from('model_collections')
        .delete()
        .eq('model_id', modelId)
        .eq('user_id', userId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // 更新模型收藏数（通过触发器自动处理）
    } else {
      // 添加收藏
      const { error } = await supabase
        .from('model_collections')
        .insert({
          model_id: modelId,
          user_id: userId
        })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      isCollected = true

      // 更新模型收藏数（通过触发器自动处理）
    }

    // 获取更新后的收藏数
    const { data: updatedModel } = await supabase
      .from('models')
      .select('collection_count')
      .eq('id', modelId)
      .single()

    const collectionCount = updatedModel?.collection_count || 0

    return NextResponse.json({ isCollected, collectionCount })
  } catch (error) {
    console.error('切换收藏状态失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}