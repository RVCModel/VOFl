const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTables() {
  try {
    console.log('检查数据集表是否存在...')
    
    // 检查数据集表
    const { data: datasetsData, error: datasetsError } = await supabase
      .from('datasets')
      .select('*')
      .limit(1)
    
    if (datasetsError) {
      console.error('数据集表不存在或无法访问:', datasetsError)
    } else {
      console.log('数据集表存在且可访问')
    }
    
    // 检查模型表
    const { data: modelsData, error: modelsError } = await supabase
      .from('models')
      .select('*')
      .limit(1)
    
    if (modelsError) {
      console.error('模型表不存在或无法访问:', modelsError)
    } else {
      console.log('模型表存在且可访问')
    }
    
    // 检查profiles表
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (profilesError) {
      console.error('profiles表不存在或无法访问:', profilesError)
    } else {
      console.log('profiles表存在且可访问')
    }
    
    // 检查用户数据
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('获取用户列表失败:', usersError)
    } else {
      console.log(`系统中共有 ${usersData.users.length} 个用户`)
      usersData.users.forEach(user => {
        console.log(`用户ID: ${user.id}, 邮箱: ${user.email}`)
      })
    }
    
    // 检查用户的数据集
    if (usersData.users.length > 0) {
      const firstUserId = usersData.users[0].id
      console.log(`\n检查用户 ${firstUserId} 的数据集...`)
      
      const { data: userDatasets, error: userDatasetsError } = await supabase
        .from('datasets')
        .select('*')
        .eq('user_id', firstUserId)
      
      if (userDatasetsError) {
        console.error('获取用户数据集失败:', userDatasetsError)
      } else {
        console.log(`用户有 ${userDatasets.length} 个数据集`)
      }
    }
    
  } catch (error) {
    console.error('检查过程中发生错误:', error)
  }
}

checkTables()