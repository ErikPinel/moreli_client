export function setPageMetadata(title: string, description: string, canonical: string) {
  document.title = title
  for (const [attribute, name, content] of [
    ['name', 'description', description],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:url', canonical],
  ]) {
    let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute(attribute, name)
      document.head.append(meta)
    }
    meta.content = content
  }
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.append(link)
  }
  link.href = canonical
}
