"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import HCaptcha from "@hcaptcha/react-hcaptcha"
import { createServiceClient } from '@/lib/supabase'
import { translations } from "@/lib/i18n"
import { useLocale } from "@/components/locale-provider"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, signInWithGoogle, user, session } = useAuth()
  const { locale } = useLocale()
  const t = translations[locale]
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<HCaptcha>(null)

  // 处理OAuth回调
  useEffect(() => {
    const handleOAuthCallback = async () => {
      // 检查URL中是否有code参数，表示这是OAuth回调
      const code = searchParams.get('code')
      
      if (code && user) {
        try {
          // 创建Supabase服务端客户端
          const supabase = createServiceClient()
          
          // 检查用户配置文件是否存在，如果不存在则创建
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (profileError && profileError.code === 'PGRST116') {
            // 用户配置文件不存在，创建新的用户配置文件
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
                email: user.email,
                created_at: new Date().toISOString(),
                avatar_url: user.user_metadata?.avatar_url || null,
                credits: 0, // 初始积分
                balance: 0 // 初始余额
              })
            
            if (insertError) {
              console.error('Error creating user profile:', insertError)
            }
          }
          
          // 重定向到首页，清除URL中的code参数
          router.push('/')
        } catch (error) {
          console.error('Error handling OAuth callback:', error)
          setError('处理谷歌登录时出错，请重试')
        }
      }
    }
    
    handleOAuthCallback()
  }, [searchParams, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!captchaToken) {
      setError(t.loginPage.error.captchaRequired)
      setIsLoading(false)
      return
    }

    try {
      // 使用Supabase内置的HCaptcha验证
      const { error } = await signIn(email, password, captchaToken)
      
      if (error) {
        setError(error.message)
        captchaRef.current?.resetCaptcha()
      } else {
        router.push("/")
      }
    } catch (err: any) {
      setError(err.message || t.loginPage.error.general)
      captchaRef.current?.resetCaptcha()
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)
    
    try {
      const { error } = await signInWithGoogle()
      
      if (error) {
        setError(error.message || t.loginPage.error.googleError)
      }
      // 注意：谷歌登录会重定向，所以不需要在这里处理路由跳转
    } catch (err: any) {
      setError(err.message || t.loginPage.error.oauthError)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t.loginPage.title}</CardTitle>
          <CardDescription>{t.loginPage.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t.loginPage.emailLabel}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t.loginPage.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t.loginPage.passwordLabel}</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  {t.loginPage.forgotPassword}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="captcha">{t.loginPage.captchaLabel}</Label>
              <HCaptcha
                sitekey="704cf0f2-6730-4362-ad08-c98a675eda14"
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken(null)}
                ref={captchaRef}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t.loginPage.loggingIn : t.loginPage.loginButton}
            </Button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t.loginPage.orUse}
                </span>
              </div>
            </div>
            
            <Button 
              variant="secondary" 
              className="w-full flex items-center justify-center gap-2"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? t.loginPage.googleLoggingIn : t.loginPage.googleLoginButton}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {t.loginPage.noAccount}{" "}
            <Link href="/register" className="text-primary hover:underline">
              {t.loginPage.registerLink}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}