"use client"

import { useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/auth-context"
import { PublicOnlyRoute } from "@/components/public-only-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import HCaptcha from "@hcaptcha/react-hcaptcha"
import { translations } from "@/lib/i18n"
import { useLocale } from "@/components/locale-provider"

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp, signInWithGoogle } = useAuth()
  const { locale } = useLocale()
  const t = translations[locale]
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<HCaptcha>(null)
  const redirectTo =
    searchParams.get("redirect") ||
    (typeof document !== "undefined" && document.referrer && document.referrer.startsWith(window.location.origin)
      ? new URL(document.referrer).pathname + new URL(document.referrer).search
      : "/")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    if (password !== confirmPassword) {
      setError(t.registerPage.error.passwordMismatch)
      setIsLoading(false)
      return
    }

    if (!captchaToken) {
      setError(t.registerPage.error.captchaRequired)
      setIsLoading(false)
      return
    }

    try {
      const { data, error, message: apiMessage } = await signUp(email, password, captchaToken)

      if (error) {
        setError(error.message)
        captchaRef.current?.resetCaptcha()
      } else {
        setMessage(apiMessage || t.registerPage.successMessage)
        setEmail("")
        setPassword("")
        setConfirmPassword("")
        setCaptchaToken(null)
        captchaRef.current?.resetCaptcha()
      }
    } catch (err: any) {
      setError(err.message || t.registerPage.error.general)
      captchaRef.current?.resetCaptcha()
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)

    try {
      const { error } = await signInWithGoogle(redirectTo)

      if (error) {
        setError(error.message || t.registerPage.error.googleError)
      }
    } catch (err: any) {
      setError(err.message || t.registerPage.error.googleError)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <PublicOnlyRoute>
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">{t.registerPage.title}</CardTitle>
            <CardDescription>{t.registerPage.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {message && (
                <Alert>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t.registerPage.emailLabel}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t.registerPage.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t.registerPage.passwordLabel}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t.registerPage.confirmPasswordLabel}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="captcha">{t.registerPage.captchaLabel}</Label>
                <HCaptcha
                  sitekey="704cf0f2-6730-4362-ad08-c98a675eda14"
                  onVerify={setCaptchaToken}
                  onExpire={() => setCaptchaToken(null)}
                  ref={captchaRef}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t.registerPage.registering : t.registerPage.registerButton}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">{t.registerPage.orUse}</span>
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {googleLoading ? t.registerPage.googleRegistering : t.registerPage.googleRegisterButton}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              {t.registerPage.hasAccount}{" "}
              <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="text-primary hover:underline">
                {t.registerPage.loginLink}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </PublicOnlyRoute>
  )
}
