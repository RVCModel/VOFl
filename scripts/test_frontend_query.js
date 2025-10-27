const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// 创建Supabase服务角色客户端（用于获取用户列表）
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 创建Supabase客户端（模拟前端客户端）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testFrontendDatasetQuery() {
  try {
    console.log('模拟前端查询数据集...')
    
    // 获取第一个用户ID
    const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers()
    
    if (usersError) {
      console.error('获取用户列表失败:', usersError)
      return
    }
    
    if (usersData.users.length === 0) {
      console.log('系统中没有用户')
      return
    }
    
    const firstUserId = usersData.users[0].id
    console.log(`使用用户ID: ${firstUserId} 进行测试`)
    
    // 模拟前端查询：获取用户发布的数据集
    console.log('\n模拟前端查询：获取用户发布的数据集')
    const { data: datasetsData, error: datasetsError } = await supabase
      .from('datasets')
      .select(`
        id, user_id, name, type, content_category, tags, is_original, original_author,
        cover_image_url, description, visibility, is_paid, price, file_url,
        file_size, file_type, status, download_count, view_count, like_count, created_at, updated_at
      `)
      .eq('user_id', firstUserId)
      .eq('visibility', 'public') // 只获取公开可见的数据集
      .eq('status', 'published') // 只获取已发布的数据集
      .order('created_at', { ascending: false })

    console.log('Supabase数据集查询结果:', { datasetsData, datasetsError })
    
    if (datasetsError) {
      console.error('获取数据集列表失败:', datasetsError)
      
      // 检查错误详情
      console.error('错误详情:', {
        message: datasetsError.message,
        details: datasetsError.details,
        hint: datasetsError.hint,
        code: datasetsError.code
      })
    } else {
      console.log(`成功获取 ${datasetsData.length} 个数据集`)
    }
    
    // 测试匿名用户查询（无认证）
    console.log('\n测试匿名用户查询（无认证）')
    const { data: anonymousData, error: anonymousError } = await supabase
      .from('datasets')
      .select(`
        id, user_id, name, type, content_category, tags, is_original, original_author,
        cover_image_url, description, visibility, is_paid, price, file_url,
        file_size, file_type, status, download_count, view_count, like_count, created_at, updated_at
      `)
      .eq('user_id', firstUserId)
      .eq('visibility', 'public')
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    console.log('匿名用户查询结果:', { anonymousData, anonymousError })
    
    if (anonymousError) {
      console.error('匿名用户获取数据集列表失败:', anonymousError)
      
      // 检查错误详情
      console.error('错误详情:', {
        message: anonymousError.message,
        details: anonymousError.details,
        hint: anonymousError.hint,
        code: anonymousError.code
      })
    } else {
      console.log(`匿名用户成功获取 ${anonymousData.length} 个数据集`)
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error)
  }
}

testFrontendDatasetQuery()