// 同步现有Authentication用户到profiles表的脚本
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

// 尝试从多个可能的变量名获取Supabase URL
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || envVars.SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

// 创建非SSL连接字符串
let postgresUrl = envVars.POSTGRES_URL;
if (postgresUrl) {
  // 替换sslmode=require为sslmode=disable
  postgresUrl = postgresUrl.replace(/sslmode=require/g, 'sslmode=disable');
}

console.log('Supabase URL:', supabaseUrl);
console.log('Postgres URL exists:', !!postgresUrl);
console.log('Supabase Key exists:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('缺少Supabase配置环境变量');
  process.exit(1);
}

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncUsersToProfiles() {
  try {
    console.log('开始同步现有用户到profiles表...');
    
    // 1. 获取所有Authentication用户
    console.log('1. 获取所有Authentication用户...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('获取Authentication用户失败:', authError);
      return;
    }
    
    console.log(`找到 ${authUsers.users.length} 个Authentication用户`);
    
    // 2. 获取所有已有profiles记录
    console.log('2. 获取所有已有profiles记录...');
    const { data: existingProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id');
    
    if (profilesError) {
      console.error('获取profiles记录失败:', profilesError);
      return;
    }
    
    const existingProfileIds = existingProfiles.map(p => p.id);
    console.log(`找到 ${existingProfileIds.length} 个已有profiles记录`);
    
    // 3. 找出需要同步的用户
    const usersToSync = authUsers.users.filter(user => !existingProfileIds.includes(user.id));
    console.log(`需要同步 ${usersToSync.length} 个用户到profiles表`);
    
    if (usersToSync.length === 0) {
      console.log('所有用户都已在profiles表中有记录，无需同步');
      return;
    }
    
    // 4. 批量插入缺失的用户到profiles表
    console.log('4. 批量插入缺失的用户到profiles表...');
    const profilesToInsert = usersToSync.map(user => ({
      id: user.id,
      username: user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
      display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || `User ${user.id.slice(0, 8)}`,
      bio: '',
      avatar_url: user.user_metadata?.avatar_url || '',
      cover_url: '',
      followers_count: 0,
      following_count: 0,
      likes_count: 0,
      balance: 0,
      credits: 0,
      is_admin: false
    }));
    
    // 分批插入，避免一次插入过多数据
    const batchSize = 100;
    for (let i = 0; i < profilesToInsert.length; i += batchSize) {
      const batch = profilesToInsert.slice(i, i + batchSize);
      console.log(`插入批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(profilesToInsert.length/batchSize)}，包含 ${batch.length} 个用户`);
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert(batch);
      
      if (insertError) {
        console.error(`插入批次失败:`, insertError);
        // 尝试逐个插入
        for (const profile of batch) {
          const { error: singleInsertError } = await supabase
            .from('profiles')
            .insert(profile);
          
          if (singleInsertError) {
            console.error(`插入用户 ${profile.id} 失败:`, singleInsertError);
          } else {
            console.log(`成功插入用户 ${profile.id}`);
          }
        }
      } else {
        console.log(`成功插入批次 ${Math.floor(i/batchSize) + 1}`);
      }
    }
    
    console.log('用户同步完成！');
    
    // 5. 验证同步结果
    console.log('5. 验证同步结果...');
    const { data: finalProfiles, error: finalProfilesError } = await supabase
      .from('profiles')
      .select('id');
    
    if (finalProfilesError) {
      console.error('验证同步结果失败:', finalProfilesError);
    } else {
      console.log(`同步后profiles表中共有 ${finalProfiles.length} 条记录`);
      console.log(`Authentication用户数: ${authUsers.users.length}`);
      
      if (finalProfiles.length === authUsers.users.length) {
        console.log('✅ 所有用户都已成功同步到profiles表！');
      } else {
        console.log(`⚠️ 仍有 ${authUsers.users.length - finalProfiles.length} 个用户未同步到profiles表`);
      }
    }
    
  } catch (error) {
    console.error('同步过程中出错:', error);
  }
}

// 执行同步
syncUsersToProfiles().then(() => {
  console.log('同步脚本执行完成');
  process.exit(0);
}).catch(error => {
  console.error('同步脚本执行失败:', error);
  process.exit(1);
});