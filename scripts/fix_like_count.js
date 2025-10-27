import { createServiceClient } from '../lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

async function fixLikeCount() {
  const supabase = createServiceClient()
  
  try {
    // 读取SQL文件
    const sqlPath = join(process.cwd(), 'fix_like_count.sql')
    const sql = readFileSync(sqlPath, 'utf8')
    
    console.log('Executing SQL to fix like count...')
    
    // 执行SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('Error executing SQL:', error)
      return
    }
    
    console.log('SQL executed successfully:', data)
  } catch (error) {
    console.error('Error:', error)
  }
}

fixLikeCount()