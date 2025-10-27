import { createServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// 创建 Supabase 服务端客户端
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
    
    let allDatasets: any[] = []
    
    // 如果有搜索条件，分别搜索名称/描述和标签
    if (searchQuery && searchQuery.trim()) {
      // 搜索数据集 - 名称/描述
      const { data: datasetsByName, error: datasetNameError } = await supabase
        .from('datasets')
        .select('*')
        .eq('visibility', 'public')
        .eq('status', 'published')
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      
      // 搜索数据集 - 标签
      const { data: datasetsByTags, error: datasetTagError } = await supabase
        .from('datasets')
        .select('*')
        .eq('visibility', 'public')
        .eq('status', 'published')
        .contains('tags', [searchQuery])
      
      if (datasetNameError) throw datasetNameError
      if (datasetTagError) throw datasetTagError
      
      // 合并结果并去重
      allDatasets = [...(datasetsByName || []), ...(datasetsByTags || [])].filter((item, index, self) => 
        index === self.findIndex((t) => t.id === item.id)
      )
    } else {
      // 没有搜索条件，获取所有数据集
      let query = supabase
        .from('datasets')
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
      
      const { data: datasetsData, error: datasetsError } = await query
      if (datasetsError) throw datasetsError
      allDatasets = datasetsData || []
    }
    
    // 应用排序
    switch (sortBy) {
      case 'newest':
        allDatasets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'popular':
        allDatasets.sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
        break
      case 'views':
        allDatasets.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        break
      case 'name':
        allDatasets.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'size':
        allDatasets.sort((a, b) => (b.file_size || 0) - (a.file_size || 0))
        break
      case 'latest':
        allDatasets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'mostRun':
        allDatasets.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        break
      case 'mostDownload':
        allDatasets.sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
        break
      case 'relevance':
        // 搜索相关性排序
        if (searchQuery && searchQuery.trim()) {
          allDatasets.sort((a, b) => {
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
          allDatasets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        }
        break
      case 'recommended':
      default:
        allDatasets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
    }
    
    // 分页处理
    const from = page * limit
    const to = from + limit
    const paginatedDatasets = allDatasets.slice(from, to)
    
    // 如果没有数据，返回空结果
    if (!paginatedDatasets || paginatedDatasets.length === 0) {
      return NextResponse.json({
        datasets: [],
        hasMore: false,
        total: allDatasets.length
      })
    }
    
    // 获取所有用户ID
    const userIds = [...new Set(paginatedDatasets.map(dataset => dataset.user_id))]
    
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
    const datasetsWithProfiles = paginatedDatasets.map(dataset => {
      const profile = profilesData.find(p => p.id === dataset.user_id)
      return {
        ...dataset,
        profiles: profile ? {
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url
        } : null
      }
    })

    // 检查是否还有更多数据
    const hasMore = paginatedDatasets.length === limit

    return NextResponse.json({
      datasets: datasetsWithProfiles,
      hasMore,
      total: allDatasets.length
    })
  } catch (error) {
    console.error('获取数据集列表失败:', error)
    return NextResponse.json(
      { error: '获取数据集列表失败，请稍后再试' },
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
    
    // 创建数据集
    const { data: dataset, error } = await supabase
      .from('datasets')
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
        files: body.files || [],
        status: body.status || 'draft'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating dataset:', error)
      return NextResponse.json(
        { error: 'Failed to create dataset' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(dataset, { status: 201 })
  } catch (error) {
    console.error('Error in datasets API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}