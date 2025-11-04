import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // 获取请求体中的信息
    const body = await request.json()
    const { type, id } = body // type 可以是 'model', 'dataset' 或 'profile'
    
    if (!type || !id) {
      return NextResponse.json(
        { error: 'Missing required fields: type and id' },
        { status: 400 }
      )
    }
    
    // 这里可以添加日志记录，记录哪些内容触发了sitemap刷新
    console.log(`Sitemap refresh triggered by ${type} with ID: ${id}`)
    
    // 在实际部署中，可以通过以下方式主动刷新CDN缓存：
    // 1. 调用CDN API刷新特定URL
    // 2. 使用webhook通知搜索引擎重新抓取sitemap
    // 3. 在数据库中记录最后更新时间，供sitemap生成时参考
    
    // 由于我们已经在sitemap.xml中设置了较短的缓存时间（5分钟），
    // 这个端点主要用于日志记录和未来扩展
    
    return NextResponse.json({ 
      success: true, 
      message: 'Sitemap refresh triggered',
      type,
      id,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error triggering sitemap refresh:', error)
    return NextResponse.json(
      { error: 'Failed to trigger sitemap refresh' },
      { status: 500 }
    )
  }
}