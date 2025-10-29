import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

export async function GET() {
  try {
    // 获取所有已发布的数据集ID
    const { data: datasets, error } = await supabase
      .from('datasets')
      .select('id')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching dataset IDs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch dataset IDs' },
        { status: 500 }
      )
    }
    
    // 提取ID数组
    const datasetIds = datasets?.map(dataset => dataset.id) || []
    
    return NextResponse.json({ datasetIds })
  } catch (error) {
    console.error('Error in dataset IDs API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}