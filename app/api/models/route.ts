import { createServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// 创建Supabase服务端客户端
const supabase = createServiceClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '0')
    const category = searchParams.get('category') || 'all'
    const type = searchParams.get('type') || 'all'
    const sortBy = searchParams.get('sortBy') || 'recommended'
    const searchQuery = searchParams.get('searchQuery') || ''
    const userId = searchParams.get('userId')
    
    let allModels: any[] = []
    
    // 如果有搜索条件，分别搜索名称/描述和标签
    if (searchQuery && searchQuery.trim()) {
      // 搜索模型 - 名称/描述
      const { data: modelsByName, error: modelNameError } = await supabase
        .from('models')
        .select('*')
        .eq('visibility', 'public')
        .eq('status', 'published')
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      
      // 搜索模型 - 标签
      const { data: modelsByTags, error: modelTagError } = await supabase
        .from('models')
        .select('*')
        .eq('visibility', 'public')
        .eq('status', 'published')
        .contains('tags', [searchQuery])
      
      if (modelNameError) throw modelNameError
      if (modelTagError) throw modelTagError
      
      // 合并结果并去重
      allModels = [...(modelsByName || []), ...(modelsByTags || [])].filter((item, index, self) => 
        index === self.findIndex((t) => t.id === item.id)
      )
    } else {
      // 没有搜索条件，获取所有模型
      let query = supabase
        .from('models')
        .select('*')
        .eq('visibility', 'public')
        .eq('status', 'published')
      
      // 根据分类筛选
      if (category !== 'all') {
        query = query.eq('content_category', category)
      }
      
      // 根据类型筛选
      if (type !== 'all') {
        query = query.eq('type', type)
      }
      
      // 根据用户ID筛选
      if (userId) {
        query = query.eq('user_id', userId)
      }
      
      const { data: modelsData, error: modelsError } = await query
      if (modelsError) throw modelsError
      allModels = modelsData || []
    }
    
    // 应用排序
    switch (sortBy) {
      case 'newest':
        allModels.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'popular':
        allModels.sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
        break
      case 'views':
        allModels.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        break
      case 'name':
        allModels.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'latest':
        allModels.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'mostRun':
        allModels.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        break
      case 'mostDownload':
        allModels.sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
        break
      case 'relevance':
        // 搜索相关性排序
        if (searchQuery && searchQuery.trim()) {
          allModels.sort((a, b) => {
            const aNameExact = a.name.toLowerCase() === searchQuery.toLowerCase() ? 3 : 0
            const bNameExact = b.name.toLowerCase() === searchQuery.toLowerCase() ? 3 : 0
            const aNameContains = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ? 2 : 0
            const bNameContains = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ? 2 : 0
            const aDescContains = a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0
            const bDescContains = b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0
            
            const aScore = aNameExact + aNameContains + aDescContains
            const bScore = bNameExact + bNameContains + bDescContains
            
            return bScore - aScore
          })
        } else {
          allModels.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        }
        break
      case 'recommended':
      default:
        allModels.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
    }
    
    // 分页处理
    const from = page * limit
    const to = from + limit
    const paginatedModels = allModels.slice(from, to)
    
    // 如果没有数据，返回空结果
    if (!paginatedModels || paginatedModels.length === 0) {
      return NextResponse.json({
        models: [],
        hasMore: false,
        total: allModels.length
      })
    }
    
    // 获取所有用户ID
    const userIds = [...new Set(paginatedModels.map(model => model.user_id))]
    
    // 批量获取用户信息
    let profilesData: any[] = []
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds)
      
      if (profilesError) {
        console.error('获取用户信息失败:', profilesError)
      } else {
        profilesData = profiles || []
      }
    }
    
    // 合并数据
    const modelsWithProfiles = paginatedModels.map(model => {
      const profile = profilesData.find(p => p.id === model.user_id)
      return {
        ...model,
        profiles: profile ? {
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url
        } : null
      }
    })

    // 检查是否还有更多数据
    const hasMore = paginatedModels.length === limit

    return NextResponse.json({
      models: modelsWithProfiles,
      hasMore,
      total: allModels.length
    })
  } catch (error) {
    console.error('获取模型列表失败:', error)
    return NextResponse.json(
      { error: '获取模型列表失败，请稍后再试' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 验证必填字段
    const requiredFields = ['user_id', 'name', 'type', 'content_category']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // 创建模型
    const { data: model, error } = await supabase
      .from('models')
      .insert({
        user_id: body.user_id,
        name: body.name,
        type: body.type,
        content_category: body.content_category,
        tags: body.tags || [],
        is_original: body.is_original || true,
        original_author: body.original_author || null,
        cover_image_url: body.cover_image_url || null,
        description: body.description || null,
        visibility: body.visibility || 'public',
        is_paid: body.is_paid || false,
        price: body.price || 0,
        reference_audio_url: body.reference_audio_url || null,
        demo_audio_url: body.demo_audio_url || null,
        model_file_url: body.model_file_url || null,
        status: body.status || 'draft'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating model:', error)
      return NextResponse.json(
        { error: 'Failed to create model' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(model, { status: 201 })
  } catch (error) {
    console.error('Error in models API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}