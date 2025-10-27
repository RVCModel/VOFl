import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { Creem } from 'creem'

// 创建Supabase客户端
const supabase = createServerClient()

// 初始化Creem SDK - 使用测试环境
const creem = new Creem({
  serverIdx: 0, // 使用测试API端点 (https://test-api.creem.io)
})

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

    if (rechargeError || !rechargeRecord) {
      return NextResponse.json({ error: '充值记录不存在' }, { status: 404 })
    }

    // 验证充值记录属于当前用户
    if (rechargeRecord.user_id !== user.id) {
      return NextResponse.json({ error: '无权访问此充值记录' }, { status: 403 })
    }

    // 如果充值记录已经是完成状态，直接返回
    if (rechargeRecord.status === 'completed') {
      return NextResponse.json({
        success: true,
        status: 'completed',
        message: '充值已完成'
      })
    }

    // 如果充值记录有payment_id，查询Creem API获取支付状态
    if (rechargeRecord.payment_id) {
      try {
        const checkoutDetails = await creem.retrieveCheckout({
          checkoutId: rechargeRecord.payment_id,
          xApiKey: process.env.CREEM_API_KEY!
        })

        // 如果支付状态是completed，更新充值记录和用户余额
        if (checkoutDetails.status === 'completed') {
          // 开始事务 - 确保参数类型正确
          const { error: updateError } = await supabase.rpc('complete_recharge', {
            p_recharge_id: rechargeId,
            p_user_id: user.id,
            p_amount: Number(rechargeRecord.amount)
          })

          if (updateError) {
            console.error('完成充值失败:', updateError)
            return NextResponse.json({ error: '完成充值失败' }, { status: 500 })
          }

          return NextResponse.json({
            success: true,
            status: 'completed',
            message: '充值已完成'
          })
        }

        // 返回当前支付状态
        return NextResponse.json({
          success: true,
          status: checkoutDetails.status,
          message: `支付状态: ${checkoutDetails.status}`
        })
      } catch (error) {
        console.error('查询支付状态失败:', error)
        return NextResponse.json({ error: '查询支付状态失败' }, { status: 500 })
      }
    }

    // 如果没有payment_id，返回pending状态
    return NextResponse.json({
      success: true,
      status: 'pending',
      message: '支付处理中'
    })
  } catch (error) {
    console.error('查询充值状态失败:', error)
    return NextResponse.json(
      { error: '查询充值状态失败' },
      { status: 500 }
    )
  }
}