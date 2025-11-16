import { createServiceClient } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"
import { Creem } from "creem"

const creem = new Creem({
  serverIdx: 0,
})

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

    if (rechargeError || !rechargeRecord) {
      return NextResponse.json(
        { error: "充值记录不存在" },
        { status: 404 },
      )
    }

    if (rechargeRecord.user_id !== user.id) {
      return NextResponse.json(
        { error: "无权访问该充值记录" },
        { status: 403 },
      )
    }

    if (rechargeRecord.status === "completed") {
      return NextResponse.json({
        success: true,
        status: "completed",
        message: "充值已完成",
      })
    }

    if (rechargeRecord.payment_id) {
      try {
        const checkoutDetails = await creem.retrieveCheckout({
          checkoutId: rechargeRecord.payment_id,
          xApiKey: process.env.CREEM_API_KEY!,
        })

        if (checkoutDetails.status === "completed") {
          const { error: updateError } = await supabase.rpc(
            "complete_recharge",
            {
              p_recharge_id: rechargeId,
              p_user_id: user.id,
              p_amount: Number(rechargeRecord.amount),
            },
          )

          if (updateError) {
            console.error("完成充值失败:", updateError)
            return NextResponse.json(
              { error: "完成充值失败" },
              { status: 500 },
            )
          }

          return NextResponse.json({
            success: true,
            status: "completed",
            message: "充值已完成",
          })
        }

        return NextResponse.json({
          success: true,
          status: checkoutDetails.status,
          message: `支付状态: ${checkoutDetails.status}`,
        })
      } catch (error) {
        console.error("查询支付状态失败:", error)
        return NextResponse.json(
          { error: "查询支付状态失败" },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      status: "pending",
      message: "支付未完成",
    })
  } catch (error) {
    console.error("查询充值状态失败:", error)
    return NextResponse.json(
      { error: "查询充值状态失败" },
      { status: 500 },
    )
  }
}
