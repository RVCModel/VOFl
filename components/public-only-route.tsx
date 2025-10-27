"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-context"

interface PublicOnlyRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export function PublicOnlyRoute({ children, redirectTo = "/" }: PublicOnlyRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      router.push(redirectTo)
    }
  }, [user, isLoading, router, redirectTo])

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">加载中...</div>
  }

  // 如果有用户且不在加载状态，不渲染任何内容（会被重定向）
  if (user && !isLoading) {
    return null
  }

  // 如果没有用户，渲染子组件
  return <>{children}</>
}