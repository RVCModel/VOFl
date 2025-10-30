import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// 创建Supabase客户端
const supabase = createServerClient()

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: '邮箱不能为空' },
        { status: 400 }
      )
    }

    // 简单的邮箱验证
    if (!email.includes('@')) {
      return NextResponse.json(
        { error: '请输入有效的邮箱地址' },
        { status: 400 }
      )
    }

    // 获取当前请求的域名
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    
    // 使用Supabase发送密码重置邮件
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    })

    if (error) {
      console.error('Password reset error:', error)
      return NextResponse.json(
        { error: '发送密码重置邮件失败，请检查邮箱地址是否正确' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: '密码重置邮件已发送，请检查您的邮箱。'
    })
  } catch (error: any) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: '发送密码重置邮件失败，请重试' },
      { status: 500 }
    )
  }
}