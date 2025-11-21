import { createServiceClient } from "@/lib/supabase"
import { NextResponse, NextRequest } from "next/server"

export interface WebhookResponse {
  id: string
  eventType: string
  object: {
    request_id: string
    object: string
    id: string
    customer: {
      id: string
    }
    product: {
      id: string
      billing_type: string
    }
    status: string
    metadata: any
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const webhook = (await req.json()) as WebhookResponse

    console.log("收到 webhook 事件:", JSON.stringify(webhook, null, 2))

    const isSubscription =
      webhook.object.product.billing_type === "recurring"

    if (!isSubscription && webhook.eventType === "checkout.completed") {
      console.log("处理 checkout.completed 事件")
      const rechargeId = webhook.object.request_id
      const paymentId = webhook.object.id

      const { data: rechargeRecord, error: rechargeError } = await supabase
        .from("recharge_records")
        .select("*")
        .eq("id", rechargeId)
        .single()

      if (rechargeError || !rechargeRecord) {
        console.error("获取充值记录失败:", rechargeError)
        return NextResponse.json(
          { error: "获取充值记录失败" },
          { status: 500 },
        )
      }

      const { error: updateRechargeError } = await supabase
        .from("recharge_records")
        .update({
          status: "completed",
          payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rechargeId)

      if (updateRechargeError) {
        console.error("更新充值记录失败:", updateRechargeError)
        return NextResponse.json(
          { error: "更新充值记录失败" },
          { status: 500 },
        )
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", rechargeRecord.user_id)
        .single()

      if (profileError) {
        console.error("获取用户积分失败:", profileError)
        return NextResponse.json(
          { error: "获取用户积分失败" },
          { status: 500 },
        )
      }

      const newCredits = (profile.credits || 0) + rechargeRecord.amount

      const { error: updateCreditsError } = await supabase
        .from("profiles")
        .update({
          credits: newCredits,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rechargeRecord.user_id)

      if (updateCreditsError) {
        console.error("更新用户积分失败:", updateCreditsError)
        return NextResponse.json(
          { error: "更新用户积分失败" },
          { status: 500 },
        )
      }

      console.log(
        `充值记录 ${rechargeId} 已完成，用户 ${
          rechargeRecord.user_id
        } 增加积分 ${rechargeRecord.amount}，新积分: ${newCredits}`,
      )
    } else if (!isSubscription) {
      console.log(`忽略非 checkout.completed 事件: ${webhook.eventType}`)
    }

    return NextResponse.json({
      success: true,
      message: "Webhook received successfully",
    })
  } catch (error) {
    console.error("处理 webhook 失败:", error)
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    )
  }
}