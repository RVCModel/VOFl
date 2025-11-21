import { createServerSupabase } from "@/lib/supabase-server"
import RechargeSuccessClient from "./recharge-success-client"

interface RechargeSuccessPageProps {
  searchParams: {
    rechargeId?: string
  }
}

export default async function RechargeSuccessPage({
  searchParams,
}: RechargeSuccessPageProps) {
  const { rechargeId } = searchParams

  // 在服务端获取当前用户信息，避免前端闪烁
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <RechargeSuccessClient
      rechargeId={rechargeId || null}
      initialUser={user}
    />
  )
}