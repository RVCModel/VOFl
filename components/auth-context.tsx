"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Session, User } from '@supabase/supabase-js'

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, captchaToken?: string) => Promise<{ error: any, data: any }>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children, initialSession = null, initialUser = null }: { children: React.ReactNode, initialSession?: Session | null, initialUser?: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [session, setSession] = useState<Session | null>(initialSession)
  const [isLoading, setIsLoading] = useState(!initialSession)

  useEffect(() => {
    // Prefer SSR-injected session if available
    const init = async () => {
      if (initialSession) {
        try {
          await supabase.auth.setSession(initialSession)
        } catch (_) {}
        setIsLoading(false)
      } else {
        setIsLoading(true)
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        }
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    }

    init()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [initialSession])

  // 登录方法
  const signIn = async (email: string, password: string, captchaToken?: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, captchaToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: { message: data.error || '登录失败' } }
      }

      // 登录成功后，使用Supabase客户端设置会话
      if (data.session) {
        await supabase.auth.setSession(data.session)
      }

      return { error: null }
    } catch (error: any) {
      return { error: { message: error.message || '登录失败，请重试' } }
    }
  }

  // 注册方法
  const signUp = async (email: string, password: string, captchaToken?: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, captchaToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { data: null, error: { message: data.error || '注册失败' } }
      }

      return { data: data.data, error: null }
    } catch (error: any) {
      return { data: null, error: { message: error.message || '注册失败，请重试' } }
    }
  }

  // 退出登录方法
  const signOut = async () => {
    try {
      // 调用退出登录API
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      // 清除本地会话
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Logout error:', error)
      // 即使API调用失败，也清除本地会话
      await supabase.auth.signOut()
    }
  }

  // 谷歌登录方法
  const signInWithGoogle = async () => {
    try {
      // 使用Supabase的OAuth登录功能
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // 设置重定向URL到登录页面，让Supabase自动处理OAuth流程
          redirectTo: `${window.location.origin}/login`
        }
      })
      
      return { error }
    } catch (error: any) {
      return { error: { message: error.message || '谷歌登录失败，请重试' } }
    }
  }

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// 自定义钩子，用于在组件中访问认证上下文
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}


