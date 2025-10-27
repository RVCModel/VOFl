import { createServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

// 获取未读消息数量
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '未提供授权令牌' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: '无效的授权令牌' }, { status: 401 })
    }

    // 获取未读消息数量
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('获取未读消息数量失败:', error)
      return NextResponse.json({ error: '获取未读消息数量失败' }, { status: 500 })
    }

    const unreadCount = messages?.length || 0

    return NextResponse.json({
      unreadCount: unreadCount || 0
    })
  } catch (error) {
    console.error('获取未读消息数量时发生错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}