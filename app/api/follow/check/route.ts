import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

// 检查是否已关注用户
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const followingId = searchParams.get('followingId')
    
    if (!followingId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }
    
    // 验证用户身份
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: '用户认证失败' },
        { status: 401 }
      )
    }

    // 检查是否已关注
    const { data: follow, error } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', followingId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 表示没有找到记录
      return NextResponse.json(
        { error: '检查关注状态失败' },
        { status: 400 }
      )
    }

    return NextResponse.json({ isFollowing: !!follow })
  } catch (error) {
    console.error('检查关注状态失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}