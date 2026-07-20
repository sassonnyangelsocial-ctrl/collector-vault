import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const pages = [
  ['regular', 'https://www.sonnyangel.com/en/products/'],
  ['limited', 'https://www.sonnyangel.com/en/products/mini-figure-limited/'],
  ['hippers', 'https://www.sonnyangel.com/en/products/mini-figure-hippers/'],
  ['artist', 'https://www.sonnyangel.com/en/products/artist-collection/'],
  ['gift', 'https://www.sonnyangel.com/en/products/mini-figure-gift/'],
  ['master', 'https://www.sonnyangel.com/en/products/master-collection/'],
  ['other', 'https://www.sonnyangel.com/en/products/others/'],
]

const repairUtf8 = (value) => value
  .replaceAll('LadurÃ©e', 'Ladurée')
  .replaceAll('PÃ¢tisserie', 'Pâtisserie')
  .replaceAll('â€™', '’')
  .replaceAll('ï¼', '！')
  .replaceAll('â€“', '–')
  .replaceAll('â€”', '—')

const decode = (value = '') => repairUtf8(value)
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&#0*39;|&apos;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/&ndash;|&#8211;/g, '–')
  .replace(/&mdash;|&#8212;/g, '—')
  .replace(/&nbsp;|&#160;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeUrl = (value = '') => decode(value).replace(/^http:/, 'https:')

function extractSeries(html, category, sourceUrl) {
  const headingPattern = /<h2[^>]*class=["'][^"']*tabtitle[^"']*["'][^>]*>([\s\S]*?)<\/h2>/gi
  const headings = [...html.matchAll(headingPattern)]

  return headings.map((heading, index) => {
    const name = decode(heading[1])
    const start = heading.index + heading[0].length
    const end = headings[index + 1]?.index ?? html.length
    const block = html.slice(start, end)
    const figurePattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*data-caption-title=["']([^"']*)["'][^>]*>/gi
    const figures = [...block.matchAll(figurePattern)].map((match, sortOrder) => ({
      name: decode(match[2]) || `Figure ${sortOrder + 1}`,
      imageUrl: normalizeUrl(match[1]),
      sortOrder,
      imageSourceUrl: sourceUrl,
      imageVerifiedAt: new Date().toISOString(),
    }))

    const yearMatches = [...name.matchAll(/\b(20\d{2})\b/g)]
    const releaseYear = yearMatches.length ? Number(yearMatches.at(-1)[1]) : null

    return { name, category, releaseYear, sourceUrl, figures }
  }).filter((series) => series.name && series.figures.length)
}

const catalog = []
for (const [category, url] of pages) {
  const response = await fetch(url, { headers: { 'user-agent': 'CollectorVault/1.0 catalog verification' } })
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  const html = await response.text()
  catalog.push(...extractSeries(html, category, url))
}

const unique = new Map()
for (const series of catalog) {
  const key = `${series.category}::${series.name}`.toLowerCase()
  if (!unique.has(key)) unique.set(key, series)
}

const result = {
  generatedAt: new Date().toISOString(),
  authority: 'Sonny Angel official website',
  sourcePages: pages.map(([, url]) => url),
  series: [...unique.values()],
}
result.seriesCount = result.series.length
result.figureCount = result.series.reduce((count, series) => count + series.figures.length, 0)

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(root, 'data')
await mkdir(outputDir, { recursive: true })
await writeFile(path.join(outputDir, 'sonny-angel-official-catalog.json'), `${JSON.stringify(result, null, 2)}\n`)

console.log(JSON.stringify({ seriesCount: result.seriesCount, figureCount: result.figureCount }, null, 2))
