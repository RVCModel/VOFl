const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixNegativeFollowersCount() {
  try {
    console.log('正在修复负数粉丝数...')
    
    // 修复profiles表中的负数粉丝数
    const { data, error } = await supabase
      .from('profiles')
      .select('id, followers_count')
      .lt('followers_count', 0)
    
    if (error) {
      console.error('查询负数粉丝数失败:', error)
      return
    }
    
    console.log(`找到 ${data.length} 个负数粉丝数的用户`)
    
    if (data.length > 0) {
      // 更新所有负数粉丝数为0
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ followers_count: 0 })
        .lt('followers_count', 0)
      
      if (updateError) {
        console.error('修复负数粉丝数失败:', updateError)
      } else {
        console.log(`成功修复了 ${data.length} 个用户的粉丝数`)
      }
    } else {
      console.log('没有找到负数粉丝数的用户')
    }
    
    // 检查是否还有负数粉丝数
    const { data: checkData, error: checkError } = await supabase
      .from('profiles')
      .select('id, followers_count')
      .lt('followers_count', 0)
    
    if (checkError) {
      console.error('检查修复结果失败:', checkError)
    } else if (checkData.length > 0) {
      console.log(`警告: 仍有 ${checkData.length} 个用户的粉丝数为负数`)
    } else {
      console.log('所有负数粉丝数已成功修复')
    }
    
  } catch (error) {
    console.error('修复过程中出错:', error)
  }
}

fixNegativeFollowersCount()