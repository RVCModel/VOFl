import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    // 异步获取 params
    const { id: modelId, commentId } = await params

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

    // 获取评论信息
    const { data: comment, error: commentError } = await supabase
      .from('model_comments')
      .select('user_id, model_id')
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      return NextResponse.json(
        { error: '评论不存在' },
        { status: 404 }
      )
    }

    // 验证评论是否属于指定的模型
    if (comment.model_id !== modelId) {
      return NextResponse.json(
        { error: '评论不属于此模型' },
        { status: 403 }
      )
    }

    // 获取模型信息，检查是否是模型作者
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('user_id')
      .eq('id', comment.model_id)
      .single()

    if (modelError || !model) {
      return NextResponse.json(
        { error: '模型不存在' },
        { status: 404 }
      )
    }

    // 检查用户是否有权限删除评论（评论作者或模型作者）
    if (comment.user_id !== user.id && model.user_id !== user.id) {
      return NextResponse.json(
        { error: '没有权限删除此评论' },
        { status: 403 }
      )
    }

    // 删除评论及其所有子评论
    const { error: deleteError } = await supabase
      .from('model_comments')
      .delete()
      .or(`id.eq.${commentId},parent_id.eq.${commentId}`)

    if (deleteError) {
      console.error('Error deleting comment:', deleteError)
      return NextResponse.json(
        { error: '删除评论失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}