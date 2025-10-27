require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testProfilePageAPI() {
  try {
    // 获取第一个用户ID
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(1);
    
    if (usersError) {
      console.error('获取用户失败:', usersError);
      return;
    }
    
    if (users.length === 0) {
      console.log('没有找到用户');
      return;
    }
    
    const userId = users[0].id;
    console.log(`测试用户ID: ${userId}, 用户名: ${users[0].username}`);
    
    // 测试获取用户个人资料
    console.log('\n1. 测试获取用户个人资料:');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('获取个人资料失败:', profileError);
    } else {
      console.log('个人资料获取成功:', profile.username);
    }
    
    // 测试获取用户模型
    console.log('\n2. 测试获取用户模型:');
    const { data: models, error: modelsError } = await supabase
      .from('models')
      .select(`
        id, user_id, name, type, content_category, tags, is_original, original_author,
        cover_image_url, description, visibility, is_paid, price, file_url,
        file_size, file_type, status, download_count, view_count, like_count, created_at, updated_at
      `)
      .eq('user_id', userId)
      .eq('visibility', 'public')
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    
    if (modelsError) {
      console.error('获取模型失败:', modelsError);
    } else {
      console.log(`找到 ${models.length} 个模型`);
      models.forEach(model => {
        console.log(`- ID: ${model.id}, 名称: ${model.name}, 可见性: ${model.visibility}, 状态: ${model.status}`);
      });
    }
    
    // 测试获取用户数据集
    console.log('\n3. 测试获取用户数据集:');
    const { data: datasets, error: datasetsError } = await supabase
      .from('datasets')
      .select(`
        id, user_id, name, type, content_category, tags, is_original, original_author,
        cover_image_url, description, visibility, is_paid, price, reference_audio_url,
        demo_audio_url, status, download_count, view_count, like_count, created_at, updated_at
      `)
      .eq('user_id', userId)
      .eq('visibility', 'public')
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    
    if (datasetsError) {
      console.error('获取数据集失败:', datasetsError);
    } else {
      console.log(`找到 ${datasets.length} 个数据集`);
      datasets.forEach(dataset => {
        console.log(`- ID: ${dataset.id}, 名称: ${dataset.name}, 可见性: ${dataset.visibility}, 状态: ${dataset.status}`);
      });
    }
    
    // 测试获取用户点赞的模型
    console.log('\n4. 测试获取用户点赞的模型:');
    const { data: likedModels, error: likedModelsError } = await supabase
      .from('model_likes')
      .select(`
        model_id,
        created_at,
        models!inner (
          id,
          name,
          type,
          cover_image_url,
          download_count,
          view_count,
          is_paid,
          user_id
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (likedModelsError) {
      console.error('获取点赞模型失败:', likedModelsError);
    } else {
      console.log(`找到 ${likedModels.length} 个点赞的模型`);
      likedModels.forEach(item => {
        console.log(`- ID: ${item.models.id}, 名称: ${item.models.name}`);
      });
    }
    
  } catch (error) {
    console.error('测试API时发生错误:', error);
  }
}

testProfilePageAPI();