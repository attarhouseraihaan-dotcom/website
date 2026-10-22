import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

export type SEOSettings = { site_title: string; description: string; social_image: string }
const defaultSEO: SEOSettings = {
  site_title: 'Raihaan Attar House – Undi',
  description: 'Explore the Raihaan Attar House fragrance catalogue in Undi. Browse products and enquire directly on WhatsApp.',
  social_image: '/images/raihaan-hero.png',
}
const SEOContext = createContext<SEOSettings>(defaultSEO)

export function SEOProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(defaultSEO)
  useEffect(() => {
    if (!supabase) return
    supabase.from('site_settings').select('value').eq('key', 'seo').eq('is_public', true).maybeSingle().then(({ data }) => {
      if (data?.value) setSettings({ ...defaultSEO, ...(data.value as Partial<SEOSettings>) })
    })
  }, [])
  return <SEOContext.Provider value={settings}>{children}</SEOContext.Provider>
}

export function useSEO() { return useContext(SEOContext) }
