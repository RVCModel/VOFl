"use client"

import { useState } from "react"
import Link from "next/link"
import { useLocale } from "@/components/locale-provider"
import { translations } from "@/lib/i18n"
import { PublicOnlyRoute } from "@/components/public-only-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ForgotPasswordPage() {
  const { locale } = useLocale()
  const t = translations[locale]
  
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // 简单的邮箱验证
    if (!email || !email.includes('@')) {
      setError(t.forgotPassword.invalidEmail)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || t.forgotPassword.error)
      } else {
        setSuccess(true)
      }
    } catch (err: any) {
      setError(t.forgotPassword.error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PublicOnlyRoute>
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">{t.forgotPassword.title}</CardTitle>
            <CardDescription>{t.forgotPassword.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">{t.forgotPassword.emailLabel}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t.forgotPassword.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t.forgotPassword.submitting : t.forgotPassword.submitButton}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>{t.forgotPassword.success}</AlertDescription>
                </Alert>
                <Button asChild className="w-full">
                  <Link href="/login">{t.forgotPassword.backToLogin}</Link>
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">
                {t.forgotPassword.backToLogin}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </PublicOnlyRoute>
  )
}