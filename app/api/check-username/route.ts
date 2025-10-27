import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

// 检查用户名是否可用
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, userId } = body

    if (!username || username.trim().length < 3) {
      return NextResponse.json(
        { error: '用户名至少需要3个字符' },
        { status: 400 }
      )
    }

    // 检查用户名格式（只允许字母、数字、下划线）
    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: '用户名只能包含字母、数字和下划线' },
        { status: 400 }
      )
    }

    // 检查用户名是否已被使用
    let query = supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
    
    // 如果提供了userId，则排除当前用户
    if (userId) {
      query = query.neq('id', userId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: '检查用户名失败' },
        { status: 500 }
      )
    }

    // 如果返回的数据为空，说明用户名可用
    const isAvailable = data.length === 0

    return NextResponse.json({ 
      available: isAvailable,
      message: isAvailable ? '用户名可用' : '用户名已被使用'
    })
  } catch (error) {
    console.error('检查用户名可用性失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}