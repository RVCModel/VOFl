import { createServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    // Resolve auth user from Authorization header (Bearer token)
    let authUserId: string | null = null
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user } } = await supabase.auth.getUser(token)
      authUserId = user?.id || null
    }

    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '0')
    const category = searchParams.get('category') || 'all'
    const type = searchParams.get('type') || 'all'
    const sortBy = searchParams.get('sortBy') || 'recommended'
    const searchQuery = searchParams.get('searchQuery') || ''

    // Build user preference profile for personalization
    const buildPreferenceProfile = async (uid: string | null) => {
      if (!uid) return null as any
      try {
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', uid)
        const followedUserIds = new Set((follows || []).map((f: any) => f.following_id))

        const { data: likedModelsIds } = await supabase
          .from('model_likes')
          .select('model_id')
          .eq('user_id', uid)
        const modelIds = (likedModelsIds || []).map((r: any) => r.model_id)
        let likedModels: any[] = []
        if (modelIds.length) {
          const { data } = await supabase
            .from('models')
            .select('id,tags,content_category,type')
            .in('id', modelIds)
          likedModels = data || []
        }

        const { data: likedDatasetIds } = await supabase
          .from('dataset_likes')
          .select('dataset_id')
          .eq('user_id', uid)
        const datasetIds = (likedDatasetIds || []).map((r: any) => r.dataset_id)
        let likedDatasets: any[] = []
        if (datasetIds.length) {
          const { data } = await supabase
            .from('datasets')
            .select('id,tags,content_category,type')
            .in('id', datasetIds)
          likedDatasets = data || []
        }

        const tagFreq: Record<string, number> = {}
        const catFreq: Record<string, number> = {}
        const typeFreq: Record<string, number> = {}
        const accumulate = (arr: any[]) => {
          for (const it of arr) {
            const tags: string[] = Array.isArray(it?.tags) ? it.tags : []
            for (const t of tags) tagFreq[t] = (tagFreq[t] || 0) + 1
            if (it?.content_category) catFreq[it.content_category] = (catFreq[it.content_category] || 0) + 1
            if (it?.type) typeFreq[it.type] = (typeFreq[it.type] || 0) + 1
          }
        }
        accumulate(likedModels)
        accumulate(likedDatasets)
        const topTags = new Set(Object.entries(tagFreq).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k])=>k))
        const topCats = new Set(Object.entries(catFreq).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k])=>k))
        const topTypes = new Set(Object.entries(typeFreq).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k])=>k))
        return { followedUserIds, topTags, topCats, topTypes }
      } catch {
        return null as any
      }
    }
    const preference = await buildPreferenceProfile(authUserId)
    const hasPref = !!(preference && (preference.followedUserIds?.size || preference.topTags?.size || preference.topCats?.size || preference.topTypes?.size))
    
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

    // Shared scorer reference for later meta attachment
    let scoreOfRef: (item: any) => { score: number; meta: any } = (_item: any) => ({ score: 0, meta: null })
    
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
      default: {
        const now = Date.now()
        const halfLifeDays = 7
        const ln = (n: number) => Math.log(1 + Math.max(0, n || 0))
        const scoreOf = (item: any) => {
          const views = item.view_count || 0
          const downloads = item.download_count || 0
          const ageDays = Math.max(0, (now - new Date(item.created_at).getTime()) / (1000*60*60*24))
          const recency = Math.exp(-ageDays / halfLifeDays)
          const popularity = 0.7 * ln(downloads) + 0.3 * ln(views)
          let prefBoost = 0
          let reasons: string[] = []
          if (preference) {
            const tags: string[] = Array.isArray(item?.tags) ? item.tags : []
            const tagOverlap = tags.filter((t: string) => preference.topTags.has(t)).length
            const tagScore = Math.min(1, tagOverlap / 3)
            const catScore = item?.content_category && preference.topCats.has(item.content_category) ? 1 : 0
            const typeScore = item?.type && preference.topTypes.has(item.type) ? 1 : 0
            const followScore = preference.followedUserIds.has(item.user_id) ? 1 : 0
            if (tagScore > 0) reasons.push('tag')
            if (catScore > 0) reasons.push('category')
            if (typeScore > 0) reasons.push('type')
            if (followScore > 0) reasons.push('follow')
            const isModel = item.item_type === 'model'
            const wTag = isModel ? 0.25 : 0.30
            const wCat = 0.15
            const wType = isModel ? 0.10 : 0.05
            const wFollow = 0.25
            prefBoost = wTag * tagScore + wCat * catScore + wType * typeScore + wFollow * followScore
          }
          const wPopularity = hasPref ? 0.5 : 0.6
          const wRecency = hasPref ? 0.3 : 0.38
          const wPref = hasPref ? 0.2 : 0.0
          let score = wPopularity * popularity + wRecency * recency + wPref * prefBoost
          if (!hasPref) {
            const cat = item?.content_category
            if (cat) {
              const total = allItems.length || 1
              const catCount = allItems.filter((x:any)=>x.content_category===cat).length
              const diversityAdj = 0.1 * (1 - catCount / total)
              score += diversityAdj
            }
            score += Math.random() * 0.01
          }
          return { score, meta: { popularity, recency, prefBoost, reasons } }
        }
        scoreOfRef = scoreOf
        allItems.sort((a, b) => scoreOf(b).score - scoreOf(a).score)
        break
      }
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
        rec_meta: sortBy === 'recommended' ? scoreOfRef(item).meta : null,
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




