// 使用PostgreSQL直接连接创建profiles表
const { Client } = require('pg');
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

// 使用POSTGRES_URL连接数据库
const postgresUrl = envVars.POSTGRES_URL;

if (!postgresUrl) {
  console.error('未找到POSTGRES_URL环境变量');
  process.exit(1);
}

console.log('连接到数据库...');

// 修改连接字符串，禁用SSL
let postgresUrlNoSSL = postgresUrl;
if (postgresUrl.includes('sslmode=require')) {
  postgresUrlNoSSL = postgresUrl.replace('sslmode=require', 'sslmode=disable');
}

const client = new Client({
  connectionString: postgresUrlNoSSL
});

async function setupProfiles() {
  try {
    await client.connect();
    console.log('数据库连接成功');
    
    // 读取SQL文件
    const sqlPath = path.join(__dirname, '..', 'database', 'create_complete_profiles.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('执行SQL创建profiles表...');
    await client.query(sql);
    
    console.log('Profiles表创建成功');
  } catch (error) {
    console.error('执行SQL时出错:', error);
  } finally {
    await client.end();
    console.log('数据库连接已关闭');
  }
}

setupProfiles();