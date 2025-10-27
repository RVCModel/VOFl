import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // 获取请求头中的授权信息
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '无效的访问令牌' }, { status: 401 })
    }

    // 获取用户billing信息
    const { data: billingData, error: billingError } = await supabase
      .from('billing')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (billingError && billingError.code !== 'PGRST116') { // PGRST116 是"没有找到记录"的错误码
      return NextResponse.json({ error: '获取billing信息失败', details: billingError.message }, { status: 500 })
    }

    // 获取充值记录
    const { data: rechargeRecords, error: rechargeError } = await supabase
      .from('recharge_records')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (rechargeError) {
      return NextResponse.json({ error: '获取充值记录失败', details: rechargeError.message }, { status: 500 })
    }

    // 获取提现记录
    const { data: withdrawalRecords, error: withdrawalError } = await supabase
      .from('withdrawal_records')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (withdrawalError) {
      return NextResponse.json({ error: '获取提现记录失败', details: withdrawalError.message }, { status: 500 })
    }

    // 获取消费记录
    const { data: consumptionRecords, error: consumptionError } = await supabase
      .from('consumption_records')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (consumptionError) {
      return NextResponse.json({ error: '获取消费记录失败', details: consumptionError.message }, { status: 500 })
    }

    // 返回所有数据
    return NextResponse.json({
      billing: billingData,
      rechargeRecords: rechargeRecords || [],
      withdrawalRecords: withdrawalRecords || [],
      consumptionRecords: consumptionRecords || []
    })
  } catch (error: any) {
    console.error('获取billing数据错误:', error)
    return NextResponse.json({ error: '服务器内部错误', details: error.message }, { status: 500 })
  }
}