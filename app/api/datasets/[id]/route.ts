import { createServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const includeAuthor = searchParams.get('includeAuthor') === 'true'
    const includeAuthorDatasets = searchParams.get('includeAuthorDatasets') === 'true'
    const userId = searchParams.get('userId') // 用于获取点赞/收藏状态
    
    // 获取数据集信息
    const { data: dataset, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching dataset:', error)
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      )
    }
    
    let result: any = { ...dataset }
    
    // 获取用户信息
    if (includeAuthor) {
      const { data: user } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .eq('id', dataset.user_id)
        .single()
      
      result.profiles = user || null
    }
    
    // 获取作者的其他数据集
    if (includeAuthorDatasets) {
      const { data: authorDatasets } = await supabase
        .from('datasets')
        .select('id, name, description, cover_image_url, type, view_count, like_count, is_paid, price')
        .eq('user_id', dataset.user_id)
        .neq('id', id) // 排除当前数据集
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(6) // 限制为6个
      
      result.authorDatasets = authorDatasets || []
    }
    
    // 获取用户的点赞/收藏状态
    if (userId) {
      // 检查点赞状态
      const { data: likeData } = await supabase
        .from('dataset_likes')
        .select('id')
        .eq('dataset_id', id)
        .eq('user_id', userId)
        .single()
      
      // 检查收藏状态
      const { data: collectionData } = await supabase
        .from('dataset_collections')
        .select('id')
        .eq('dataset_id', id)
        .eq('user_id', userId)
        .single()
      
      result.isLiked = !!likeData
      result.isCollected = !!collectionData
    }
    
    // 增加浏览次数
    await supabase
      .from('datasets')
      .update({ view_count: dataset.view_count + 1 })
      .eq('id', id)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in dataset API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // 验证用户权限
    const { data: dataset, error: fetchError } = await supabase
      .from('datasets')
      .select('user_id')
      .eq('id', id)
      .single()
    
    if (fetchError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      )
    }
    
    // 获取当前用户
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user || user.id !== dataset.user_id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    // 更新数据集
    const { data: updatedDataset, error: updateError } = await supabase
      .from('datasets')
      .update({
        name: body.name,
        type: body.type,
        content_category: body.content_category,
        tags: body.tags,
        is_original: body.is_original,
        original_author: body.original_author,
        cover_image_url: body.cover_image_url,
        description: body.description,
        visibility: body.visibility,
        is_paid: body.is_paid,
        price: body.price,
        files: body.files,
        status: body.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating dataset:', updateError)
      return NextResponse.json(
        { error: 'Failed to update dataset' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(updatedDataset)
  } catch (error) {
    console.error('Error in dataset API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // 验证用户权限
    const { data: dataset, error: fetchError } = await supabase
      .from('datasets')
      .select('user_id')
      .eq('id', id)
      .single()
    
    if (fetchError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      )
    }
    
    // 获取当前用户
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user || user.id !== dataset.user_id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    // 删除数据集
    const { error: deleteError } = await supabase
      .from('datasets')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      console.error('Error deleting dataset:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete dataset' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in dataset API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}