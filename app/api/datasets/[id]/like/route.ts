import { createServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // 获取请求体
    const body = await request.json()
    const { userId, action } = body // action: 'like' 或 'unlike'
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    // 检查数据集是否存在
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('id, like_count')
      .eq('id', id)
      .single()
    
    if (datasetError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      )
    }
    
    if (action === 'like') {
      // 检查是否已经点赞
      const { data: existingLike } = await supabase
        .from('dataset_likes')
        .select('id')
        .eq('dataset_id', id)
        .eq('user_id', userId)
        .single()
      
      if (existingLike) {
        return NextResponse.json(
          { error: 'Already liked' },
          { status: 400 }
        )
      }
      
      // 添加点赞记录
      const { error: likeError } = await supabase
        .from('dataset_likes')
        .insert({
          dataset_id: id,
          user_id: userId
        })
      
      if (likeError) {
        console.error('Error adding like:', likeError)
        return NextResponse.json(
          { error: 'Failed to like dataset' },
          { status: 500 }
        )
      }
      
      // 增加点赞数
      const { error: updateError } = await supabase
        .from('datasets')
        .update({ like_count: dataset.like_count + 1 })
        .eq('id', id)
      
      if (updateError) {
        console.error('Error updating like count:', updateError)
      }
      
      return NextResponse.json({ 
        success: true, 
        liked: true, 
        likeCount: dataset.like_count + 1 
      })
    } else if (action === 'unlike') {
      // 检查是否已点赞
      const { data: existingLike } = await supabase
        .from('dataset_likes')
        .select('id')
        .eq('dataset_id', id)
        .eq('user_id', userId)
        .single()
      
      if (!existingLike) {
        return NextResponse.json(
          { error: 'Not liked yet' },
          { status: 400 }
        )
      }
      
      // 删除点赞记录
      const { error: unlikeError } = await supabase
        .from('dataset_likes')
        .delete()
        .eq('dataset_id', id)
        .eq('user_id', userId)
      
      if (unlikeError) {
        console.error('Error removing like:', unlikeError)
        return NextResponse.json(
          { error: 'Failed to unlike dataset' },
          { status: 500 }
        )
      }
      
      // 减少点赞数
      const newLikeCount = Math.max(0, dataset.like_count - 1)
      const { error: updateError } = await supabase
        .from('datasets')
        .update({ like_count: newLikeCount })
        .eq('id', id)
      
      if (updateError) {
        console.error('Error updating like count:', updateError)
      }
      
      return NextResponse.json({ 
        success: true, 
        liked: false, 
        likeCount: newLikeCount 
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error in dataset like API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}