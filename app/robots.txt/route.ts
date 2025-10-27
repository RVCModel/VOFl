import { NextResponse } from 'next/server'

export function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vofl.ai'
  
  const robotsTxt = `User-agent: *
Allow: /

# 站点地图
Sitemap: ${baseUrl}/sitemap.xml

# 禁止爬取的路径
Disallow: /api/
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /billing/
Disallow: /publish/
Disallow: /customize/
Disallow: /messages/
Disallow: /auth-test/
Disallow: /db-test/
Disallow: /test-search/

# 爬取延迟 (可选)
Crawl-delay: 1
`
  
  return new NextResponse(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400', // 缓存1天
    },
  })
}