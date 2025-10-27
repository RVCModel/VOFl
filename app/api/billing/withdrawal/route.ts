import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// 创建Supabase客户端
const supabase = createServerClient()

export async function POST(req: NextRequest) {
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

    // 获取请求体
    const { amount, withdrawalMethod, withdrawalAddress, description } = await req.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '提现金额必须大于0' }, { status: 400 })
    }

    if (!withdrawalMethod) {
      return NextResponse.json({ error: '请选择提现方式' }, { status: 400 })
    }

    if (!withdrawalAddress) {
      return NextResponse.json({ error: '请填写提现地址' }, { status: 400 })
    }

    // 获取用户余额
    const { data: userBalance, error: balanceError } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', user.id)
      .single()

    if (balanceError || !userBalance) {
      return NextResponse.json({ error: '获取用户余额失败' }, { status: 500 })
    }

    // 检查余额是否足够
    if (userBalance.balance < amount) {
      return NextResponse.json({ error: '余额不足' }, { status: 400 })
    }

    // 创建提现记录
    const { data: withdrawalRecord, error: withdrawalError } = await supabase
      .from('withdrawal_records')
      .insert({
        user_id: user.id,
        amount,
        withdrawal_method: withdrawalMethod,
        withdrawal_address: withdrawalAddress,
        status: 'pending',
        description: description || `提现 ${amount} 元`
      })
      .select()
      .single()

    if (withdrawalError) {
      console.error('创建提现记录失败:', withdrawalError)
      return NextResponse.json({ error: '创建提现记录失败' }, { status: 500 })
    }

    // 冻结提现金额
    await supabase
      .from('user_balances')
      .update({
        balance: userBalance.balance - amount,
        frozen_balance: (userBalance.frozen_balance || 0) + amount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    return NextResponse.json({
      success: true,
      withdrawalId: withdrawalRecord.id
    })
  } catch (error) {
    console.error('创建提现记录失败:', error)
    return NextResponse.json(
      { error: '创建提现记录失败' },
      { status: 500 }
    )
  }
}

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

    // 获取查询参数
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')

    // 构建查询
    let query = supabase
      .from('withdrawal_records')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // 如果指定了状态，添加状态过滤
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('获取提现记录失败:', error)
      return NextResponse.json({ error: '获取提现记录失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('获取提现记录失败:', error)
    return NextResponse.json(
      { error: '获取提现记录失败' },
      { status: 500 }
    )
  }
}