const { createClient } = require('@supabase/supabase-js')

// 创建Supabase客户端
const supabase = createClient(
  'https://fmoepqxhsistzqjcyqkb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtb2VwcXhoc2lzdHpxamN5cWtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY5ODkzMiwiZXhwIjoyMDc2Mjc0OTMyfQ.BjXwueQ2tw5s0aJ7rNtgQrxtmfKaMBg2HTsjSL2Mv7s'
)

async function createProfilesTable() {
  try {
    console.log('开始创建profiles表...')
    
    // 直接执行SQL
    const { error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (error && error.message.includes('does not exist')) {
      console.log('profiles表不存在，正在创建...')
      
      // 创建profiles表的SQL
      const createProfilesSQL = `
        CREATE TABLE IF NOT EXISTS public.profiles (
          id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
          username TEXT UNIQUE,
          display_name TEXT,
          bio TEXT,
          avatar_url TEXT,
          cover_url TEXT,
          followers_count INTEGER DEFAULT 0,
          following_count INTEGER DEFAULT 0,
          likes_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          balance DECIMAL DEFAULT 0,
          credits INTEGER DEFAULT 0,
          is_admin BOOLEAN DEFAULT false
        );
      `
      
      // 使用SQL执行
      const { error: createError } = await supabase.rpc('exec', { sql: createProfilesSQL })
      
      if (createError) {
        console.error('创建profiles表失败:', createError)
        console.log('尝试使用原始SQL...')
        
        // 如果rpc失败，尝试使用原始SQL
        const { error: rawError } = await supabase
          .from('profiles')
          .insert({ id: '00000000-0000-0000-0000-000000000000' })
        
        if (rawError && !rawError.message.includes('duplicate key')) {
          console.error('使用原始SQL也失败:', rawError)
        } else {
          console.log('profiles表创建成功')
        }
      } else {
        console.log('profiles表创建成功')
      }
    } else if (error) {
      console.error('检查profiles表时出错:', error)
    } else {
      console.log('profiles表已存在')
    }
    
    console.log('操作完成')
  } catch (error) {
    console.error('执行过程中出错:', error)
  }
}

createProfilesTable()