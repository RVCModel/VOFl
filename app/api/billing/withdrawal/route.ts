import { createServiceClient } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient()

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
        { error: "用户会话已失效或未登录" },
        { status: 401 },
      )
    }

    const { amount, withdrawalMethod, withdrawalAddress, description } =
      await req.json()

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "提现金额必须大于 0" },
        { status: 400 },
      )
    }

    if (!withdrawalMethod) {
      return NextResponse.json(
        { error: "请选择提现方式" },
        { status: 400 },
      )
    }

    if (!withdrawalAddress) {
      return NextResponse.json(
        { error: "请输入提现收款账号" },
        { status: 400 },
      )
    }

    const { data: userBalance, error: balanceError } = await supabase
      .from("user_balances")
      .select("balance,frozen_balance")
      .eq("user_id", user.id)
      .maybeSingle()

    if (balanceError || !userBalance) {
      return NextResponse.json(
        { error: "获取用户余额失败" },
        { status: 500 },
      )
    }

    if (userBalance.balance < amount) {
      return NextResponse.json({ error: "余额不足" }, { status: 400 })
    }

    const { data: withdrawalRecord, error: withdrawalError } = await supabase
      .from("withdrawal_records")
      .insert({
        user_id: user.id,
        amount,
        withdrawal_method: withdrawalMethod,
        withdrawal_address: withdrawalAddress,
        status: "pending",
        description: description || `提现 ${amount} 元`,
      })
      .select()
      .single()

    if (withdrawalError) {
      console.error("创建提现记录失败:", withdrawalError)
      return NextResponse.json(
        { error: "创建提现记录失败" },
        { status: 500 },
      )
    }

    await supabase
      .from("user_balances")
      .update({
        balance: userBalance.balance - amount,
        frozen_balance: (userBalance.frozen_balance || 0) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)

    return NextResponse.json({
      success: true,
      withdrawalId: withdrawalRecord.id,
    })
  } catch (error) {
    console.error("创建提现记录失败:", error)
    return NextResponse.json(
      { error: "创建提现记录失败" },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient()

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
        { error: "用户会话已失效或未登录" },
        { status: 401 },
      )
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "10", 10)
    const status = searchParams.get("status")

    let query = supabase
      .from("withdrawal_records")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error, count } = await query

    if (error) {
      console.error("获取提现记录失败:", error)
      return NextResponse.json(
        { error: "获取提现记录失败" },
        { status: 500 },
      )
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
    console.error("获取提现记录失败:", error)
    return NextResponse.json(
      { error: "获取提现记录失败" },
      { status: 500 },
    )
  }
}