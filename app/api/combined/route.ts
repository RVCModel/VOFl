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
    
    let allModels: any[] = []
    let allDatasets: any[] = []
    
    // 如果有搜索条件，分别搜索模型和数据集
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
      
      if (modelNameError) throw modelNameError
      if (modelTagError) throw modelTagError
      if (datasetNameError) throw datasetNameError
      if (datasetTagError) throw datasetTagError
      
      // 合并结果并去重
      allModels = [...(modelsByName || []), ...(modelsByTags || [])].filter((item, index, self) => 
        index === self.findIndex((t) => t.id === item.id)
      )
      
      allDatasets = [...(datasetsByName || []), ...(datasetsByTags || [])].filter((item, index, self) => 
        index === self.findIndex((t) => t.id === item.id)
      )
    } else {
      // 没有搜索条件，获取所有模型和数据集
      let modelQuery = supabase
        .from('models')
        .select('*')
        .eq('visibility', 'public')
        .eq('status', 'published')
      
      let datasetQuery = supabase
        .from('datasets')
        .select('*')
        .eq('visibility', 'public')
        .eq('status', 'published')
      
      // 根据分类筛选
      if (category !== 'all') {
        modelQuery = modelQuery.eq('content_category', category)
        datasetQuery = datasetQuery.eq('content_category', category)
      }
      
      // 根据类型筛选
      if (type !== 'all') {
        modelQuery = modelQuery.eq('type', type)
        datasetQuery = datasetQuery.eq('type', type)
      }
      
      // 根据用户ID筛选
      if (userId) {
        modelQuery = modelQuery.eq('user_id', userId)
        datasetQuery = datasetQuery.eq('user_id', userId)
      }
      
      const { data: modelsData, error: modelsError } = await modelQuery
      if (modelsError) throw modelsError
      allModels = modelsData || []
      
      const { data: datasetsData, error: datasetsError } = await datasetQuery
      if (datasetsError) throw datasetsError
      allDatasets = datasetsData || []
    }
    
    // 为每个项目添加类型标识
    const modelsWithType = allModels.map(model => ({ ...model, item_type: 'model' }))
    const datasetsWithType = allDatasets.map(dataset => ({ ...dataset, item_type: 'dataset' }))
    
    // 合并所有项目
    let allItems = [...modelsWithType, ...datasetsWithType]
    
    // 应用排序
    switch (sortBy) {
      case 'latest':
        allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'popular':
        allItems.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        break
      case 'mostRun':
        allItems.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        break
      case 'mostDownload':
        allItems.sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
        break
      case 'relevance':
        // 搜索相关性排序
        if (searchQuery && searchQuery.trim()) {
          allItems.sort((a, b) => {
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
          allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        }
        break
      case 'recommended':
      default:
        allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
    }
    
    // 分页处理
    const from = page * limit
    const to = from + limit
    const paginatedItems = allItems.slice(from, to)
    
    // 如果没有数据，返回空结果
    if (!paginatedItems || paginatedItems.length === 0) {
      return NextResponse.json({
        items: [],
        hasMore: false,
        total: allItems.length
      })
    }
    
    // 获取所有用户ID
    const userIds = [...new Set(paginatedItems.map(item => item.user_id))]
    
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
    const itemsWithProfiles = paginatedItems.map(item => {
      const profile = profilesData.find(p => p.id === item.user_id)
      return {
        ...item,
        profiles: profile ? {
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url
        } : null
      }
    })

    // 检查是否还有更多数据
    const hasMore = paginatedItems.length === limit

    return NextResponse.json({
      items: itemsWithProfiles,
      hasMore,
      total: allItems.length
    })
  } catch (error) {
    console.error('获取数据列表失败:', error)
    return NextResponse.json(
      { error: '获取数据列表失败，请稍后再试' },
      { status: 500 }
    )
  }
}