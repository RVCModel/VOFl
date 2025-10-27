import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // 清除会话cookie
    cookieStore.delete('sb-access-token')
    cookieStore.delete('sb-refresh-token')
    
    return NextResponse.json({ 
      success: true,
      message: '退出登录成功'
    })
  } catch (error: any) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: '退出登录失败，请重试' },
      { status: 500 }
    )
  }
}