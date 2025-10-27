import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import ModelDetailClient from './client'

// 强制页面动态渲染
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

// 生成静态参数（可选，用于静态生成）
export async function generateStaticParams() {
  try {
    // 使用API端点获取所有模型ID
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/models/ids`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      console.error('Failed to fetch model IDs for static params')
      return []
    }
    
    const data = await response.json()
    const modelIds = data.modelIds || []
    
    return modelIds.map((id: string) => ({
      id: id.toString()
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}

// 生成页面元数据
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  
  try {
    // 使用API端点获取模型详情
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/models/${id}`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      return {
        title: '模型未找到 - VOFL',
        description: '您查找的模型不存在或已被删除',
      }
    }
    
    const data = await response.json()
    const model = data
    
    if (!model) {
      return {
        title: '模型未找到 - VOFL',
        description: '您查找的模型不存在或已被删除',
      }
    }
    
    const author = model.profiles
    
    const title = `${model.name} - ${author?.display_name || author?.username || '未知作者'} - VOFL`
    const description = model.description 
      ? `${model.description.substring(0, 160)}${model.description.length > 160 ? '...' : ''}`
      : `${model.name} - ${model.type}类型的${model.content_category}语音合成模型`
    
    const keywords = [
      model.name,
      model.type,
      model.content_category,
      'VOFL',
      '语音合成',
      'AI语音',
      '语音模型',
      ...(model.tags || [])
    ].filter(Boolean).join(', ')
    
    return {
      title,
      description,
      keywords,
      authors: [{ name: author?.display_name || author?.username || '未知作者' }],
      openGraph: {
        title,
        description,
        type: 'article',
        publishedTime: model.created_at,
        images: model.cover_image_url ? [
          {
            url: model.cover_image_url,
            width: 1200,
            height: 630,
            alt: `${model.name} - 语音合成模型`,
          },
        ] : [],
        siteName: 'VOFL',
        locale: 'zh_CN',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: model.cover_image_url ? [model.cover_image_url] : [],
      },
      alternates: {
        canonical: `/models/${id}`,
      },
      other: {
        'article:tag': model.tags?.join(', ') || '',
        'article:section': model.content_category,
        'article:author': author?.display_name || author?.username || '未知作者',
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: '模型详情 - VOFL',
      description: '专业的VOFL模型和数据集分享平台',
    }
  }
}

// 页面组件
export default async function ModelDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  
  try {
    // 使用API端点获取模型详情
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/models/${id}`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      notFound()
    }
    
    const model = await response.json()
    
    if (!model) {
      notFound()
    }
    
    return <ModelDetailClient initialModel={model} searchParams={await searchParams} />
  } catch (error) {
    console.error('Error fetching model:', error)
    notFound()
  }
}