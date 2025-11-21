"use client"

import * as React from "react"
import type { Locale } from "@/lib/i18n"

type LocaleProviderProps = {
  children: React.ReactNode
  defaultLocale?: Locale
}

type LocaleProviderState = {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleProviderContext = React.createContext<LocaleProviderState | undefined>(undefined)

export function LocaleProvider({ children, defaultLocale = "zh" }: LocaleProviderProps) {
  const [locale, setLocaleState] = React.useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("vofl_locale") as Locale | null
      if (saved) return saved
      const nav = window.navigator?.language?.toLowerCase() || ""
      if (nav.startsWith("zh")) return "zh"
      return "en"
    }
    return defaultLocale
  })

  // Persist the detected locale on first load when nothing was stored yet
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem("vofl_locale") as Locale | null
    if (!saved) {
      window.localStorage.setItem("vofl_locale", locale)
      document.cookie = `vofl_locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`
    }
  }, [locale])

  const setLocale = React.useCallback((loc: Locale) => {
    setLocaleState(loc)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("vofl_locale", loc)
      document.cookie = `vofl_locale=${loc}; path=/; max-age=${60 * 60 * 24 * 365}`
    }
  }, [])

  const value = {
    locale,
    setLocale,
  }

  return <LocaleProviderContext.Provider value={value}>{children}</LocaleProviderContext.Provider>
}

export const useLocale = () => {
  const context = React.useContext(LocaleProviderContext)

  if (context === undefined) throw new Error("useLocale must be used within a LocaleProvider")

  return context
}
