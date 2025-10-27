import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// 创建Supabase服务端客户端
const supabase = createServiceClient()

export async function GET() {
  try {
    // 获取所有已发布且公开的模型ID
    const { data: models, error } = await supabase
      .from('models')
      .select('id')
      .eq('visibility', 'public')
      .eq('status', 'published')
    
    if (error) {
      console.error('Error fetching model IDs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch model IDs' },
        { status: 500 }
      )
    }
    
    // 返回模型ID数组
    const modelIds = models?.map(model => model.id) || []
    
    return NextResponse.json({ modelIds })
  } catch (error) {
    console.error('Error in model IDs API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}