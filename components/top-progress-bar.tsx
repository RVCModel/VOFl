"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function TopProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isActive, setIsActive] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // 当路由或查询参数变化时触发“加载中”效果
    setIsActive(true)
    setProgress(0)

    // 先快速到 60%，制造加载感
    const startTimeout = setTimeout(() => {
      setProgress(60)
    }, 50)

    // 模拟加载完成：再延迟一段时间拉满并隐藏
    const finishTimeout = setTimeout(() => {
      setProgress(100)
      const hideTimeout = setTimeout(() => {
        setIsActive(false)
        setProgress(0)
      }, 250)
      return () => clearTimeout(hideTimeout)
    }, 400)

    return () => {
      clearTimeout(startTimeout)
      clearTimeout(finishTimeout)
    }
  }, [pathname, searchParams])

  if (!isActive) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999]">
      <div className="h-[2px] w-full bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-primary via-emerald-400 to-purple-500 shadow-[0_0_12px_rgba(129,140,248,0.7)] transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

