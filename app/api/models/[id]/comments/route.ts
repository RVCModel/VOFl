import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 创建Supabase服务端客户端
const supabase = createServiceClient()

// 递归函数，构建嵌套评论树结构
function buildCommentTree(comments: any[], parentId: string | null = null): any[] {
  return comments
    .filter(comment => comment.parent_id === parentId)
    .map(comment => ({
      ...comment,
      replies: buildCommentTree(comments, comment.id)
    }))
}

// 创建Supabase客户端
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 异步获取 params.id
    const { id: modelId } = await params

    // 获取所有评论
    const { data: comments, error } = await supabaseClient
      .from('model_comments')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('获取评论失败:', error)
      return Response.json({ error: '获取评论失败' }, { status: 500 })
    }

    // 获取所有评论的用户信息
    const userIds = [...new Set(comments?.map(comment => comment.user_id) || [])]
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds)

    // 将用户信息合并到评论中
    const commentsWithProfiles = comments?.map(comment => ({
      ...comment,
      profiles: profiles?.find(profile => profile.id === comment.user_id)
    })) || []

    // 构建评论树结构
     const commentTree = buildCommentTree(commentsWithProfiles)

    return Response.json({ comments: commentTree })
  } catch (error) {
    console.error('获取评论失败:', error)
    return Response.json({ error: '获取评论失败' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 异步获取 params.id
    const { id: modelId } = await params
    const { content, parent_id } = await request.json()

    // 验证用户是否已登录
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

    // 验证内容不为空
    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: '评论内容不能为空' },
        { status: 400 }
      )
    }

    // 如果是回复评论，验证父评论是否存在
    if (parent_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('model_comments')
        .select('id')
        .eq('id', parent_id)
        .eq('model_id', modelId)
        .single()

      if (parentError || !parentComment) {
        return NextResponse.json(
          { error: '父评论不存在' },
          { status: 404 }
        )
      }
    }

    // 获取模型信息
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('user_id, name')
      .eq('id', modelId)
      .single()

    if (modelError || !model) {
      return NextResponse.json(
        { error: '模型不存在' },
        { status: 404 }
      )
    }

    // 插入新评论
    const { data: comment, error } = await supabase
      .from('model_comments')
      .insert({
        model_id: modelId,
        user_id: user.id,
        content: content.trim(),
        parent_id: parent_id || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json(
        { error: '创建评论失败' },
        { status: 500 }
      )
    }

    // 获取用户信息
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', user.id)
      .single()

    // 创建消息通知
    let messageUserId = model.user_id // 默认通知模型作者
    
    // 如果是回复评论，则通知被回复的评论作者
    if (parent_id) {
      const { data: parentComment } = await supabase
        .from('model_comments')
        .select('user_id')
        .eq('id', parent_id)
        .single()
      
      if (parentComment) {
        messageUserId = parentComment.user_id
      }
    }

    // 只有当评论作者和接收消息的用户不是同一个人时才创建消息
    if (messageUserId !== user.id) {
      // 获取评论作者的用户名
      const { data: commenterProfile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .single()

      const commenterName = commenterProfile?.display_name || commenterProfile?.username || '用户'
      const messageTitle = parent_id ? '您的评论收到了回复' : '您的模型收到了新评论'
      const messageContent = parent_id 
        ? `${commenterName} 回复了您的评论: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`
        : `${commenterName} 评论了您的模型 "${model.name}": "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          user_id: messageUserId,
          type: 'reply',
          title: messageTitle,
          content: messageContent,
          related_user_id: user.id,
          related_item_type: 'model',
          related_item_id: modelId
        })

      if (messageError) {
        console.error('Error creating message:', messageError)
        // 不返回错误，因为评论已经创建成功
      }
    }

    return NextResponse.json({
      comment: {
        ...comment,
        user: userProfile
      }
    })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}



