import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// 使用 service role，避免验证码要求
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "邮箱不能为空" }, { status: 400 })
    }
    if (!email.includes("@")) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 })
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000"

    const redirectTo = `${origin}/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      console.error("Password reset error:", error)
      return NextResponse.json(
        { error: error.message || "发送重置邮件失败，请检查邮箱是否正确" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "重置邮件已发送，请检查邮箱。",
    })
  } catch (error: any) {
    console.error("Password reset error:", error)
    return NextResponse.json({ error: "发送重置邮件失败，请稍后重试" }, { status: 500 })
  }
}
