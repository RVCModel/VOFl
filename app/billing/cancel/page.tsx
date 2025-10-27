'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'

export default function RechargeCancelPage() {
  const router = useRouter()

  const handleGoToBilling = () => {
    router.push('/billing')
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <CardTitle className="text-red-600">充值已取消</CardTitle>
          <CardDescription>
            您已取消了充值操作
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            如果您遇到任何问题，请稍后重试或联系客服。
          </p>
          <div className="space-y-2">
            <Button onClick={handleGoToBilling} className="w-full">
              返回充值中心
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.back()} 
              className="w-full"
            >
              返回上一页
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}