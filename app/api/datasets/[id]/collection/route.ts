import { createServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    // 获取请求体
    const body = await request.json()
    const { userId, action } = body // action: 'collect' 或 'uncollect'
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    // 检查数据集是否存在
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('id, collection_count')
      .eq('id', id)
      .single()
    
    if (datasetError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      )
    }
    
    if (action === 'collect') {
      // 检查是否已经收藏
      const { data: existingCollection } = await supabase
        .from('dataset_collections')
        .select('id')
        .eq('dataset_id', id)
        .eq('user_id', userId)
        .single()
      
      if (existingCollection) {
        return NextResponse.json(
          { error: 'Already collected' },
          { status: 400 }
        )
      }
      
      // 添加收藏记录
      const { error: collectionError } = await supabase
        .from('dataset_collections')
        .insert({
          dataset_id: id,
          user_id: userId
        })
      
      if (collectionError) {
        console.error('Error adding collection:', collectionError)
        return NextResponse.json(
          { error: 'Failed to collect dataset' },
          { status: 500 }
        )
      }
      
      // 增加收藏数
      const { error: updateError } = await supabase
        .from('datasets')
        .update({ collection_count: (dataset.collection_count || 0) + 1 })
        .eq('id', id)
      
      if (updateError) {
        console.error('Error updating collection count:', updateError)
      }
      
      return NextResponse.json({ 
        success: true, 
        collected: true, 
        collectionCount: (dataset.collection_count || 0) + 1 
      })
    } else if (action === 'uncollect') {
      // 检查是否已收藏
      const { data: existingCollection } = await supabase
        .from('dataset_collections')
        .select('id')
        .eq('dataset_id', id)
        .eq('user_id', userId)
        .single()
      
      if (!existingCollection) {
        return NextResponse.json(
          { error: 'Not collected yet' },
          { status: 400 }
        )
      }
      
      // 删除收藏记录
      const { error: uncollectError } = await supabase
        .from('dataset_collections')
        .delete()
        .eq('dataset_id', id)
        .eq('user_id', userId)
      
      if (uncollectError) {
        console.error('Error removing collection:', uncollectError)
        return NextResponse.json(
          { error: 'Failed to uncollect dataset' },
          { status: 500 }
        )
      }
      
      // 减少收藏数
      const newCollectionCount = Math.max(0, (dataset.collection_count || 0) - 1)
      const { error: updateError } = await supabase
        .from('datasets')
        .update({ collection_count: newCollectionCount })
        .eq('id', id)
      
      if (updateError) {
        console.error('Error updating collection count:', updateError)
      }
      
      return NextResponse.json({ 
        success: true, 
        collected: false, 
        collectionCount: newCollectionCount 
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error in dataset collection API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}