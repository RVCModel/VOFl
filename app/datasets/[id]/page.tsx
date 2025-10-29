import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import DatasetDetailClient from './client'

// 强制页面动态渲染
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// 生成静态参数（可选，用于静态生成）
export async function generateStaticParams() {
  try {
    // 使用API端点获取所有数据集ID
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/datasets/ids`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      console.error('Failed to fetch dataset IDs for static params')
      return []
    }
    
    const data = await response.json()
    const datasetIds = data.datasetIds || []
    
    return datasetIds.map((id: string) => ({
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
    // 使用API端点获取数据集详情
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const response = await fetch(`${baseUrl}/api/datasets/${id}?includeAuthor=true&includeAuthorDatasets=true`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      return {
        title: '数据集未找到 - VOFL',
        description: '您查找的数据集不存在或已被删除',
      }
    }
    
    const data = await response.json()
    const dataset = data
    
    if (!dataset) {
      return {
        title: '数据集未找到 - VOFL',
        description: '您查找的数据集不存在或已被删除',
      }
    }
    
    const author = dataset.profiles
    
    const title = `${dataset.name} - ${author?.display_name || author?.username || '未知作者'} - VOFL.AI Speech Model Dataset`
    const description = dataset.description 
      ? `${dataset.description.substring(0, 160)}${dataset.description.length > 160 ? '...' : ''}`
      : `${dataset.name} - ${dataset.type}类型的${dataset.content_category}数据集`
    
    const keywords = [
      dataset.name,
      dataset.type,
      dataset.content_category,
      'VOFL',
      '数据集',
      'Model',
      'Dataset',
      'AI数据集',
      '语音数据集',
      '训练数据',
      ...(dataset.tags || [])
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
        publishedTime: dataset.created_at,
        images: dataset.cover_image_url ? [
          {
            url: dataset.cover_image_url,
            width: 1200,
            height: 630,
            alt: `${dataset.name} - 数据集`,
          },
        ] : [],
        siteName: 'VOFL数据集平台',
        locale: 'zh_CN',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: dataset.cover_image_url ? [dataset.cover_image_url] : [],
      },
      alternates: {
        canonical: `/datasets/${id}`,
      },
      other: {
        'article:tag': dataset.tags?.join(', ') || '',
        'article:section': dataset.content_category,
        'article:author': author?.display_name || author?.username || '未知作者',
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: '数据集详情 - VOFL',
      description: '专业的VOFL模型和数据集分享平台',
    }
  }
}

// 页面组件
export default async function DatasetDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  
  try {
    // 使用API端点获取数据集详情
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/datasets/${id}?includeAuthor=true&includeAuthorDatasets=true`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      notFound()
    }
    
    const dataset = await response.json()
    
    if (!dataset) {
      notFound()
    }
    
    return <DatasetDetailClient initialDataset={dataset} initialAuthorDatasets={dataset.authorDatasets || []} searchParams={await searchParams} />
  } catch (error) {
    console.error('Error fetching dataset:', error)
    notFound()
  }
}