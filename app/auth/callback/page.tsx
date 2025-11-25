"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
      const params = new URLSearchParams(hash)
      const access_token = params.get("access_token")
      const refresh_token = params.get("refresh_token")
      const expires_in = params.get("expires_in")

      if (!access_token || !refresh_token) {
        router.replace("/login?error=invalid_token")
        return
      }

      await supabase.auth.setSession({
        access_token,
        refresh_token,
        expires_in: expires_in ? parseInt(expires_in, 10) : undefined,
      })

      router.replace("/")
    }

    run()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-b-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">登录中，请稍候...</p>
      </div>
    </div>
  )
}
