'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wallet, CreditCard, TrendingUp, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: '充值中心', href: '/billing', icon: Wallet },
  { name: '充值记录', href: '/billing?tab=recharge', icon: CreditCard },
  { name: '提现记录', href: '/billing?tab=withdrawal', icon: TrendingUp },
  { name: '消费记录', href: '/billing?tab=consumption', icon: Receipt },
]

export default function BillingNavigation() {
  const pathname = usePathname()

  return (
    <nav className="flex space-x-4">
      {navigation.map((item) => {
        const isActive = pathname === item.href || 
          (pathname === '/billing' && item.href === '/billing')
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <item.icon className="h-4 w-4 mr-2" />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}