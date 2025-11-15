import { createServerSupabase } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"

// 创建 Supabase 服务端客户端
const supabase = createServerSupabase()

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "邮箱不能为空" },
        { status: 400 }
      )
    }

    // 简单的邮箱格式校验
    if (!email.includes("@")) {
      return NextResponse.json(
        { error: "请输入有效的邮箱地址" },
        { status: 400 }
      )
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000"

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    })

    if (error) {
      console.error("Password reset error:", error)
      return NextResponse.json(
        { error: "重置密码邮件发送失败，请检查邮箱是否正确" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "重置密码邮件已发送，请检查邮箱。",
    })
  } catch (error: any) {
    console.error("Password reset error:", error)
    return NextResponse.json(
      { error: "重置密码邮件发送失败，请稍后重试" },
      { status: 500 }
    )
  }
}

