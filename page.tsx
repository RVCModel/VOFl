"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { useLocale } from "@/contexts/locale-context"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { SupabaseSetupCheck } from "@/components/supabase-setup-check"


export default function LoginPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const router = useRouter()
  
  // 检查用户是否已登录，如果已登录则重定向到dashboard
  useEffect(() => {
    const checkSession = async () => {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) return
      
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('检查会话错误:', error)
        return
      }
      
      // 如果已有有效会话，则重定向到dashboard
      if (data.session) {
        router.push('/dashboard')
      }
    }
    
    checkSession()
  }, [router])
  
  // Google登录实现 - 使用Supabase OAuth登录
  const handleGoogleSignIn = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      if (supabase) {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/dashboard'
          }
        })
      } else {
        toast({
          title: t.auth.configError,
          description: t.auth.configSupabase,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Google登录异常:', error)
      toast({
        title: t.auth.loginFailed,
        description: t.auth.errorOccurred,
        variant: 'destructive'
      })
    }
  }
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()

      if (!supabase) {
        toast({
          title: t.auth.configError,
          description: t.auth.configSupabase,
          
        })
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast({
          title: t.auth.loginFailed,
          description: t.auth.invalidCredentials,
          
        })
        setIsLoading(false)
        return
      }

      toast({
        title: t.auth.loginSuccess,
        description: t.auth.welcomeBack,
      })

      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      toast({
        title: t.auth.loginFailed,
        description: t.auth.errorOccurred,
        
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 flex items-center justify-center px-4 py-24">
        <div className="w-full max-w-md space-y-4">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">{t.auth.login}</CardTitle>
              <CardDescription className="text-center">
                {t.locale === "zh" ? "输入您的邮箱和密码登录" : "Enter your email and password to login"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t.auth.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t.locale === "zh" ? "your@email.com" : "your@email.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t.auth.password}</Label>
                    <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
                      {t.auth.forgotPassword}
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (t.locale === "zh" ? "登录中..." : "Signing in...") : t.auth.loginButton}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t.auth.orContinueWith}</span>
                </div>
              </div>

              <div className="flex justify-center">
                <Button variant="outline" type="button" onClick={handleGoogleSignIn}>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>

              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="text-sm text-center text-muted-foreground">
                {t.auth.noAccount}{" "}
                <Link href="/register" className="text-foreground hover:underline font-medium">
                  {t.auth.register}
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
