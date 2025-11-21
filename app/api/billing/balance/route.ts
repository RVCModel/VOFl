import { createServiceClient } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

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

    // 主余额从 profiles.balance 读取（你之前就有这个字段）
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,balance,created_at,updated_at")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.error("获取用户余额失败(profiles):", profileError)
      return NextResponse.json({ error: "获取用户余额失败" }, { status: 500 })
    }

    // 冻结余额从 user_balances 读取，可能不存在
    const { data: userBalance } = await supabase
      .from("user_balances")
      .select("frozen_balance")
      .eq("user_id", user.id)
      .maybeSingle()

    const result = {
      id: profile.id,
      user_id: profile.id,
      balance: Number(profile.balance) || 0,
      frozen_balance: Number(userBalance?.frozen_balance ?? 0),
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("获取用户余额失败:", error)
    return NextResponse.json(
      { error: "获取用户余额失败" },
      { status: 500 },
    )
  }
}