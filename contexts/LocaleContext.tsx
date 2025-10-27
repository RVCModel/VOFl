"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Locale } from '@/lib/i18n'

type LocaleContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: typeof translations.en
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('zh-CN')

  useEffect(() => {
    // 从localStorage获取保存的语言设置
    const savedLocale = localStorage.getItem('locale') as Locale
    if (savedLocale && translations[savedLocale]) {
      setLocale(savedLocale)
    }
  }, [])

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale)
    localStorage.setItem('locale', newLocale)
  }

  const value = {
    locale,
    setLocale: handleSetLocale,
    t: translations[locale]
  }

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}