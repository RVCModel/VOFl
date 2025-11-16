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

    const { searchParams } = new URL(req.url)
    const rechargeId = searchParams.get("rechargeId")

    if (!rechargeId) {
      return NextResponse.json(
        { error: "缺少充值记录 ID" },
        { status: 400 },
      )
    }

    const { data: rechargeRecord, error: rechargeError } = await supabase
      .from("recharge_records")
      .select("*")
      .eq("id", rechargeId)
      .single()

    if (rechargeError) {
      console.error("获取充值记录失败:", rechargeError)
      return NextResponse.json(
        { error: "获取充值记录失败" },
        { status: 500 },
      )
    }

    if (rechargeRecord.user_id !== user.id) {
      return NextResponse.json(
        { error: "无权访问该充值记录" },
        { status: 403 },
      )
    }

    return NextResponse.json({
      success: true,
      data: rechargeRecord,
    })
  } catch (error) {
    console.error("获取充值记录失败:", error)
    return NextResponse.json(
      { error: "获取充值记录失败" },
      { status: 500 },
    )
  }
}
