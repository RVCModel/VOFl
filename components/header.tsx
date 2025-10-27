"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Moon, Sun, Globe, User, Menu, Search, Bell, Upload, CreditCard } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { useLocale } from "@/components/locale-provider"
import { translations } from "@/lib/i18n"
import { useAuth } from "@/components/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"

interface HeaderProps {
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
}

export function Header({ isSidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const { locale, setLocale } = useLocale()
  const t = translations[locale]
  const { user, signOut, session } = useAuth()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // 使用实际的用户登录状态
  const isLoggedIn = !!user
  const userName = user?.email?.split('@')[0] || "用户"

  // 获取未读消息数量
  useEffect(() => {
    // 清除之前的定时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    if (!session) return
    
    const fetchUnreadCount = async () => {
      try {
        const token = session.access_token
        const response = await fetch('/api/messages/unread-count', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setUnreadCount(data.unreadCount || 0)
        }
      } catch (error) {
        console.error('获取未读消息数量失败:', error)
      }
    }

    // 立即获取一次未读消息数量
    fetchUnreadCount()
    
    // 每30秒刷新一次未读消息数量
    intervalRef.current = setInterval(fetchUnreadCount, 30000)
    
    // 清理函数，确保在组件卸载时清除定时器
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [session?.access_token]) // 只依赖access_token，而不是整个session对象

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4 flex-1">
          {/* 折叠按钮 */}
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onToggleSidebar}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">V</span>
            </div>
            <span className="text-xl font-semibold">VOFL</span>
          </div>

          {/* 搜索框 */}
          <form onSubmit={handleSearch} className="relative max-w-md flex-1 ml-8">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t.header.search || "搜索模型、数据集..."}
              className="h-9 pl-9 pr-4 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Globe className="h-4 w-4" />
                <span className="sr-only">Switch language</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLocale("zh")} className={locale === "zh" ? "bg-accent" : ""}>
                简体中文
                {locale === "zh" && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale("en")} className={locale === "en" ? "bg-accent" : ""}>
                English
                {locale === "en" && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Switcher */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Messages */}
          {isLoggedIn && (
            <Link href="/messages">
              <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                <Bell className="h-4 w-4" />
                <span className="sr-only">Messages</span>
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-2 w-2 rounded-full p-0 flex items-center justify-center bg-destructive">
                  </Badge>
                )}
              </Button>
            </Link>
          )}

          {/* User Section */}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">{userName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{userName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <Link href={`/profile/${user?.id}`}>
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    {t.header.profile}
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <Link href="/publish/model">
                  <DropdownMenuItem>
                    <Upload className="mr-2 h-4 w-4" />
                    {t.header.publishModel}
                  </DropdownMenuItem>
                </Link>
               <Link href="/billing">
                  <DropdownMenuItem>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t.header.cw}
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => {
                  await signOut();
                  router.push('/');
                }}>
                  {t.header.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button size="sm" className="h-9">
                {t.header.login}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
