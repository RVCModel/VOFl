import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET() {
  try {
    // 获取请求头信息，构建基础URL
    const headersList = headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`
    
    console.log(`Attempting to refresh sitemap at: ${baseUrl}/api/sitemap/refresh`)
    
    const response = await fetch(`${baseUrl}/api/sitemap/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'scheduled',
        id: 'all'
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Sitemap refresh failed with status ${response.status}: ${errorText}`)
      throw new Error(`Failed to refresh sitemap: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    return NextResponse.json({
      success: true,
      message: 'Scheduled sitemap refresh completed',
      result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in scheduled sitemap refresh:', error)
    return NextResponse.json(
      { error: 'Failed to refresh sitemap' },
      { status: 500 }
    )
  }
}