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
    // Resolve auth user from Authorization header for personalization only
    let authUserId: string | null = null
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user } } = await supabase.auth.getUser(token)
      authUserId = user?.id || null
    }
    
    let allModels: any[] = []

    // Build preference profile
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

        const tagFreq: Record<string, number> = {}
        const catFreq: Record<string, number> = {}
        const typeFreq: Record<string, number> = {}
        for (const it of likedModels) {
          const tags: string[] = Array.isArray(it?.tags) ? it.tags : []
          for (const t of tags) tagFreq[t] = (tagFreq[t] || 0) + 1
          if (it?.content_category) catFreq[it.content_category] = (catFreq[it.content_category] || 0) + 1
          if (it?.type) typeFreq[it.type] = (typeFreq[it.type] || 0) + 1
        }
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
      
      const { data: modelsData, error: modelsError } = await query
      if (modelsError) throw modelsError
      allModels = modelsData || []
    }
    
    // 应用排序
    let scoreOfRef: any = (_: any) => ({ score: 0, meta: null })
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
      default: {
        const now = Date.now()
        const halfLifeDays = 7
        const ln = (n: number) => Math.log(1 + Math.max(0, n || 0))
        const scoreOf = (item: any) => {
          const views = item.view_count || 0
          const downloads = item.download_count || 0
          const ageDays = Math.max(0, (now - new Date(item.created_at).getTime()) / (1000*60*60*24))
          const recency = Math.exp(-ageDays / halfLifeDays)
          const popularity = 0.75 * ln(downloads) + 0.25 * ln(views)
          let prefBoost = 0
          let reasons: string[] = []
          if (preference) {
            const tags: string[] = Array.isArray(item?.tags) ? item.tags : []
            const tagOverlap = tags.filter(t => preference.topTags.has(t)).length
            const tagScore = Math.min(1, tagOverlap / 3)
            const catScore = item?.content_category && preference.topCats.has(item.content_category) ? 1 : 0
            const typeScore = item?.type && preference.topTypes.has(item.type) ? 1 : 0
            const followScore = preference.followedUserIds.has(item.user_id) ? 1 : 0
            if (tagScore > 0) reasons.push('tag')
            if (catScore > 0) reasons.push('category')
            if (typeScore > 0) reasons.push('type')
            if (followScore > 0) reasons.push('follow')
            prefBoost = 0.3 * tagScore + 0.15 * catScore + 0.1 * typeScore + 0.25 * followScore
          }
          const wPopularity = hasPref ? 0.5 : 0.6
          const wRecency = hasPref ? 0.3 : 0.4
          const wPref = hasPref ? 0.2 : 0.0
          let score = 0.5 * popularity + 0.3 * recency + 0.2 * prefBoost
          if (!hasPref) score += Math.random() * 0.01
          return { score, meta: { popularity, recency, prefBoost, reasons } }
        }
        allModels.sort((a,b)=>scoreOf(b).score - scoreOf(a).score)
        // attach rec_meta for the current page after pagination below
        scoreOfRef = scoreOf
        break
      }
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
        rec_meta: sortBy === 'recommended' ? scoreOfRef(model).meta : null,
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