import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, password, captchaToken } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码不能为空' },
        { status: 400 }
      )
    }

    const options: any = {}
    if (captchaToken) {
      options.captchaToken = captchaToken
    }

    // 使用Supabase进行用户登录
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // 设置会话cookie
    if (data.session) {
      const cookieStore = await cookies()
      const maxAge = 60 * 60 * 24 * 7 // 7天
      
      // 设置访问令牌cookie
      cookieStore.set('sb-access-token', data.session.access_token, {
        maxAge,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
      
      // 设置刷新令牌cookie
      cookieStore.set('sb-refresh-token', data.session.refresh_token, {
        maxAge,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
    }

    return NextResponse.json({ 
      success: true,
      session: data.session,
      user: data.user
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: '登录失败，请重试' },
      { status: 500 }
    )
  }
}