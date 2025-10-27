"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-context"

interface PublicRouteProps {
  children: React.ReactNode
  requireAuth?: boolean // 是否需要登录，默认为false
}

export function PublicRoute({ children, requireAuth = false }: PublicRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // 如果需要登录但用户未登录，则重定向到登录页面
    if (!isLoading && requireAuth && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router, requireAuth])

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">加载中...</div>
  }

  // 如果需要登录但用户未登录，不渲染任何内容（会被重定向）
  if (requireAuth && !user && !isLoading) {
    return null
  }

  // 其他情况（不需要登录，或者用户已登录），渲染子组件
  return <>{children}</>
}