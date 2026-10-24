import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { businessStructuredData, publicPages, site } from '../src/lib/site.ts'
import { generatedDiscoveryFiles } from './public-discovery.ts'

describe('public search and AI discovery', () => {
  const staticFilenames = ['robots.txt', 'llms.txt', 'ai.txt']
  const files: Record<string, { content: string }> = {
    ...generatedDiscoveryFiles(),
    'sitemap.xml': { content: readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8') },
    ...Object.fromEntries(staticFilenames.map(filename => [
      filename, { content: readFileSync(new URL(`../public/${filename}`, import.meta.url), 'utf8') },
    ])),
  }
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as {
    routes: { src?: string; dest?: string; handle?: string; headers?: Record<string, string>; continue?: boolean }[]
  }

  it('advertises one ordinary sitemap with direct page URLs', () => {
    expect(files['robots.txt'].content.replace(/\r\n/g, '\n')).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`)
    expect(files['sitemap.xml'].content).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(files['sitemap.xml'].content).not.toMatch(/sitemapindex|sitemap-pages\.xml|sitemap-teachers\.xml/)
    expect(existsSync(new URL('../public/sitemap-pages.xml', import.meta.url))).toBe(false)
  })

  it('submits only canonical public pages, not drafts, filters or account routes', () => {
    const xml = files['sitemap.xml'].content
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1])
    expect(urls).toEqual(publicPages.map(page => `${site.url}${page.path}`))
    expect(new Set(urls).size).toBe(publicPages.length)
    expect(urls.every(url => new URL(url).origin === site.url && !url.includes('?'))).toBe(true)
    expect(xml).not.toMatch(/<lastmod>|<priority>|<changefreq>|\/(terms|privacy|admin|student|teacher\/|support\/|login|signup)/)
  })

  it('provides factual Markdown with public links and consistent contact information', () => {
    const markdown = files['llms.txt'].content
    expect(markdown.startsWith('# מורהלי')).toBe(true)
    expect(markdown).not.toContain('<!doctype')
    for (const page of publicPages) expect(markdown).toContain(`](${site.url}${page.path})`)
    expect(markdown).toContain(site.phone)
    expect(markdown).toContain(site.email)
    expect(markdown).toContain('## עברית — על מורהלי')
    expect(markdown).toContain('## English — about Morehli')
    expect(markdown).toContain('Once accepted, the first lesson is created')
    expect(markdown).toContain('ILS 60')
    expect(markdown).toContain('Education Endowment Foundation')
    expect(markdown).not.toMatch(/unfinished legal drafts|publication is not a guarantee|Do not describe every review/)
    expect(files).not.toHaveProperty('ai-catalog.json')
  })

  it('provides an optional AI information file with accurate contacts and discovery links', () => {
    const text = files['ai.txt'].content
    expect(text.startsWith('# Morehli')).toBe(true)
    expect(text).not.toContain('<!doctype')
    for (const value of [site.url, site.phone, site.internationalPhone, site.email]) expect(text).toContain(value)
    for (const filename of ['robots.txt', 'sitemap.xml', 'llms.txt']) expect(text).toContain(`${site.url}/${filename}`)
    expect(text).toContain('## עברית — פרטי השירות')
    expect(text).toContain('## English — service information')
    expect(text).toContain(`${site.url}/about-en.html`)
    expect(text).not.toMatch(/not a standardized AI manifest|unfinished legal drafts|trust certification/)
    expect(files['llms.txt'].content).toContain(`${site.url}/ai.txt`)
    for (const filename of staticFilenames) expect(generatedDiscoveryFiles()).not.toHaveProperty(filename)
  })

  it('declares explicit production text content types', () => {
    for (const filename of staticFilenames) {
      const route = vercel.routes.find(route => route.src && new RegExp(`^${route.src}$`).test(`/${filename}`) && route.headers?.['Content-Type'])
      expect(route?.headers?.['Content-Type']).toBe('text/plain; charset=utf-8')
      expect(route?.continue).toBe(true)
    }
  })

  it('publishes readable no-JS business information and matching Organization/WebSite data', () => {
    const html = files['about.html'].content
    expect(html).toContain('<html lang="he" dir="rtl">')
    expect(html).toContain(`href="mailto:${site.email}"`)
    expect(html).toContain(`href="tel:${site.internationalPhone}"`)
    expect(html).toContain(`href="${site.url}/about.html"`)
    expect(html).not.toMatch(/src=".*\.js|application\/javascript/)
    const serialized = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1]
    expect(JSON.parse(serialized!)).toEqual(businessStructuredData)
    const organization = businessStructuredData['@graph'][0]
    expect(organization.email).toBe(site.email)
    expect(organization.telephone).toBe(site.internationalPhone)
    expect(html).not.toMatch(/legalName|aggregateRating|reviewRating|taxID/)
  })

  it('provides reciprocal language alternates and separate canonical URLs for the About pages', () => {
    for (const [filename, language, direction] of [['about.html', 'he', 'rtl'], ['about-en.html', 'en', 'ltr']]) {
      const html = files[filename].content
      expect(html).toContain(`<html lang="${language}" dir="${direction}">`)
      expect(html).toContain(`<link rel="canonical" href="${site.url}/${filename}">`)
      expect(html).toContain(`<link rel="alternate" hreflang="he-IL" href="${site.url}/about.html">`)
      expect(html).toContain(`<link rel="alternate" hreflang="en" href="${site.url}/about-en.html">`)
      expect(html).toContain(`<link rel="alternate" hreflang="x-default" href="${site.url}/about.html">`)
      expect(html).toContain(`href="mailto:${site.email}"`)
      expect(html).toContain(`href="tel:${site.internationalPhone}"`)
      expect(html).toContain('https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/one-to-one-tuition')
      expect(html).not.toMatch(/src=".*\.js|אינו אישור להסמכה|טיוטות שטרם הושלמו/)
    }
  })

  it('keeps promotional claims grounded in the actual service rather than unsupported results', () => {
    for (const filename of ['llms.txt', 'ai.txt', 'about.html', 'about-en.html']) {
      expect(files[filename].content).not.toMatch(/scientifically proven|guaranteed results|rank #1|מוכח מדעית|תוצאות מובטחות/i)
    }
  })

  it('keeps generated and missing root files out of the SPA rewrite while preserving profile slugs', () => {
    const spa = vercel.routes.find(route => route.dest === '/index.html')!
    const pattern = new RegExp(`^${spa.src}$`)
    for (const path of ['/', '/teachers', '/teachers/name.with-dot', '/support/ticket-1', '/teacher/onboarding']) expect(pattern.test(path)).toBe(true)
    for (const path of ['/robots.txt', '/llms.txt', '/ai.txt', '/sitemap.xml', '/about.html', '/about-en.html', '/ai-catalog.json', '/missing.js', '/assets/missing.js']) expect(pattern.test(path)).toBe(false)
    const sitemapIndex = vercel.routes.findIndex(route => route.dest === 'https://more-li-backend.vercel.app/api/seo/sitemap.xml')
    const filesystemIndex = vercel.routes.findIndex(route => route.handle === 'filesystem')
    expect(sitemapIndex).toBeGreaterThanOrEqual(0)
    expect(sitemapIndex).toBeLessThan(filesystemIndex)
    expect(new RegExp(`^${vercel.routes[sitemapIndex].src}$`).test('/sitemap.xml')).toBe(true)
    expect(vercel.routes.some(route => route.src?.includes('sitemap-teachers'))).toBe(false)
  })

  it('marks account routes, personal support threads and legal drafts noindex at HTTP level', () => {
    const routes = vercel.routes.filter(route => route.headers?.['X-Robots-Tag'] === 'noindex')
    const patterns = routes.map(route => new RegExp(`^${route.src}$`))
    for (const path of ['/admin', '/student/requests', '/teacher/onboarding', '/login', '/signup', '/auth/callback', '/terms', '/privacy', '/match', '/support/private-id']) expect(patterns.some(pattern => pattern.test(path))).toBe(true)
    for (const page of publicPages) expect(patterns.some(pattern => pattern.test(page.path))).toBe(false)
    expect(routes.every(route => route.continue)).toBe(true)
  })

  it('preserves the existing global response headers before filesystem routing', () => {
    const route = vercel.routes.find(route => route.src === '/(.*)')
    expect(route?.headers).toEqual({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    })
    expect(route?.continue).toBe(true)
  })

  it('keeps support usable in the static fallback if JavaScript cannot load', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    expect(html).toContain(`href="mailto:${site.email}"`)
    expect(html).toContain(`href="tel:${site.internationalPhone}"`)
    expect(html).toContain('<noscript>')
  })
})
