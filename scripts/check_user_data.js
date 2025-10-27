require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserData() {
  try {
    // 获取所有用户
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .limit(5);
    
    if (usersError) {
      console.error('获取用户失败:', usersError);
      return;
    }
    
    console.log('用户列表:');
    users.forEach(user => {
      console.log(`- ID: ${user.id}, 用户名: ${user.username}, 显示名: ${user.display_name}`);
    });
    
    if (users.length === 0) {
      console.log('没有找到用户');
      return;
    }
    
    // 检查第一个用户的模型和数据集
    const userId = users[0].id;
    console.log(`\n检查用户 ${users[0].username} (ID: ${userId}) 的数据:`);
    
    // 检查模型
    const { data: allModels, error: allModelsError } = await supabase
      .from('models')
      .select('id, name, visibility, status, user_id')
      .eq('user_id', userId);
    
    if (allModelsError) {
      console.error('获取模型失败:', allModelsError);
    } else {
      console.log('\n所有模型:');
      allModels.forEach(model => {
        console.log(`- ID: ${model.id}, 名称: ${model.name}, 可见性: ${model.visibility}, 状态: ${model.status}`);
      });
      
      // 检查公开且已发布的模型
      const { data: publicModels, error: publicModelsError } = await supabase
        .from('models')
        .select('id, name, visibility, status, user_id')
        .eq('user_id', userId)
        .eq('visibility', 'public')
        .eq('status', 'published');
      
      if (publicModelsError) {
        console.error('获取公开模型失败:', publicModelsError);
      } else {
        console.log('\n公开且已发布的模型:');
        if (publicModels.length === 0) {
          console.log('没有找到公开且已发布的模型');
        } else {
          publicModels.forEach(model => {
            console.log(`- ID: ${model.id}, 名称: ${model.name}, 可见性: ${model.visibility}, 状态: ${model.status}`);
          });
        }
      }
    }
    
    // 检查数据集
    const { data: allDatasets, error: allDatasetsError } = await supabase
      .from('datasets')
      .select('id, name, visibility, status, user_id')
      .eq('user_id', userId);
    
    if (allDatasetsError) {
      console.error('获取数据集失败:', allDatasetsError);
    } else {
      console.log('\n所有数据集:');
      allDatasets.forEach(dataset => {
        console.log(`- ID: ${dataset.id}, 名称: ${dataset.name}, 可见性: ${dataset.visibility}, 状态: ${dataset.status}`);
      });
      
      // 检查公开且已发布的数据集
      const { data: publicDatasets, error: publicDatasetsError } = await supabase
        .from('datasets')
        .select('id, name, visibility, status, user_id')
        .eq('user_id', userId)
        .eq('visibility', 'public')
        .eq('status', 'published');
      
      if (publicDatasetsError) {
        console.error('获取公开数据集失败:', publicDatasetsError);
      } else {
        console.log('\n公开且已发布的数据集:');
        if (publicDatasets.length === 0) {
          console.log('没有找到公开且已发布的数据集');
        } else {
          publicDatasets.forEach(dataset => {
            console.log(`- ID: ${dataset.id}, 名称: ${dataset.name}, 可见性: ${dataset.visibility}, 状态: ${dataset.status}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('检查用户数据时发生错误:', error);
  }
}

checkUserData();