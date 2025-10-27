import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// 创建Supabase客户端
const supabase = createServerClient()

export async function GET(req: NextRequest) {
  try {
    // 获取当前用户
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 使用JWT令牌获取用户信息
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('用户认证失败:', authError)
      return NextResponse.json({ error: '用户会话不存在或已过期' }, { status: 401 })
    }

    // 获取用户余额
    const { data: userBalance, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (balanceError) {
      console.error('获取用户余额失败:', balanceError)
      return NextResponse.json({ error: '获取用户余额失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: userBalance
    })
  } catch (error) {
    console.error('获取用户余额失败:', error)
    return NextResponse.json(
      { error: '获取用户余额失败' },
      { status: 500 }
    )
  }
}