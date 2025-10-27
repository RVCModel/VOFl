import { createServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// 创建 Supabase 服务端客户端
const supabase = createServiceClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // 验证用户身份
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // 获取模型信息，获取model_file_url和download_count
    const { data: model, error } = await supabase
      .from('models')
      .select('model_file_url, is_paid, price, download_count')
      .eq('id', id)
      .single()
    
    if (error || !model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }
    
    // 检查模型状态
    const { data: fullModel } = await supabase
      .from('models')
      .select('status')
      .eq('id', id)
      .single()
    
    if (!fullModel || fullModel.status !== 'published') {
      return NextResponse.json(
        { error: 'Model not available' },
        { status: 403 }
      )
    }
    
    // 处理下载逻辑（扣费、记录等）
    if (model.is_paid && model.price && model.price > 0) {
      // 付费模型需要扣费
      const { error: processError } = await supabase.rpc('process_model_download', {
        p_user_id: user.id,
        p_model_id: id,
        p_price: model.price
      })

      if (processError) {
        return NextResponse.json(
          { error: processError.message || 'Download processing failed' },
          { status: 400 }
        )
      }
    } else {
      // 免费模型只需记录下载
      const { error: downloadError } = await supabase
        .from('model_downloads')
        .upsert({
          model_id: id,
          user_id: user.id,
          downloaded_at: new Date().toISOString()
        }, {
          onConflict: 'model_id,user_id'
        })
      
      if (downloadError) {
        console.error('Error recording download:', downloadError)
      }
      
      // 直接增加下载次数
      const { error: updateError } = await supabase
        .from('models')
        .update({ 
          download_count: (model.download_count || 0) + 1 
        })
        .eq('id', id)
      
      if (updateError) {
        console.error('Error incrementing download count:', updateError)
      }
    }
    
    // 返回下载链接
    return NextResponse.json({
      download_url: model.model_file_url
    })
  } catch (error) {
    console.error('Error in model download API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}