import { createServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // 获取请求体
    const body = await request.json()
    let userId: string | null = null
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id || null
    }
    
    // 获取数据集信息
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', id)
      .single()
    
    if (datasetError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      )
    }
    
    // 处理付费数据集
    if (dataset.is_paid) {
      if (!userId) {
        return NextResponse.json(
          { error: 'Authentication required for paid datasets' },
          { status: 401 }
        )
      }
      
      // 调用RPC函数处理付费数据集下载
      const { data, error } = await supabase.rpc('process_dataset_download', {
        p_dataset_id: id,
        p_user_id: userId
      })
      
      if (error) {
        console.error('Error processing paid dataset download:', error)
        return NextResponse.json(
          { error: error.message || 'Failed to process download' },
          { status: 400 }
        )
      }
      
      return NextResponse.json({
        success: true,
        downloadUrl: data,
        isPaid: true
      })
    } else {
      // 处理免费数据集
      if (userId) {
        // 如果用户已登录，增加下载计数
        const { error: incrementError } = await supabase.rpc('increment_dataset_download_count', {
          p_dataset_id: id
        })
        
        if (incrementError) {
          console.error('Error incrementing download count:', incrementError)
        }
      }
      
      return NextResponse.json({
        success: true,
        downloadUrl: dataset.file_url,
        isPaid: false
      })
    }
  } catch (error) {
    console.error('Error in dataset download API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
