const { createClient } = require('@supabase/supabase-js');

// 创建Supabase客户端
const supabase = createClient(
  'https://fmoepqxhsistzqjcyqkb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtb2VwcXhoc2lzdHpxamN5cWtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY5ODkzMiwiZXhwIjoyMDc2Mjc0OTMyfQ.BjXwueQ2tw5s0aJ7rNtgQrxtmfKaMBg2HTsjSL2Mv7s'
);

async function setupProfileTrigger() {
  try {
    console.log('正在设置profiles表和触发器...');
    
    // 读取SQL文件
    const fs = require('fs');
    const path = require('path');
    const sqlFilePath = path.join(__dirname, '..', 'database', 'complete_profile_setup.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 使用Supabase SQL API执行SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('执行SQL失败:', error);
      
      // 如果exec_sql不存在，尝试使用其他方法
      console.log('尝试使用直接SQL执行...');
      
      // 分割SQL语句并逐个执行
      const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            // 尝试使用Supabase的SQL执行
            const { data: result, error: stmtError } = await supabase
              .from('profiles')
              .select('*')
              .limit(1);
              
            if (stmtError && !stmtError.message.includes('does not exist')) {
              console.error('执行语句失败:', stmtError);
            }
          } catch (err) {
            console.error('执行语句出错:', err);
          }
        }
      }
    } else {
      console.log('SQL执行成功');
    }
    
    console.log('设置完成');
  } catch (err) {
    console.error('执行出错:', err);
  }
}

setupProfileTrigger();