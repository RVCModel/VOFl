const { createClient } = require('@supabase/supabase-js');

// 创建Supabase客户端
const supabase = createClient(
  'https://fmoepqxhsistzqjcyqkb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtb2VwcXhoc2lzdHpxamN5cWtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY5ODkzMiwiZXhwIjoyMDc2Mjc0OTMyfQ.BjXwueQ2tw5s0aJ7rNtgQrxtmfKaMBg2HTsjSL2Mv7s'
);

async function setupProfileTrigger() {
  try {
    console.log('正在设置profiles表和触发器...');
    
    // 直接执行SQL语句
    const sqlStatements = [
      // 为profiles表添加balance字段
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS balance DECIMAL DEFAULT 0;`,
      
      // 添加注释
      `COMMENT ON COLUMN profiles.balance IS '用户余额，用于付费模型下载';`,
      
      // 更新deduct_balance函数
      `CREATE OR REPLACE FUNCTION deduct_balance(user_id UUID, amount DECIMAL)
      RETURNS VOID AS $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND COALESCE(balance, 0) >= amount) THEN
          RAISE EXCEPTION '余额不足';
        END IF;
        
        UPDATE profiles 
        SET balance = GREATEST(COALESCE(balance, 0) - amount, 0) 
        WHERE id = user_id;
      END;
      $$ LANGUAGE plpgsql;`,
      
      // 创建handle_new_user函数
      `CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.profiles (id, username, display_name, balance)
        VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
          COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
          0
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`,
      
      // 创建触发器
      `DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_trigger 
              WHERE tgname = 'on_auth_user_created_profile'
          ) THEN
              CREATE TRIGGER on_auth_user_created_profile
              AFTER INSERT ON auth.users
              FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
          END IF;
      END $$;`
    ];
    
    // 使用Supabase的SQL REST API执行
    for (const sql of sqlStatements) {
      try {
        const { data, error } = await supabase.rpc('sql', { query: sql });
        
        if (error) {
          console.log('执行SQL失败:', error.message);
          // 尝试使用其他方法
          console.log('SQL语句:', sql.substring(0, 100) + '...');
        } else {
          console.log('SQL执行成功');
        }
      } catch (err) {
        console.log('执行出错:', err.message);
        console.log('SQL语句:', sql.substring(0, 100) + '...');
      }
    }
    
    console.log('设置完成');
  } catch (err) {
    console.error('执行出错:', err);
  }
}

setupProfileTrigger();