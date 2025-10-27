const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// 创建Supabase服务角色客户端
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkDatasetStatus() {
  try {
    console.log('检查数据集状态...')
    
    // 获取所有数据集
    const { data: allDatasets, error: allDatasetsError } = await adminClient
      .from('datasets')
      .select('id, user_id, name, visibility, status')
    
    if (allDatasetsError) {
      console.error('查询所有数据集失败:', allDatasetsError)
      return
    }
    
    console.log(`找到 ${allDatasets.length} 个数据集:`)
    allDatasets.forEach(dataset => {
      console.log(`- ID: ${dataset.id}, 用户ID: ${dataset.user_id}, 名称: ${dataset.name}, 可见性: ${dataset.visibility}, 状态: ${dataset.status}`)
    })
    
    // 获取用户的数据集
    const userId = 'ac653bf7-c5f8-4800-891e-c26c213e68d5'
    const { data: userDatasets, error: userDatasetsError } = await adminClient
      .from('datasets')
      .select('id, name, visibility, status')
      .eq('user_id', userId)
    
    if (userDatasetsError) {
      console.error(`查询用户 ${userId} 的数据集失败:`, userDatasetsError)
      return
    }
    
    console.log(`\n用户 ${userId} 有 ${userDatasets.length} 个数据集:`)
    userDatasets.forEach(dataset => {
      console.log(`- ID: ${dataset.id}, 名称: ${dataset.name}, 可见性: ${dataset.visibility}, 状态: ${dataset.status}`)
    })
    
    // 检查是否有公开且已发布的数据集
    const { data: publicPublishedDatasets, error: publicPublishedError } = await adminClient
      .from('datasets')
      .select('id, user_id, name, visibility, status')
      .eq('visibility', 'public')
      .eq('status', 'published')
    
    if (publicPublishedError) {
      console.error('查询公开且已发布的数据集失败:', publicPublishedError)
      return
    }
    
    console.log(`\n系统中有 ${publicPublishedDatasets.length} 个公开且已发布的数据集:`)
    publicPublishedDatasets.forEach(dataset => {
      console.log(`- ID: ${dataset.id}, 用户ID: ${dataset.user_id}, 名称: ${dataset.name}, 可见性: ${dataset.visibility}, 状态: ${dataset.status}`)
    })
    
  } catch (error) {
    console.error('检查过程中发生错误:', error)
  }
}

checkDatasetStatus()