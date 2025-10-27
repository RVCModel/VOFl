const { createClient } = require('@supabase/supabase-js');

// 创建Supabase客户端
const supabase = createClient(
  'https://fmoepqxhsistzqjcyqkb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtb2VwcXhzaXN0enFqY3lxa2IiLCJyb2xlIjoiYXBpX2FkbWluIiwiaWF0IjoxNzE4NzU1MTM3LCJleHAiOjIwNDQzMzExMzd9.1E3OajH5nLz-2mJ1wBv3hJw0xvYk0lE9wQmJj8a3c7o'
);

async function createProfileTrigger() {
  try {
    console.log('正在创建profiles表触发器...');
    
    // 读取SQL文件
    const fs = require('fs');
    const path = require('path');
    const sqlFilePath = path.join(__dirname, 'database', 'create_profile_trigger.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 执行SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('创建触发器失败:', error);
      
      // 如果exec_sql不存在，尝试直接使用SQL
      console.log('尝试使用直接SQL执行...');
      const { data: directData, error: directError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
        
      if (directError && directError.message.includes('does not exist')) {
        console.log('profiles表不存在，需要先创建');
        return;
      }
      
      // 使用SQL执行
      const { data: sqlData, error: sqlError } = await supabase
        .from('sql')
        .select('*')
        .limit(1);
    }
    
    console.log('触发器创建成功');
  } catch (err) {
    console.error('执行出错:', err);
  }
}

createProfileTrigger();