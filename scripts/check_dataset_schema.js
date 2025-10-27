const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// 创建Supabase服务角色客户端
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkDatasetSchema() {
  try {
    console.log('检查数据集表结构...')
    
    // 查询数据集表的结构
    const { data, error } = await adminClient
      .rpc('get_table_schema', { table_name: 'datasets' })
    
    if (error) {
      console.error('获取表结构失败:', error)
      
      // 尝试另一种方法
      console.log('\n尝试直接查询数据集表...')
      const { data: datasetsData, error: datasetsError } = await adminClient
        .from('datasets')
        .select('*')
        .limit(1)
      
      if (datasetsError) {
        console.error('查询数据集表失败:', datasetsError)
      } else {
        console.log('数据集表中的字段:', Object.keys(datasetsData[0] || {}))
      }
    } else {
      console.log('数据集表结构:', data)
    }
    
    // 查询数据集表的实际数据
    console.log('\n查询数据集表中的数据...')
    const { data: allDatasets, error: allDatasetsError } = await adminClient
      .from('datasets')
      .select('*')
    
    if (allDatasetsError) {
      console.error('查询所有数据集失败:', allDatasetsError)
    } else {
      console.log(`找到 ${allDatasets.length} 个数据集`)
      if (allDatasets.length > 0) {
        console.log('第一个数据集的字段:', Object.keys(allDatasets[0]))
        console.log('第一个数据集的数据:', allDatasets[0])
      }
    }
    
  } catch (error) {
    console.error('检查过程中发生错误:', error)
  }
}

checkDatasetSchema()