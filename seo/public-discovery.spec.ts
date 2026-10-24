import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { businessStructuredData, publicPages, site } from '../src/lib/site.ts'
import { generatedDiscoveryFiles } from './public-discovery.ts'

describe('public search and AI discovery', () => {
  const staticFilenames = ['robots.txt', 'sitemap.xml', 'sitemap-pages.xml', 'llms.txt', 'ai.txt']
  const files: Record<string, { content: string }> = {
    ...generatedDiscoveryFiles(),
    ...Object.fromEntries(staticFilenames.map(filename => [
      filename, { content: readFileSync(new URL(`../public/${filename}`, import.meta.url), 'utf8') },
    ])),
  }
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as {
    rewrites: { source: string; destination: string }[]
    headers: { source: string; headers: { key: string; value: string }[] }[]
  }

  it('provides real robots directives and an absolute sitemap index', () => {
    expect(files['robots.txt'].content.replace(/\r\n/g, '\n')).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`)
    expect(files['sitemap.xml'].content).toContain(`<loc>${site.url}/sitemap-pages.xml</loc>`)
    expect(files['sitemap.xml'].content).toContain(`<loc>${site.url}/sitemap-teachers.xml</loc>`)
  })

  it('submits only canonical public pages, not drafts, filters or account routes', () => {
    const xml = files['sitemap-pages.xml'].content
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

  it('declares explicit production text and XML content types', () => {
    for (const filename of staticFilenames) {
      const group = vercel.headers.find(group => new RegExp(`^${group.source}$`).test(`/${filename}`) && group.headers.some(header => header.key === 'Content-Type'))
      const type = filename.endsWith('.xml') ? 'application/xml' : 'text/plain'
      expect(group?.headers.find(header => header.key === 'Content-Type')?.value).toBe(`${type}; charset=utf-8`)
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
    const spa = vercel.rewrites.find(rewrite => rewrite.destination === '/index.html')!
    const pattern = new RegExp(`^${spa.source}$`)
    for (const path of ['/', '/teachers', '/teachers/name.with-dot', '/support/ticket-1', '/teacher/onboarding']) expect(pattern.test(path)).toBe(true)
    for (const path of ['/robots.txt', '/llms.txt', '/ai.txt', '/sitemap.xml', '/about.html', '/about-en.html', '/ai-catalog.json', '/missing.js', '/assets/missing.js']) expect(pattern.test(path)).toBe(false)
    expect(vercel.rewrites.find(rewrite => rewrite.source === '/sitemap-teachers.xml')?.destination).toBe('https://more-li-backend.vercel.app/api/seo/teachers.xml')
  })

  it('marks account routes, personal support threads and legal drafts noindex at HTTP level', () => {
    const patterns = vercel.headers.filter(group => group.headers.some(header => header.key === 'X-Robots-Tag' && header.value === 'noindex')).map(group => new RegExp(`^${group.source.replace(':id', '[^/]+')}$`))
    for (const path of ['/admin', '/student/requests', '/teacher/onboarding', '/login', '/signup', '/auth/callback', '/terms', '/privacy', '/match', '/support/private-id']) expect(patterns.some(pattern => pattern.test(path))).toBe(true)
    for (const page of publicPages) expect(patterns.some(pattern => pattern.test(page.path))).toBe(false)
  })

  it('keeps support usable in the static fallback if JavaScript cannot load', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    expect(html).toContain(`href="mailto:${site.email}"`)
    expect(html).toContain(`href="tel:${site.internationalPhone}"`)
    expect(html).toContain('<noscript>')
  })
})
