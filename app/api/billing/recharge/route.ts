import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { Creem } from 'creem'

// 创建Supabase客户端
const supabase = createServerClient()

// 初始化Creem SDK - 使用测试环境
const creem = new Creem({
  apiKey: process.env.CREEM_API_KEY!,
  serverIdx: 0, // 使用测试API端点 (https://test-api.creem.io)
})

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
    const { amount } = await req.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '充值金额必须大于0' }, { status: 400 })
    }

    // 创建充值记录
    const { data: rechargeRecord, error: rechargeError } = await supabase
      .from('recharge_records')
      .insert({
        user_id: user.id,
        amount,
        payment_method: 'creem',
        status: 'pending',
        description: `充值 ${amount} 元`
      })
      .select()
      .single()

    if (rechargeError) {
      console.error('创建充值记录失败:', rechargeError)
      return NextResponse.json({ error: '创建充值记录失败' }, { status: 500 })
    }

    // 尝试获取产品，如果不存在则创建
    let product;
    let productId = "credits_recharge"; // 默认产品ID
    
    try {
      product = await creem.retrieveProduct({
        productId: productId,
        xApiKey: process.env.CREEM_API_KEY!
      });
    } catch (error) {
      // 产品不存在，创建一个新产品
      product = await creem.createProduct({
        xApiKey: process.env.CREEM_API_KEY!,
        createProductRequestEntity: {
          name: "充值积分",
          description: "平台充值积分",
          price: amount * 100, // 价格以分为单位
          currency: "USD",
          billingType: "onetime"
        }
      });
      // 使用新创建的产品ID
      productId = product.id;
    }

    // 创建Creem支付会话
    console.log('创建Creem支付会话，产品ID:', productId);
    
    const checkoutSessionResponse = await creem.createCheckout({
      xApiKey: process.env.CREEM_API_KEY!,
      createCheckoutRequest: {
        productId: productId, // 使用实际的产品ID
        units: 1,
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing/success?rechargeId=${rechargeRecord.id}`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing/cancel`,
        request_id: rechargeRecord.id, // 使用充值记录ID作为request_id
        metadata: {
          userId: user.id,
          email: user.email,
          rechargeId: rechargeRecord.id,
          amount: amount.toString(),
          type: "recharge"
        },
        // 在生产环境中添加webhookUrl，在本地开发环境中不添加
        ...(process.env.NODE_ENV === 'production' && {
          webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/billing/webhook`
        })
      },
    })
    
    console.log('Creem支付会话创建成功:', JSON.stringify(checkoutSessionResponse, null, 2));

    // 更新充值记录，添加支付ID
    await supabase
      .from('recharge_records')
      .update({
        payment_id: checkoutSessionResponse.id, // 使用实际的session ID
        updated_at: new Date().toISOString()
      })
      .eq('id', rechargeRecord.id)

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSessionResponse.checkoutUrl,
      rechargeId: rechargeRecord.id
    })
  } catch (error) {
    console.error('创建充值会话失败:', error)
    return NextResponse.json(
      { error: '创建充值会话失败' },
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
      .from('recharge_records')
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
      console.error('获取充值记录失败:', error)
      return NextResponse.json({ error: '获取充值记录失败' }, { status: 500 })
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
    console.error('获取充值记录失败:', error)
    return NextResponse.json(
      { error: '获取充值记录失败' },
      { status: 500 }
    )
  }
}