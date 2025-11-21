import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServiceClient()
  
  try {
    // 获取所有已发布的模型
    const { data: models } = await supabase
      .from('models')
      .select('id, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
    
    // 获取所有已发布的数据集
    const { data: datasets } = await supabase
      .from('datasets')
      .select('id, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
    
    // 获取所有公开的用户资料
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://vofl.com'
    
    // 确保baseUrl包含协议
    const fullBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`
    
    // 创建XML站点地图
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <!-- 首页 -->
        <url>
          <loc>${fullBaseUrl}</loc>
          <lastmod>${new Date().toISOString()}</lastmod>
          <changefreq>daily</changefreq>
          <priority>1.0</priority>
        </url>
        
        <!-- 模型列表页 -->
        <url>
          <loc>${fullBaseUrl}/models</loc>
          <lastmod>${new Date().toISOString()}</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.9</priority>
        </url>
        
        <!-- 数据集列表页 -->
        <url>
          <loc>${fullBaseUrl}/datasets</loc>
          <lastmod>${new Date().toISOString()}</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.9</priority>
        </url>
        
        <!-- 模型详情页 -->
        ${models?.map(model => `
        <url>
          <loc>${fullBaseUrl}/models/${model.id}</loc>
          <lastmod>${new Date(model.updated_at).toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>
        `).join('') || ''}
        
        <!-- 数据集详情页 -->
        ${datasets?.map(dataset => `
        <url>
          <loc>${fullBaseUrl}/datasets/${dataset.id}</loc>
          <lastmod>${new Date(dataset.updated_at).toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>
        `).join('') || ''}
        
        <!-- 用户资料页 -->
        ${profiles?.map(profile => `
        <url>
          <loc>${fullBaseUrl}/profile/${profile.id}</loc>
          <lastmod>${new Date(profile.updated_at).toISOString()}</lastmod>
          <changefreq>monthly</changefreq>
          <priority>0.7</priority>
        </url>
        `).join('') || ''}
      </urlset>
    `
    
    return new NextResponse(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}
