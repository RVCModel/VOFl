import { createServerSupabase } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"
import { Creem } from "creem"

// 初始化 Creem SDK
const creem = new Creem({
  apiKey: process.env.CREEM_API_KEY!,
  serverIdx: 0, // 测试环境 API 服务器
})

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase()

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error("用户认证失败:", authError)
      return NextResponse.json(
        { error: "用户会话不存在或已过期" },
        { status: 401 }
      )
    }

    const { amount } = await req.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "充值金额必须大于 0" }, { status: 400 })
    }

    const { data: rechargeRecord, error: rechargeError } = await supabase
      .from("recharge_records")
      .insert({
        user_id: user.id,
        amount,
        payment_method: "creem",
        status: "pending",
        description: `充值 ${amount} 元`,
      })
      .select()
      .single()

    if (rechargeError) {
      console.error("创建充值记录失败:", rechargeError)
      return NextResponse.json({ error: "创建充值记录失败" }, { status: 500 })
    }

    let product
    let productId = "credits_recharge"

    try {
      product = await creem.retrieveProduct({
        productId,
        xApiKey: process.env.CREEM_API_KEY!,
      })
    } catch {
      product = await creem.createProduct({
        xApiKey: process.env.CREEM_API_KEY!,
        createProductRequestEntity: {
          name: "余额充值",
          description: "平台余额充值",
          price: amount * 100, // 以分为单位
          currency: "USD",
          billingType: "onetime",
        },
      })
      productId = product.id
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const checkoutSessionResponse = await creem.createCheckout({
      xApiKey: process.env.CREEM_API_KEY!,
      createCheckoutRequest: {
        productId,
        units: 1,
        successUrl: `${baseUrl}/billing/success?rechargeId=${rechargeRecord.id}`,
        cancelUrl: `${baseUrl}/billing/cancel`,
        request_id: rechargeRecord.id,
        metadata: {
          userId: user.id,
          email: user.email,
          rechargeId: rechargeRecord.id,
          amount: String(amount),
          type: "recharge",
        },
        ...(process.env.NODE_ENV === "production" && {
          webhookUrl: `${baseUrl}/api/billing/webhook`,
        }),
      },
    })

    await supabase
      .from("recharge_records")
      .update({
        payment_id: checkoutSessionResponse.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rechargeRecord.id)

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSessionResponse.checkoutUrl,
      rechargeId: rechargeRecord.id,
    })
  } catch (error) {
    console.error("创建充值会话失败:", error)
    return NextResponse.json(
      { error: "创建充值会话失败" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabase()

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error("用户认证失败:", authError)
      return NextResponse.json(
        { error: "用户会话不存在或已过期" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "10", 10)
    const status = searchParams.get("status")

    let query = supabase
      .from("recharge_records")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error, count } = await query

    if (error) {
      console.error("获取充值记录失败:", error)
      return NextResponse.json({ error: "获取充值记录失败" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("获取充值记录失败:", error)
    return NextResponse.json(
      { error: "获取充值记录失败" },
      { status: 500 }
    )
  }
}

