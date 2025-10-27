import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: '验证码令牌缺失' },
        { status: 400 }
      )
    }

    // 验证HCaptcha令牌
    const hCaptchaSecret = process.env.HCAPTCHA_SECRET_KEY
    
    if (!hCaptchaSecret) {
      console.error('HCaptcha密钥未配置')
      return NextResponse.json(
        { error: '服务器配置错误' },
        { status: 500 }
      )
    }

    const hCaptchaResponse = await fetch(
      'https://hcaptcha.com/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${encodeURIComponent(hCaptchaSecret)}&response=${encodeURIComponent(token)}`,
      }
    )

    const hCaptchaData = await hCaptchaResponse.json()

    if (!hCaptchaData.success) {
      console.error('HCaptcha验证失败:', hCaptchaData['error-codes'])
      return NextResponse.json(
        { error: '验证码验证失败' },
        { status: 400 }
      )
    }

    // 验证成功
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('验证码验证错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}