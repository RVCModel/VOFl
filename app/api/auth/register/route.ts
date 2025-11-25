import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, password, captchaToken } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码长度不能少于6位" }, { status: 400 })
    }

    const options: any = {}
    if (captchaToken) options.captchaToken = captchaToken

    // 直接尝试注册；若邮箱已存在，Supabase 会返回 user.identity 为空或报错
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options,
    })

    // 如果出现数据库通用错误，兜底用 admin.createUser
    if (error) {
      if (error.message?.includes("Database error saving new user")) {
        const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: false, // 仍需用户验证邮箱
        })

        if (adminError) {
          return NextResponse.json(
            { error: adminError.message || "注册失败" },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          data: adminData,
          message: "注册成功！请检查您的邮箱进行验证。",
        })
      }

      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Supabase 对已存在邮箱可能返回 user 且 identities 为空 -> 视为已注册
    if (data?.user && Array.isArray((data as any).user.identities) && (data as any).user.identities.length === 0) {
      return NextResponse.json(
        { error: "该邮箱已注册，请直接登录或使用忘记密码重置" },
        { status: 400 }
      )
    }

    // 如果有 session，写 cookie（通常开启邮箱验证时无 session）
    if (data.session) {
      const cookieStore = await cookies()
      const maxAge = 60 * 60 * 24 * 7 // 7 天

      cookieStore.set("sb-access-token", data.session.access_token, {
        maxAge,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      })

      cookieStore.set("sb-refresh-token", data.session.refresh_token, {
        maxAge,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      })
    }

    return NextResponse.json({
      success: true,
      data,
      message: "注册成功！请检查您的邮箱进行验证。",
    })
  } catch (error: any) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "注册失败，请重试" }, { status: 500 })
  }
}
