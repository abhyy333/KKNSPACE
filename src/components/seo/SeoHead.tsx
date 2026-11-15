import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLocale } from '@/i18n'
import {
  SITE_URL,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  getLocalizedPath,
  buildHreflangTags,
  generateGlobalWebsiteSchema,
} from '@/config/seo'

export interface SeoHeadProps {
  title?: string
  description?: string
  canonicalPath?: string
  ogImage?: string
  ogType?: 'website' | 'article' | 'profile'
  keywords?: string[]
  noindex?: boolean
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>
}

function updateOrCreateMeta(nameOrProperty: 'name' | 'property', key: string, content: string) {
  let element = document.querySelector(`meta[${nameOrProperty}="${key}"]`) as HTMLMetaElement | null
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(nameOrProperty, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function updateOrCreateLink(rel: string, href: string, attributes?: Record<string, string>) {
  const selector = attributes?.hreflang
    ? `link[rel="${rel}"][hreflang="${attributes.hreflang}"]`
    : `link[rel="${rel}"]`
  let element = document.querySelector(selector) as HTMLLinkElement | null
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
  if (attributes) {
    for (const [attrName, attrValue] of Object.entries(attributes)) {
      element.setAttribute(attrName, attrValue)
    }
  }
}

export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  canonicalPath,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  keywords = [],
  noindex = false,
  structuredData,
}) => {
  const location = useLocation()
  const { locale } = useLocale()

  const currentPath = canonicalPath || location.pathname
  const activePath = getLocalizedPath(currentPath, locale)
  const canonicalUrl = `${SITE_URL}${activePath === '/' ? '/' : activePath.replace(/\/$/, '')}`
  const activeTitle = title ? (title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`) : `${SITE_NAME} — Desa Pringgasela Selatan`
  const activeDesc =
    description ||
    'Platform informasi dan dokumentasi kegiatan Kuliah Kerja Nyata mahasiswa Universitas Mataram di Desa Pringgasela Selatan, Lombok Timur.'

  useEffect(() => {
    // 1. Document Title
    document.title = activeTitle

    // 2. HTML Lang attribute
    document.documentElement.lang = locale
    document.documentElement.setAttribute('dir', 'ltr')

    // 3. Meta Description & Keywords
    updateOrCreateMeta('name', 'description', activeDesc)
    if (keywords.length > 0) {
      updateOrCreateMeta('name', 'keywords', keywords.join(', '))
    }

    // 4. Robots Directives
    if (noindex) {
      updateOrCreateMeta('name', 'robots', 'noindex, nofollow, noarchive')
    } else {
      updateOrCreateMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')
    }

    // 5. Canonical URL (Never output multiple canonicals)
    updateOrCreateLink('canonical', canonicalUrl)

    // 6. Open Graph
    updateOrCreateMeta('property', 'og:site_name', SITE_NAME)
    updateOrCreateMeta('property', 'og:title', activeTitle)
    updateOrCreateMeta('property', 'og:description', activeDesc)
    updateOrCreateMeta('property', 'og:url', canonicalUrl)
    updateOrCreateMeta('property', 'og:type', ogType)
    updateOrCreateMeta('property', 'og:image', ogImage)
    updateOrCreateMeta('property', 'og:locale', locale.replace('-', '_'))

    // 7. Twitter / X Cards
    updateOrCreateMeta('name', 'twitter:card', 'summary_large_image')
    updateOrCreateMeta('name', 'twitter:title', activeTitle)
    updateOrCreateMeta('name', 'twitter:description', activeDesc)
    updateOrCreateMeta('name', 'twitter:image', ogImage)

    // 8. International Hreflang alternates
    if (!noindex) {
      const hreflangs = buildHreflangTags(currentPath)
      for (const item of hreflangs) {
        updateOrCreateLink('alternate', item.href, { hreflang: item.lang })
      }
    }

    // 9. Structured Data (JSON-LD)
    const scriptId = 'kkn-structured-data'
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null
    if (!scriptTag) {
      scriptTag = document.createElement('script')
      scriptTag.id = scriptId
      scriptTag.type = 'application/ld+json'
      document.head.appendChild(scriptTag)
    }

    const schemasToInject: unknown[] = [generateGlobalWebsiteSchema()]
    if (structuredData) {
      if (Array.isArray(structuredData)) {
        schemasToInject.push(...structuredData)
      } else {
        schemasToInject.push(structuredData)
      }
    }
    scriptTag.textContent = JSON.stringify(schemasToInject)

    return () => {
      // Clean up structured data on unmount if needed
    }
  }, [activeTitle, activeDesc, canonicalUrl, ogImage, ogType, keywords, noindex, locale, currentPath, structuredData])

  return null
}
