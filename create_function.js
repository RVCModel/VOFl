const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createFunction() {
  const sql = `
    CREATE OR REPLACE FUNCTION increment_dataset_download_count(p_dataset_id UUID)
    RETURNS VOID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      UPDATE public.datasets 
      SET download_count = download_count + 1
      WHERE id = p_dataset_id;
    END;
    $$;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.log('创建函数失败:', error);
    } else {
      console.log('函数创建成功');
    }
  } catch (err) {
    console.log('创建函数时出错:', err.message);
  }
}

createFunction();