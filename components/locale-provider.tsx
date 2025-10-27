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
  const [locale, setLocale] = React.useState<Locale>(defaultLocale)

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
