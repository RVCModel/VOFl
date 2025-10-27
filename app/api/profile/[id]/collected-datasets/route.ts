import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

// 获取用户收藏的数据集
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params

    // 获取用户收藏的数据集
    const { data: collectedDatasetsData, error: collectedDatasetsError } = await supabase
      .from('dataset_collections')
      .select(`
        dataset_id,
        created_at,
        datasets!inner (
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

    if (collectedDatasetsError) {
      console.error('获取收藏数据集列表失败:', collectedDatasetsError)
      return NextResponse.json(
        { error: '获取收藏数据集列表失败' },
        { status: 500 }
      )
    }

    // 提取数据集数据
    const datasets = collectedDatasetsData?.map(item => item.datasets) || []
    
    // 获取所有用户ID
    const userIds = [...new Set(datasets.map(dataset => dataset.user_id))]
    
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
    const datasetsWithProfiles = datasets.map(dataset => {
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

    return NextResponse.json({ datasets: datasetsWithProfiles })
  } catch (error) {
    console.error('获取收藏数据集列表时发生错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}