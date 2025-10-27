import { createServerClient } from '@/lib/supabase-server'
import { createClient } from '@/lib/supabase'
import RechargeSuccessClient from './recharge-success-client'

interface RechargeSuccessPageProps {
  searchParams: {
    rechargeId?: string
  }
}

export default async function RechargeSuccessPage({ searchParams }: RechargeSuccessPageProps) {
  const { rechargeId } = searchParams
  
  // 在服务端获取用户信息
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  return (
    <RechargeSuccessClient 
      rechargeId={rechargeId || null} 
      initialUser={user} 
    />
  )
}