'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'

interface RechargeSuccessClientProps {
  rechargeId: string | null
  initialUser: any
}

export default function RechargeSuccessClient({ rechargeId, initialUser }: RechargeSuccessClientProps) {
  const [loading, setLoading] = useState(true)
  const [rechargeData, setRechargeData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState(initialUser)
  const [userBalance, setUserBalance] = useState<number | null>(null)
  
  const router = useRouter()
  const supabase = createClient()
  
  // 使用useRef来持久化轮询计数，避免每次useEffect重新运行时重置
  const pollCountRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 获取用户余额
  const fetchUserBalance = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.error('用户未登录')
        return
      }

      const response = await fetch('/api/billing/balance', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUserBalance(data.balance)
      }
    } catch (error) {
      console.error('获取用户余额失败:', error)
    }
  }

  useEffect(() => {
    if (!rechargeId) {
      setError('缺少充值记录ID')
      setLoading(false)
      return
    }

    // 如果没有初始用户信息，尝试从客户端获取
    if (!user) {
      const getUser = async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)
      }
      getUser()
    }
  }, [rechargeId])

  useEffect(() => {
    // 重置轮询计数
    pollCountRef.current = 0
    
    // 清除任何现有的定时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    const maxPolls = 12; // 最多轮询12次，即1分钟
    
    const fetchRechargeData = async () => {
      // 获取最新的用户信息
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!rechargeId || !currentUser) return
      
      try {
        // 获取当前用户的会话
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          setError('用户未登录')
          setLoading(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return
        }

        // 获取充值记录
        const response = await fetch(`/api/billing/recharge-record?rechargeId=${rechargeId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (!response.ok) {
          throw new Error('获取充值记录失败')
        }

        const result = await response.json()
        const rechargeRecord = result.data

        setRechargeData(rechargeRecord)
        
        // 如果充值已完成，显示成功消息并停止轮询
        if (rechargeRecord.status === 'completed') {
          setError(null)
          setLoading(false)
          // 获取更新后的用户余额
          fetchUserBalance()
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return
        }

        // 增加轮询计数
        pollCountRef.current++;
        
        // 如果超过最大轮询次数，停止轮询
        if (pollCountRef.current >= maxPolls) {
          setError('支付状态查询超时，请稍后刷新页面查看最新状态')
          setLoading(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return
        }

        // 如果充值记录有payment_id，查询Creem API获取支付状态
        if (rechargeRecord.payment_id) {
          try {
            // 调用支付状态API
            const response = await fetch(`/api/billing/payment-status?rechargeId=${rechargeId}`, {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            })

            if (!response.ok) {
              throw new Error('查询支付状态失败')
            }

            const result = await response.json()
            
            if (result.status === 'completed') {
              // 重新获取充值记录
              const updatedResponse = await fetch(`/api/billing/recharge-record?rechargeId=${rechargeId}`, {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`
                }
              })

              if (updatedResponse.ok) {
                const updatedResult = await updatedResponse.json()
                const updatedRecord = updatedResult.data

                if (updatedRecord) {
                  setRechargeData(updatedRecord)
                  setError(null)
                  setLoading(false)
                  if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                  }
                }
              }
            } else {
              // 如果支付仍在处理中，设置错误消息并继续轮询
              setError(`支付正在处理中: ${result.message || '请稍后查看最新状态'}`)
              
              // 如果还没有设置轮询，设置一个5秒的轮询
              if (!intervalRef.current) {
                intervalRef.current = setInterval(fetchRechargeData, 5000)
              }
            }
          } catch (err) {
            console.error('查询支付状态失败:', err)
            setError('查询支付状态失败，请稍后刷新页面')
            
            // 设置轮询，稍后重试
            if (!intervalRef.current) {
              intervalRef.current = setInterval(fetchRechargeData, 5000)
            }
          }
        } else {
          // 如果没有payment_id，设置错误消息并继续轮询
          setError('支付信息正在处理中，请稍后查看最新状态')
          
          // 如果还没有设置轮询，设置一个5秒的轮询
          if (!intervalRef.current) {
            intervalRef.current = setInterval(fetchRechargeData, 5000)
          }
        }
      } catch (err) {
        console.error('获取充值数据失败:', err)
        setError('获取充值数据失败')
        setLoading(false)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }

    if (rechargeId) {
      // 如果还没有用户信息，先获取用户信息
      if (!user) {
        const getUser = async () => {
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          setUser(currentUser)
        }
        getUser().then(() => {
          // 获取用户信息后再执行数据获取
          setTimeout(fetchRechargeData, 100)
        })
      } else {
        fetchRechargeData()
      }
    }
    
    // 清理函数
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [rechargeId])

  const handleGoToBilling = () => {
    router.push('/billing')
  }

  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">正在处理您的充值...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-yellow-600">充值处理中</CardTitle>
            <CardDescription className="text-center">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-sm">请稍候，我们正在确认您的支付状态...</span>
            </div>
            <Button onClick={handleGoToBilling} className="w-full">
              返回充值中心
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-green-600">充值成功</CardTitle>
          <CardDescription>
            您的充值已成功处理
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">充值金额:</span>
              <span className="text-sm">${rechargeData?.amount}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">交易状态:</span>
              <span className="text-sm text-green-600">已完成</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">充值时间:</span>
              <span className="text-sm">
                {new Date(rechargeData?.created_at).toLocaleString()}
              </span>
            </div>
            {userBalance !== null && userBalance !== undefined && (
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">当前余额:</span>
                <span className="text-sm">${userBalance.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm font-medium">交易ID:</span>
              <span className="text-xs text-gray-500">
                {rechargeData?.id?.substring(0, 8)}...
              </span>
            </div>
          </div>
          <Button onClick={handleGoToBilling} className="w-full">
            返回充值中心
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}