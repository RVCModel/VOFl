"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useLocale } from "@/components/locale-provider"
import { translations } from "@/lib/i18n"
import { PublicOnlyRoute } from "@/components/public-only-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"

function ResetPasswordContent() {
  const { locale } = useLocale()
  const t = translations[locale]
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tokenValid, setTokenValid] = useState(true)

  useEffect(() => {
    const accessToken = searchParams.get("access_token")
    const refreshToken = searchParams.get("refresh_token")
    const expiresIn = searchParams.get("expires_in")
    
    if (!accessToken || !refreshToken) {
      setTokenValid(false)
      setError(t.resetPassword.error)
      return
    }

    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn ? parseInt(expiresIn, 10) : undefined,
      })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setTokenValid(false)
          setError(t.resetPassword.error)
        }
      })
      .catch(() => {
        setTokenValid(false)
        setError(t.resetPassword.error)
      })
  }, [searchParams, t.resetPassword.error])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError(t.resetPassword.weakPassword)
      return
    }

    if (password !== confirmPassword) {
      setError(t.resetPassword.passwordMismatch)
      return
    }

    setIsLoading(true)

    try {
      // 会话已在 useEffect 中设置，直接更新密码
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setError(t.resetPassword.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (err: any) {
      setError(t.resetPassword.error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PublicOnlyRoute>
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">{t.resetPassword.title}</CardTitle>
            <CardDescription>{t.resetPassword.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {!tokenValid ? (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button asChild className="w-full">
                  <Link href="/forgot-password">{t.forgotPassword.title}</Link>
                </Button>
              </div>
            ) : !success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="password">{t.resetPassword.passwordLabel}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t.resetPassword.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t.resetPassword.confirmPasswordLabel}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder={t.resetPassword.confirmPasswordPlaceholder}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t.resetPassword.submitting : t.resetPassword.submitButton}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>{t.resetPassword.success}</AlertDescription>
                </Alert>
                <Button asChild className="w-full">
                  <Link href="/login">{t.resetPassword.backToLogin}</Link>
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">
                {t.resetPassword.backToLogin}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </PublicOnlyRoute>
  )
}

function ResetPasswordLoading() {
  return (
    <PublicOnlyRoute>
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </PublicOnlyRoute>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
