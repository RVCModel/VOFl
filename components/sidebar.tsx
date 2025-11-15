"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Mic, Database, Settings, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocale } from "@/components/locale-provider"
import { translations } from "@/lib/i18n"
import { useAuth } from "@/components/auth-context"
import { useState, useEffect } from "react"

const navItems = [
  {
    key: "home",
    href: "/",
    icon: Home,
  },
  {
    key: "models",
    href: "/models",
    icon: Mic,
  },
  {
    key: "datasets",
    href: "/datasets",
    icon: Database,
  },
]

const adminNavItems = [
  {
    key: "admin",
    href: "/admin",
    icon: Settings,
  },
]

interface SidebarProps {
  isCollapsed: boolean
}

export function Sidebar({ isCollapsed }: SidebarProps) {
  const pathname = usePathname()
  const { locale } = useLocale()
  const { user, isLoading } = useAuth()
  const t = translations[locale]
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  // 检查用户是否为管理员
  useEffect(() => {
    if (user) {
      // 从用户对象中检查管理员角色
      setIsAdmin(user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin')
    } else {
      setIsAdmin(false)
    }
  }, [user])

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r border-border bg-sidebar transition-all duration-300 flex flex-col",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* 主导航区域 */}
      <div className="flex-1 overflow-y-auto">
        <nav className="flex flex-col gap-2 p-4">
          <div className="mb-2">
            <h2 className={cn(
              "text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-3",
              isCollapsed && "hidden"
            )}>
              {t.nav?.main || "Main"}
            </h2>
          </div>
          
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 whitespace-nowrap group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                  isCollapsed && "justify-center px-2",
                )}
                title={isCollapsed ? t.nav[item.key as keyof typeof t.nav] : undefined}
              >
                <Icon className={cn(
                  "h-5 w-5 flex-shrink-0",
                  isActive ? "text-primary-foreground" : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
                )} />
                {!isCollapsed && <span className="truncate">{t.nav[item.key as keyof typeof t.nav]}</span>}
              </Link>
            )
          })}
        </nav>

        {/* 管理员区域 */}
        {!isLoading && isAdmin && (
          <>
            <div className="mx-4 my-2 border-t border-gray-200 dark:border-gray-700"></div>
            <nav className="flex flex-col gap-2 px-4 pb-4">
              <div className="mb-2">
                <h2 className={cn(
                  "text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-3",
                  isCollapsed && "hidden"
                )}>
                  {t.nav?.admin || "Admin"}
                </h2>
              </div>
              
              {adminNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 whitespace-nowrap group",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                      isCollapsed && "justify-center px-2",
                    )}
                    title={isCollapsed ? t.nav[item.key as keyof typeof t.nav] : undefined}
                  >
                    <Icon className={cn(
                      "h-5 w-5 flex-shrink-0",
                      isActive ? "text-primary-foreground" : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
                    )} />
                    {!isCollapsed && <span className="truncate">{t.nav[item.key as keyof typeof t.nav] || "Admin"}</span>}
                  </Link>
                )
              })}
            </nav>
          </>
        )}
      </div>

      {/* 底部版权信息 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {!isCollapsed ? (
          <div className="text-xs text-sidebar-foreground/60 space-y-1">
            <p>© {currentYear} VOFL</p>
            <p>Platform v1.0.0</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent/30 flex items-center justify-center">
              <span className="text-xs text-sidebar-foreground/60 font-bold">GPT</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}


