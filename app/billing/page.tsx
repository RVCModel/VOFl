'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Wallet, ArrowUpCircle, ArrowDownCircle, Receipt, Plus, Loader2, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { translations } from '@/lib/i18n'

// 创建Supabase客户端
const supabase = createClient()

interface Balance {
  id: string
  user_id: string
  balance: number
  frozen_balance: number
  created_at: string
  updated_at: string
}

interface RechargeRecord {
  id: string
  user_id: string
  amount: number
  payment_method: string
  payment_id: string
  status: string
  description: string
  created_at: string
  updated_at: string
}

interface WithdrawalRecord {
  id: string
  user_id: string
  amount: number
  withdrawal_method: string
  withdrawal_address: string
  status: string
  description: string
  created_at: string
  updated_at: string
}

interface ConsumptionRecord {
  id: string
  user_id: string
  amount: number
  product_type: string
  product_id: string
  description: string
  created_at: string
  updated_at: string
}

export default function BillingPage() {
  const { locale } = useLocale()
  const t = translations[locale]
  const [balance, setBalance] = useState<Balance | null>(null)
  const [rechargeRecords, setRechargeRecords] = useState<RechargeRecord[]>([])
  const [withdrawalRecords, setWithdrawalRecords] = useState<WithdrawalRecord[]>([])
  const [consumptionRecords, setConsumptionRecords] = useState<ConsumptionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [rechargeLoading, setRechargeLoading] = useState(false)
  const [withdrawalLoading, setWithdrawalLoading] = useState(false)
  
  // 充值表单状态
  const [rechargeAmount, setRechargeAmount] = useState('')
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false)
  
  // 提现表单状态
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [withdrawalMethod, setWithdrawalMethod] = useState('')
  const [withdrawalAddress, setWithdrawalAddress] = useState('')
  const [withdrawalDescription, setWithdrawalDescription] = useState('')
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false)

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    try {
      // 获取当前用户
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('用户未登录')
        setLoading(false)
        return
      }

      // 获取用户会话
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.error('用户会话不存在')
        setLoading(false)
        return
      }

      const token = session.access_token

      // 获取用户余额
      const balanceResponse = await fetch('/api/billing/balance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json()
        setBalance(balanceData.data)
      }

      // 获取充值记录
      const rechargeResponse = await fetch('/api/billing/recharge', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (rechargeResponse.ok) {
        const rechargeData = await rechargeResponse.json()
        setRechargeRecords(rechargeData.data || [])
      }

      // 获取提现记录
      const withdrawalResponse = await fetch('/api/billing/withdrawal', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (withdrawalResponse.ok) {
        const withdrawalData = await withdrawalResponse.json()
        setWithdrawalRecords(withdrawalData.data || [])
      }

      // 获取消费记录
      const consumptionResponse = await fetch('/api/billing/consumption', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (consumptionResponse.ok) {
        const consumptionData = await consumptionResponse.json()
        setConsumptionRecords(consumptionData.data || [])
      }
    } catch (error) {
      console.error('获取账单数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRecharge = async () => {
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      alert(t.billing.invalidAmount)
      return
    }

    setRechargeLoading(true)
    try {
      // 获取用户会话
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        alert(t.billing.sessionNotFound)
        return
      }

      const token = session.access_token

      const response = await fetch('/api/billing/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(rechargeAmount),
          productId: 'default_recharge' // 使用默认产品ID
        })
      })

      if (response.ok) {
        const data = await response.json()
        // 跳转到支付页面
        window.location.href = data.checkoutUrl
      } else {
        const errorData = await response.json()
        alert(errorData.error || '充值失败')
      }
    } catch (error) {
      console.error('充值失败:', error)
      alert(t.billing.rechargeFailed)
    } finally {
      setRechargeLoading(false)
      setRechargeDialogOpen(false)
    }
  }

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      alert(t.billing.invalidWithdrawalAmount)
      return
    }

    if (!withdrawalMethod) {
      alert(t.billing.selectWithdrawalMethod)
      return
    }

    if (!withdrawalAddress) {
      alert(t.billing.enterWithdrawalAddress)
      return
    }

    if (balance && parseFloat(withdrawalAmount) > balance.balance) {
      alert(t.billing.insufficientBalance)
      return
    }

    setWithdrawalLoading(true)
    try {
      // 获取用户会话
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        alert(t.billing.sessionNotFound)
        return
      }

      const token = session.access_token

      const response = await fetch('/api/billing/withdrawal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(withdrawalAmount),
          withdrawalMethod,
          withdrawalAddress,
          description: withdrawalDescription
        })
      })

      if (response.ok) {
        alert(t.billing.withdrawalSubmitted)
        setWithdrawalDialogOpen(false)
        fetchBillingData() // 刷新数据
      } else {
        const errorData = await response.json()
        alert(errorData.error || '提现失败')
      }
    } catch (error) {
      console.error('提现失败:', error)
      alert(t.billing.withdrawalFailed)
    } finally {
      setWithdrawalLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />{t.billing.completed}</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />{t.billing.pending}</Badge>
      case 'processing':
        return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />{t.billing.processing}</Badge>
      case 'failed':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />{t.billing.failed}</Badge>
      case 'cancelled':
        return <Badge className="bg-gray-500"><XCircle className="h-3 w-3 mr-1" />{t.billing.cancelled}</Badge>
      default:
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t.billing.title}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t.billing.description}</p>
      </div>

      {/* 余额卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.billing.availableBalance}</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${balance?.balance.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.billing.frozenBalance}</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${balance?.frozen_balance.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.billing.totalBalance}</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${((balance?.balance || 0) + (balance?.frozen_balance || 0)).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Dialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t.billing.recharge}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.billing.accountRecharge}</DialogTitle>
              <DialogDescription>
                {t.billing.rechargeDescription}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="recharge-amount">{t.billing.rechargeAmount}</Label>
                <Input
                  id="recharge-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder={t.billing.rechargeAmountPlaceholder}
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRechargeDialogOpen(false)}>
                {t.billing.cancel}
              </Button>
              <Button onClick={handleRecharge} disabled={rechargeLoading}>
                {rechargeLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t.billing.processing}
                  </>
                ) : (
                  t.billing.confirmRecharge
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              {t.billing.withdrawal}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.billing.accountWithdrawal}</DialogTitle>
              <DialogDescription>
                {t.billing.withdrawalDescription}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="withdrawal-amount">{t.billing.withdrawalAmount}</Label>
                <Input
                  id="withdrawal-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder={t.billing.withdrawalAmountPlaceholder}
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdrawal-method">{t.billing.withdrawalMethod}</Label>
                <Select value={withdrawalMethod} onValueChange={setWithdrawalMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.billing.withdrawalMethodPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alipay">{t.billing.alipay}</SelectItem>
                    <SelectItem value="wechat">{t.billing.wechat}</SelectItem>
                    <SelectItem value="bank">{t.billing.bank}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdrawal-address">{t.billing.withdrawalAddress}</Label>
                <Input
                  id="withdrawal-address"
                  placeholder={t.billing.withdrawalAddressPlaceholder}
                  value={withdrawalAddress}
                  onChange={(e) => setWithdrawalAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdrawal-description">{t.billing.withdrawalDescriptionOptional}</Label>
                <Textarea
                  id="withdrawal-description"
                  placeholder={t.billing.withdrawalDescriptionPlaceholder}
                  value={withdrawalDescription}
                  onChange={(e) => setWithdrawalDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWithdrawalDialogOpen(false)}>
                {t.billing.cancel}
              </Button>
              <Button onClick={handleWithdrawal} disabled={withdrawalLoading}>
                {withdrawalLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t.billing.processing}
                  </>
                ) : (
                  t.billing.confirmWithdrawal
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 记录表格 */}
      <Tabs defaultValue="recharge" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="recharge">{t.billing.rechargeRecords}</TabsTrigger>
              <TabsTrigger value="withdrawal">{t.billing.withdrawalRecords}</TabsTrigger>
              <TabsTrigger value="consumption">{t.billing.consumptionRecords}</TabsTrigger>
            </TabsList>
        
        <TabsContent value="recharge" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t.billing.rechargeHistory}</CardTitle>
                  <CardDescription>{t.billing.rechargeHistoryDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                  {rechargeRecords.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.billing.amount}</TableHead>
                          <TableHead>{t.billing.paymentMethod}</TableHead>
                          <TableHead>{t.billing.status}</TableHead>
                          <TableHead>{t.billing.time}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rechargeRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>${record.amount.toFixed(2)}</TableCell>
                            <TableCell>{record.payment_method}</TableCell>
                            <TableCell>{getStatusBadge(record.status)}</TableCell>
                            <TableCell>{new Date(record.created_at).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <ArrowDownCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">{t.billing.noRechargeRecords}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
        
        <TabsContent value="withdrawal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.billing.withdrawalHistory}</CardTitle>
              <CardDescription>{t.billing.withdrawalHistoryDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {withdrawalRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.billing.amount}</TableHead>
                      <TableHead>{t.billing.withdrawalMethodCol}</TableHead>
                      <TableHead>{t.billing.status}</TableHead>
                      <TableHead>{t.billing.time}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawalRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>${record.amount.toFixed(2)}</TableCell>
                        <TableCell>{record.withdrawal_method}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>{new Date(record.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <ArrowUpCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">{t.billing.noWithdrawalRecords}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="consumption" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.billing.consumptionHistory}</CardTitle>
              <CardDescription>{t.billing.consumptionHistoryDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {consumptionRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.billing.amount}</TableHead>
                      <TableHead>{t.billing.productType}</TableHead>
                      <TableHead>{t.billing.description}</TableHead>
                      <TableHead>{t.billing.time}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consumptionRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>${record.amount.toFixed(2)}</TableCell>
                        <TableCell>{record.product_type}</TableCell>
                        <TableCell>{record.description}</TableCell>
                        <TableCell>{new Date(record.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">{t.billing.noConsumptionRecords}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}