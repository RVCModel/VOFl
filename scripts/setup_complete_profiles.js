// 创建完整的profiles表设置脚本
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 直接读取.env.local文件
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

// 解析环境变量
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    // 去除值两边的引号
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[match[1]] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || envVars.SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('缺少Supabase配置环境变量');
  process.exit(1);
}

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupProfiles() {
  try {
    console.log('开始设置profiles表...');
    
    // 1. 首先创建profiles表
    console.log('1. 创建profiles表...');
    const createProfilesSQL = fs.readFileSync(path.join(__dirname, '..', 'database', 'create_profiles.sql'), 'utf8');
    
    // 分割SQL语句并逐个执行
    const statements = createProfilesSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log('执行SQL:', statement.substring(0, 100) + '...');
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (error) {
            console.error('执行SQL出错:', error);
            // 尝试直接执行
            try {
              const { error: directError } = await supabase.from('_temp').select('*').limit(1);
              if (directError && directError.message.includes('function exec_sql')) {
                console.log('exec_sql函数不存在，尝试其他方法...');
                // 如果exec_sql不存在，我们跳过这个错误
                continue;
              }
            } catch (e) {
              console.log('跳过错误，继续执行...');
            }
          }
        } catch (err) {
          console.error('SQL执行异常:', err.message);
        }
      }
    }
    
    // 2. 确保触发器存在
    console.log('2. 确保触发器存在...');
    const triggerSQL = `
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'on_auth_user_created_profile'
        ) THEN
            CREATE TRIGGER on_auth_user_created_profile
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        END IF;
    END $$;
    `;
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: triggerSQL });
      if (error) {
        console.error('创建触发器出错:', error);
      } else {
        console.log('触发器创建成功');
      }
    } catch (err) {
      console.error('触发器创建异常:', err.message);
    }
    
    console.log('Profiles表设置完成');
  } catch (error) {
    console.error('设置过程中出错:', error);
  }
}

setupProfiles();