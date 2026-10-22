import { useEffect } from 'react'
import { useSEO } from '../lib/SEOContext'

type Props = { title: string; description: string; path?: string }

export function PageMeta({ title, description, path = '' }: Props) {
  const seo = useSEO()
  const pageTitle = title.replace(/Raihaan Attar House(?:\s*[–-]\s*Undi)?/g, seo.site_title)
  const siteBase = (import.meta.env.VITE_SITE_URL?.trim() || window.location.origin).replace(/\/+$/, '')
  const canonical = `${siteBase}${path || '/'}`
  const socialImage = seo.social_image.startsWith('http') ? seo.social_image : `${siteBase}${seo.social_image.startsWith('/') ? '' : '/'}${seo.social_image}`
  useEffect(() => {
    document.title = pageTitle
    const meta = (selector: string, key: string, value: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector)
      if (!element) { element = document.createElement('meta'); element.setAttribute(selector.includes('property=') ? 'property' : 'name', key); document.head.append(element) }
      element.content = value
    }
    meta('meta[name="description"]', 'description', description)
    meta('meta[property="og:type"]', 'og:type', 'website')
    meta('meta[property="og:title"]', 'og:title', pageTitle)
    meta('meta[property="og:description"]', 'og:description', description)
    meta('meta[property="og:url"]', 'og:url', canonical)
    meta('meta[property="og:image"]', 'og:image', socialImage)
    meta('meta[name="twitter:card"]', 'twitter:card', 'summary_large_image')
    meta('meta[name="twitter:title"]', 'twitter:title', pageTitle)
    meta('meta[name="twitter:description"]', 'twitter:description', description)
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.append(link) }
    link.href = canonical
  }, [pageTitle, description, canonical, socialImage])
  return null
}
