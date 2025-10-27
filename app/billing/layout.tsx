import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '充值中心',
  description: '管理您的账户余额、充值、提现和消费记录',
}

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}