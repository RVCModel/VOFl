require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTableStructure() {
  try {
    // 检查models表结构
    console.log('检查models表结构:');
    const { data: modelsColumns, error: modelsError } = await supabase
      .rpc('get_table_columns', { table_name: 'models' })
      .select('column_name, data_type');
    
    if (modelsError) {
      console.error('获取models表结构失败:', modelsError);
      // 尝试另一种方法
      const { data: modelsInfo, error: modelsInfoError } = await supabase
        .from('models')
        .select('*')
        .limit(1);
      
      if (modelsInfoError) {
        console.error('获取models表信息失败:', modelsInfoError);
      } else if (modelsInfo && modelsInfo.length > 0) {
        console.log('models表字段:', Object.keys(modelsInfo[0]));
      }
    } else {
      console.log('models表字段:');
      modelsColumns.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type}`);
      });
    }
    
    // 检查datasets表结构
    console.log('\n检查datasets表结构:');
    const { data: datasetsColumns, error: datasetsError } = await supabase
      .rpc('get_table_columns', { table_name: 'datasets' })
      .select('column_name, data_type');
    
    if (datasetsError) {
      console.error('获取datasets表结构失败:', datasetsError);
      // 尝试另一种方法
      const { data: datasetsInfo, error: datasetsInfoError } = await supabase
        .from('datasets')
        .select('*')
        .limit(1);
      
      if (datasetsInfoError) {
        console.error('获取datasets表信息失败:', datasetsInfoError);
      } else if (datasetsInfo && datasetsInfo.length > 0) {
        console.log('datasets表字段:', Object.keys(datasetsInfo[0]));
      }
    } else {
      console.log('datasets表字段:');
      datasetsColumns.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type}`);
      });
    }
    
  } catch (error) {
    console.error('检查表结构时发生错误:', error);
  }
}

checkTableStructure();