import fs from 'node:fs/promises'

const pages = [
  ['Series 1', 'series-1'], ['Series 2', 'series-2'], ['Series 3', 'series-3'], ['Series 4', 'series-4'],
  ['Bath Series', 'bath-series'], ['Toilet Series', 'toilet-series'], ['Living Series', 'living'], ['Bed Series', 'bed-series'],
  ['Yoga Series', 'yoga-series'], ['Cheer Series', 'cheer'], ['Museum Series', 'museum'], ['Work Series', 'work-series'],
  ['Dressing Series', 'dressing'], ['Exercising Series', 'exercising'], ['Moving Series', 'moving'], ['Sunday Series', 'sunday'],
  ['HIPPERS', 'hippers'],
]

const clean = (value) => value.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, '’').replace(/\s+/g, ' ').trim()
const absolute = (url) => new URL(url, 'https://smiski.com').href
const catalog = []

for (const [seriesName, path] of pages) {
  const sourceUrl = `https://smiski.com/e/products/${path}/`
  const response = await fetch(sourceUrl)
  if (!response.ok) { console.warn(`Skipping ${sourceUrl}: ${response.status}`); continue }
  const html = await response.text()
  const figures = []
  const pattern = /<div[^>]+class="[^"]*centered-image-holder[^"]*"[^>]*>[\s\S]{0,350}?<img[^>]+src="([^"]+)"[^>]*>[\s\S]{0,500}?<h[3-5][^>]*>([\s\S]*?)<\/h[3-5]>/gi
  for (const match of html.matchAll(pattern)) {
    const name = clean(match[2])
    if (!name || /\?{2,}/.test(name)) continue
    figures.push({ name, image_url: absolute(match[1]), rarity: 'Regular', edition_type: 'standard' })
  }
  const lastFigureIndex = Math.max(...figures.map((figure) => html.lastIndexOf(figure.name)), 0)
  const lineupEnd = html.indexOf('Each series has', lastFigureIndex)
  const secretArea = html.slice(lastFigureIndex, lineupEnd > lastFigureIndex ? lineupEnd : lastFigureIndex + 2500)
  const revealedSecretSeries = new Set(['series-1', 'series-2', 'series-3', 'series-4', 'bath-series', 'toilet-series'])
  const secretImage = revealedSecretSeries.has(path) ? [...secretArea.matchAll(/(?:src|content)="([^"]*(?:secret|himitsu)[^"]*\.(?:png|jpe?g|webp))"/gi)].map((match) => absolute(match[1]))[0] : null
  figures.push({ name: `${seriesName} Secret`, image_url: secretImage || null, rarity: 'Secret', edition_type: 'secret' })
  catalog.push({ brand: 'SMISKI', series: seriesName, slug: path, source_url: sourceUrl, figures })
}

await fs.writeFile(new URL('../data/smiski-official-catalog.json', import.meta.url), JSON.stringify(catalog, null, 2) + '\n')
console.log(JSON.stringify(catalog.map(({ series, figures }) => ({ series, figures: figures.length })), null, 2))
