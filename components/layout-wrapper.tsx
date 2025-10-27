"use client"

import type React from "react"
import { useState } from "react"

import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Header
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <Sidebar isCollapsed={isSidebarCollapsed} />
      <main className={`p-6 transition-all duration-300 ${isSidebarCollapsed ? "ml-16" : "ml-64"}`}>
        {children}
      </main>
    </div>
  )
}
