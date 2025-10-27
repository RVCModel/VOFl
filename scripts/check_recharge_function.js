const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// 创建Supabase服务角色客户端
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkRechargeFunction() {
  try {
    console.log('检查 complete_recharge 函数是否存在...')
    
    // 查询函数是否存在
    const { data, error } = await adminClient
      .rpc('complete_recharge', {
        p_recharge_id: '00000000-0000-0000-0000-000000000000',
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_amount: 0
      })
    
    if (error) {
      console.error('函数不存在或调用失败:', error)
      
      // 检查函数定义
      console.log('\n检查函数定义...')
      const { data: funcData, error: funcError } = await adminClient
        .from('pg_proc')
        .select('proname, prosrc')
        .eq('proname', 'complete_recharge')
        .single()
      
      if (funcError) {
        console.error('查询函数定义失败:', funcError)
      } else {
        console.log('函数定义:', funcData)
      }
    } else {
      console.log('函数存在且可调用')
    }
    
    // 检查充值记录表是否存在
    console.log('\n检查充值记录表是否存在...')
    const { data: tableData, error: tableError } = await adminClient
      .from('recharge_records')
      .select('id')
      .limit(1)
    
    if (tableError) {
      console.error('充值记录表不存在或无法访问:', tableError)
    } else {
      console.log('充值记录表存在')
    }
    
    // 检查profiles表是否有credits列
    console.log('\n检查profiles表是否有credits列...')
    const { data: columnData, error: columnError } = await adminClient
      .from('profiles')
      .select('credits')
      .limit(1)
    
    if (columnError) {
      console.error('profiles表没有credits列:', columnError)
    } else {
      console.log('profiles表有credits列')
    }
    
  } catch (error) {
    console.error('检查过程中发生错误:', error)
  }
}

checkRechargeFunction()