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
    
    // 获取模型信息，但不包含model_file_url字段
    const { data: model, error } = await supabase
      .from('models')
      .select(`
        id, user_id, name, type, content_category, tags, is_original, original_author,
        cover_image_url, description, visibility, is_paid, price, reference_audio_url,
        demo_audio_url, status, download_count, view_count, like_count, created_at, updated_at
      `)
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching model:', error)
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }
    
    // 获取用户信息
    const { data: user } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, followers_count, following_count')
      .eq('id', model.user_id)
      .single()
    
    // 增加浏览次数
    await supabase
      .from('models')
      .update({ view_count: model.view_count + 1 })
      .eq('id', id)
    
    return NextResponse.json({
      ...model,
      profiles: user || null
    })
  } catch (error) {
    console.error('Error in model API:', error)
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
    const { data: model, error: fetchError } = await supabase
      .from('models')
      .select('user_id')
      .eq('id', id)
      .single()
    
    if (fetchError || !model) {
      return NextResponse.json(
        { error: 'Model not found' },
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
    
    if (authError || !user || user.id !== model.user_id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    // 更新模型
    const { data: updatedModel, error: updateError } = await supabase
      .from('models')
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
        reference_audio_url: body.reference_audio_url,
        demo_audio_url: body.demo_audio_url,
        model_file_url: body.model_file_url,
        status: body.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating model:', updateError)
      return NextResponse.json(
        { error: 'Failed to update model' },
        { status: 500 }
      )
    }
    
    // 如果状态更改为published，触发sitemap刷新
    if (body.status === 'published' && model.status !== 'published') {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/sitemap/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'model',
            id: id
          })
        })
      } catch (refreshError) {
        console.error('Failed to trigger sitemap refresh:', refreshError)
        // 不影响主要功能，只记录错误
      }
    }
    
    return NextResponse.json(updatedModel)
  } catch (error) {
    console.error('Error in model API:', error)
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
    const { data: model, error: fetchError } = await supabase
      .from('models')
      .select('user_id')
      .eq('id', id)
      .single()
    
    if (fetchError || !model) {
      return NextResponse.json(
        { error: 'Model not found' },
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
    
    if (authError || !user || user.id !== model.user_id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    // 删除模型
    const { error: deleteError } = await supabase
      .from('models')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      console.error('Error deleting model:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete model' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in model API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}