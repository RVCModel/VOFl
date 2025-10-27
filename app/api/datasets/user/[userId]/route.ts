import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId
    const { searchParams } = new URL(request.url)
    const excludeId = searchParams.get('excludeId')
    const limit = parseInt(searchParams.get('limit') || '6')

    if (!userId) {
      return NextResponse.json({ error: '用户ID不能为空' }, { status: 400 })
    }

    // 获取用户的数据集
    let query = supabase
      .from('datasets')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'published') // 只获取已发布的数据集
      .order('created_at', { ascending: false })
      .limit(limit)

    // 如果提供了excludeId，则排除该ID
    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data: datasets, error } = await query

    if (error) {
      console.error('获取用户数据集失败:', error)
      return NextResponse.json({ error: '获取用户数据集失败' }, { status: 500 })
    }

    // 获取每个数据集的作者信息
    const datasetsWithProfiles = await Promise.all(
      (datasets || []).map(async (dataset) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', dataset.user_id)
          .single()

        return {
          ...dataset,
          profiles: profileData || undefined
        }
      })
    )

    return NextResponse.json({ 
      datasets: datasetsWithProfiles,
      count: datasetsWithProfiles.length
    })
  } catch (error) {
    console.error('获取用户数据集失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}