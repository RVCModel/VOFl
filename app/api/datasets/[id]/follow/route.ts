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
    const { userId, action } = body // action: 'follow' 或 'unfollow'
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    // 获取数据集信息以获取作者ID
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('user_id')
      .eq('id', id)
      .single()
    
    if (datasetError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      )
    }
    
    const authorId = dataset.user_id
    
    // 不能关注自己
    if (userId === authorId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }
    
    if (action === 'follow') {
      // 检查是否已经关注
      const { data: existingFollow } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', userId)
        .eq('following_id', authorId)
        .single()
      
      if (existingFollow) {
        return NextResponse.json(
          { error: 'Already following' },
          { status: 400 }
        )
      }
      
      // 添加关注记录
      const { error: followError } = await supabase
        .from('user_follows')
        .insert({
          follower_id: userId,
          following_id: authorId
        })
      
      if (followError) {
        console.error('Error adding follow:', followError)
        return NextResponse.json(
          { error: 'Failed to follow user' },
          { status: 500 }
        )
      }
      
      // 增加作者的粉丝数
      const { error: updateError } = await supabase.rpc('increment_followers_count', {
        user_uuid: authorId
      })
      
      if (updateError) {
        console.error('Error updating followers count:', updateError)
      }
      
      return NextResponse.json({ 
        success: true, 
        following: true
      })
    } else if (action === 'unfollow') {
      // 检查是否已关注
      const { data: existingFollow } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', userId)
        .eq('following_id', authorId)
        .single()
      
      if (!existingFollow) {
        return NextResponse.json(
          { error: 'Not following yet' },
          { status: 400 }
        )
      }
      
      // 删除关注记录
      const { error: unfollowError } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', userId)
        .eq('following_id', authorId)
      
      if (unfollowError) {
        console.error('Error removing follow:', unfollowError)
        return NextResponse.json(
          { error: 'Failed to unfollow user' },
          { status: 500 }
        )
      }
      
      // 减少作者的粉丝数
      const { error: updateError } = await supabase.rpc('decrement_followers_count', {
        user_uuid: authorId
      })
      
      if (updateError) {
        console.error('Error updating followers count:', updateError)
      }
      
      return NextResponse.json({ 
        success: true, 
        following: false
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error in dataset follow API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 获取关注状态
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    // 获取数据集信息以获取作者ID
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('user_id')
      .eq('id', id)
      .single()
    
    if (datasetError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      )
    }
    
    const authorId = dataset.user_id
    
    // 检查是否已关注
    const { data: followData } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', authorId)
      .single()
    
    return NextResponse.json({
      following: !!followData
    })
  } catch (error) {
    console.error('Error in dataset follow API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}