'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wallet, ArrowUpCircle, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Balance {
  id: string
  user_id: string
  balance: number
  frozen_balance: number
  created_at: string
  updated_at: string
}

interface BillingCardProps {
  className?: string
}

export default function BillingCard({ className }: BillingCardProps) {
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBalance()
  }, [])

  const fetchBalance = async () => {
    try {
      // 获取用户会话
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setLoading(false)
        return
      }

      const token = session.access_token

      // 获取用户余额
      const response = await fetch('/api/billing/balance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setBalance(data.data)
        setError(null)
      } else {
        setError('获取余额失败')
      }
    } catch (error) {
      console.error('获取余额失败:', error)
      setError('获取余额失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    fetchBalance()
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">账户余额</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Wallet className="h-4 w-4 mr-2" />
            账户余额
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500 mb-4">{error}</div>
          <Button size="sm" onClick={handleRetry} className="w-full">
            重试
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <Wallet className="h-4 w-4 mr-2" />
          账户余额
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-4">¥{balance?.balance.toFixed(2) || '0.00'}</div>
        <div className="flex space-x-2">
          <Link href="/billing">
            <Button size="sm" className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              充值
            </Button>
          </Link>
          <Link href="/billing">
            <Button size="sm" variant="outline" className="flex-1">
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              提现
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}