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
    const datasetId = searchParams.get('datasetId')
    const userId = searchParams.get('userId')

    if (!datasetId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    let isCollected = false
    
    // 只有当提供了userId时才检查用户是否已收藏
    if (userId) {
      const { data, error } = await supabase
        .from('dataset_collections')
        .select('*')
        .eq('dataset_id', datasetId)
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      isCollected = !!data
    }

    // 获取数据集的收藏总数
    const { data: datasetData } = await supabase
      .from('datasets')
      .select('collection_count')
      .eq('id', datasetId)
      .single()

    const collectionCount = datasetData?.collection_count || 0

    return NextResponse.json({ isCollected, collectionCount })
  } catch (error) {
    console.error('获取收藏状态失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 切换收藏状态
export async function POST(request: Request) {
  try {
    const { datasetId, userId } = await request.json()

    if (!datasetId || !userId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 检查是否已收藏
    const { data: existingCollection, error: fetchError } = await supabase
      .from('dataset_collections')
      .select('*')
      .eq('dataset_id', datasetId)
      .eq('user_id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    let isCollected = false

    if (existingCollection) {
      // 取消收藏
      const { error } = await supabase
        .from('dataset_collections')
        .delete()
        .eq('dataset_id', datasetId)
        .eq('user_id', userId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // 更新数据集收藏数
      const { error: updateError } = await supabase
        .from('datasets')
        .update({ collection_count: supabase.rpc('decrement', { x: 'collection_count' }) })
        .eq('id', datasetId)

      if (updateError) {
        // 如果RPC失败，尝试手动更新
        const { data: datasetData } = await supabase
          .from('datasets')
          .select('collection_count')
          .eq('id', datasetId)
          .single()

        if (datasetData) {
          await supabase
            .from('datasets')
            .update({ collection_count: Math.max(0, (datasetData.collection_count || 0) - 1) })
            .eq('id', datasetId)
        }
      }
    } else {
      // 添加收藏
      const { error } = await supabase
        .from('dataset_collections')
        .insert({
          dataset_id: datasetId,
          user_id: userId
        })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      isCollected = true

      // 更新数据集收藏数
      const { error: updateError } = await supabase
        .from('datasets')
        .update({ collection_count: supabase.rpc('increment', { x: 'collection_count' }) })
        .eq('id', datasetId)

      if (updateError) {
        // 如果RPC失败，尝试手动更新
        const { data: datasetData } = await supabase
          .from('datasets')
          .select('collection_count')
          .eq('id', datasetId)
          .single()

        if (datasetData) {
          await supabase
            .from('datasets')
            .update({ collection_count: (datasetData.collection_count || 0) + 1 })
            .eq('id', datasetId)
        }
      }
    }

    // 获取更新后的收藏数
    const { data: updatedDataset } = await supabase
      .from('datasets')
      .select('collection_count')
      .eq('id', datasetId)
      .single()

    const collectionCount = updatedDataset?.collection_count || 0

    return NextResponse.json({ isCollected, collectionCount })
  } catch (error) {
    console.error('切换收藏状态失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}