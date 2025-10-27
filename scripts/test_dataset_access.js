const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testDatasetAccess() {
  try {
    console.log('测试数据集表的访问权限...')
    
    // 获取第一个用户ID
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()
    
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
    
    // 测试1: 使用服务角色查询所有数据集
    console.log('\n测试1: 使用服务角色查询所有数据集')
    const { data: allDatasets, error: allDatasetsError } = await supabase
      .from('datasets')
      .select('*')
    
    if (allDatasetsError) {
      console.error('查询所有数据集失败:', allDatasetsError)
    } else {
      console.log(`找到 ${allDatasets.length} 个数据集`)
    }
    
    // 测试2: 使用服务角色查询用户数据集
    console.log('\n测试2: 使用服务角色查询用户数据集')
    const { data: userDatasets, error: userDatasetsError } = await supabase
      .from('datasets')
      .select('*')
      .eq('user_id', firstUserId)
    
    if (userDatasetsError) {
      console.error('查询用户数据集失败:', userDatasetsError)
    } else {
      console.log(`用户有 ${userDatasets.length} 个数据集`)
    }
    
    // 测试3: 使用服务角色查询公开的已发布数据集
    console.log('\n测试3: 使用服务角色查询公开的已发布数据集')
    const { data: publicDatasets, error: publicDatasetsError } = await supabase
      .from('datasets')
      .select('*')
      .eq('user_id', firstUserId)
      .eq('visibility', 'public')
      .eq('status', 'published')
    
    if (publicDatasetsError) {
      console.error('查询公开的已发布数据集失败:', publicDatasetsError)
    } else {
      console.log(`用户有 ${publicDatasets.length} 个公开的已发布数据集`)
    }
    
    // 测试4: 创建一个测试数据集
    console.log('\n测试4: 创建一个测试数据集')
    const testDataset = {
      user_id: firstUserId,
      name: '测试数据集',
      type: 'voice',
      content_category: 'other',
      visibility: 'public',
      status: 'published',
      description: '这是一个测试数据集'
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('datasets')
      .insert(testDataset)
      .select()
    
    if (insertError) {
      console.error('创建测试数据集失败:', insertError)
    } else {
      console.log('成功创建测试数据集:', insertData[0].id)
      
      // 测试5: 再次查询用户数据集
      console.log('\n测试5: 再次查询用户数据集')
      const { data: userDatasetsAfterInsert, error: userDatasetsAfterInsertError } = await supabase
        .from('datasets')
        .select('*')
        .eq('user_id', firstUserId)
        .eq('visibility', 'public')
        .eq('status', 'published')
      
      if (userDatasetsAfterInsertError) {
        console.error('查询用户数据集失败:', userDatasetsAfterInsertError)
      } else {
        console.log(`用户有 ${userDatasetsAfterInsert.length} 个公开的已发布数据集`)
      }
      
      // 删除测试数据集
      console.log('\n删除测试数据集')
      const { error: deleteError } = await supabase
        .from('datasets')
        .delete()
        .eq('id', insertData[0].id)
      
      if (deleteError) {
        console.error('删除测试数据集失败:', deleteError)
      } else {
        console.log('成功删除测试数据集')
      }
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error)
  }
}

testDatasetAccess()