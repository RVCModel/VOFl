import { createServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

// 获取消息列表
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

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 消息类型过滤
    const isRead = searchParams.get('is_read') // 是否已读过滤
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // 构建查询
    let query = supabase
      .from('messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // 应用过滤条件
    if (type) {
      query = query.eq('type', type)
    }
    if (isRead !== null) {
      query = query.eq('is_read', isRead === 'true')
    }

    const { data: messages, error } = await query

    if (error) {
      console.error('获取消息失败:', error)
      return NextResponse.json({ error: '获取消息失败' }, { status: 500 })
    }

    // 获取相关用户信息
    const userIds = [...new Set(messages?.filter(msg => msg.related_user_id).map(msg => msg.related_user_id))]
    let userProfiles: Record<string, any> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds)

      if (profiles) {
        userProfiles = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile
          return acc
        }, {})
      }
    }

    // 将用户信息合并到消息中
    const messagesWithUsers = messages?.map(message => ({
      ...message,
      related_user: message.related_user_id ? userProfiles[message.related_user_id] : null
    }))

    // 获取未读消息数量
    const { data: unreadCount, error: unreadCountError } = await supabase
      .rpc('get_unread_message_count', { p_user_id: user.id })
    
    if (unreadCountError) {
      console.error('获取未读消息数量失败:', unreadCountError)
    }

    return NextResponse.json({
      messages: messagesWithUsers,
      unreadCount: unreadCount || 0,
      pagination: {
        page,
        limit,
        total: messages?.length || 0
      }
    })
  } catch (error) {
    console.error('获取消息时发生错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// 标记消息为已读
export async function PUT(request: NextRequest) {
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

    const { messageId, markAll } = await request.json()

    if (markAll) {
      // 标记所有消息为已读
      const { data, error } = await supabase
        .rpc('mark_all_messages_read', { 
          p_user_id: user.id 
        })

      if (error) {
        console.error('标记所有消息为已读失败:', error)
        return NextResponse.json({ 
          error: '标记消息为已读失败', 
          details: error.message,
          code: error.code
        }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: '所有消息已标记为已读', data })
    } else if (messageId) {
      // 标记单条消息为已读
      const { data, error } = await supabase
        .rpc('mark_message_read', { 
          p_message_id: messageId, 
          p_user_id: user.id 
        })

      if (error) {
        console.error('标记消息为已读失败:', error)
        return NextResponse.json({ 
          error: '标记消息为已读失败', 
          details: error.message,
          code: error.code
        }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: '消息已标记为已读', data })
    } else {
      return NextResponse.json({ error: '请提供messageId或设置markAll为true' }, { status: 400 })
    }
  } catch (error) {
    console.error('标记消息为已读时发生错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}