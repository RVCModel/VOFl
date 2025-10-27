import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

// 关注用户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { followingId } = body
    
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

    // 不能关注自己
    if (user.id === followingId) {
      return NextResponse.json(
        { error: '不能关注自己' },
        { status: 400 }
      )
    }

    // 检查是否已经关注
    const { data: existingFollow, error: checkError } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', followingId)
      .single()

    if (existingFollow) {
      return NextResponse.json(
        { error: '已经关注了该用户' },
        { status: 400 }
      )
    }

    // 添加关注关系
    const { data: follow, error } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: followingId
      })
      .select()

    if (error) {
      return NextResponse.json(
        { error: '关注失败' },
        { status: 400 }
      )
    }

    // 更新粉丝数
    await supabase.rpc('increment_followers_count', { user_id: followingId })

    return NextResponse.json({ message: '关注成功', follow })
  } catch (error) {
    console.error('关注用户失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// 取消关注
export async function DELETE(request: NextRequest) {
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

    // 删除关注关系
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId)

    if (error) {
      return NextResponse.json(
        { error: '取消关注失败' },
        { status: 400 }
      )
    }

    // 更新粉丝数
    await supabase.rpc('decrement_followers_count', { user_id: followingId })

    return NextResponse.json({ message: '取消关注成功' })
  } catch (error) {
    console.error('取消关注失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}