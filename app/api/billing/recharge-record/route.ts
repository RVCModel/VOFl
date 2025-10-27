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

    // 获取充值记录ID
    const { searchParams } = new URL(req.url)
    const rechargeId = searchParams.get('rechargeId')
    
    if (!rechargeId) {
      return NextResponse.json({ error: '缺少充值记录ID' }, { status: 400 })
    }

    // 获取充值记录
    const { data: rechargeRecord, error: rechargeError } = await supabase
      .from('recharge_records')
      .select('*')
      .eq('id', rechargeId)
      .single()

    if (rechargeError) {
      console.error('获取充值记录失败:', rechargeError)
      return NextResponse.json({ error: '获取充值记录失败' }, { status: 500 })
    }

    // 验证充值记录属于当前用户
    if (rechargeRecord.user_id !== user.id) {
      return NextResponse.json({ error: '无权访问此充值记录' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: rechargeRecord
    })
  } catch (error) {
    console.error('获取充值记录失败:', error)
    return NextResponse.json(
      { error: '获取充值记录失败' },
      { status: 500 }
    )
  }
}