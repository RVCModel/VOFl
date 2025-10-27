import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

// 获取用户点赞的模型
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params

    // 获取用户点赞的模型
    const { data: likedModelsData, error: likedModelsError } = await supabase
      .from('model_likes')
      .select(`
        model_id,
        created_at,
        models!inner (
          id,
          name,
          type,
          cover_image_url,
          download_count,
          view_count,
          is_paid,
          user_id
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (likedModelsError) {
      console.error('获取点赞模型列表失败:', likedModelsError)
      return NextResponse.json(
        { error: '获取点赞模型列表失败' },
        { status: 500 }
      )
    }

    // 提取模型数据
    const models = likedModelsData?.map(item => item.models) || []
    
    // 获取所有用户ID
    const userIds = [...new Set(models.map(model => model.user_id))]
    
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
    const modelsWithProfiles = models.map(model => {
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

    return NextResponse.json({ models: modelsWithProfiles })
  } catch (error) {
    console.error('获取点赞模型列表时发生错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}