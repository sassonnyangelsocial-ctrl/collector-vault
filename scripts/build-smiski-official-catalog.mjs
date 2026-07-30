import fs from 'node:fs/promises'

const pages = [
  ['Series 1', 'series-1'], ['Series 2', 'series-2'], ['Series 3', 'series-3'], ['Series 4', 'series-4'],
  ['Bath Series', 'bath-series'], ['Toilet Series', 'toilet-series'], ['Living Series', 'living'], ['Bed Series', 'bed-series'],
  ['Yoga Series', 'yoga-series'], ['Cheer Series', 'cheer'], ['Museum Series', 'museum'], ['Work Series', 'work-series'],
  ['Dressing Series', 'dressing'], ['Exercising Series', 'exercising'], ['Moving Series', 'moving'], ['Sunday Series', 'sunday'],
  ['HIPPERS', 'hippers'], ['Birthday Series', 'birthday-series'],
]

const secretGuideUrl = 'https://blinkbox.com.au/blogs/box-of-wonders/smiski-secret-figure-guide'
const knownSecrets = {
  living: ['Sunflower (Secret)', 'https://cdn.shopify.com/s/files/1/0837/6310/2006/files/smiski_living_secret_flower.webp?v=1721037344'],
  'bed-series': ['Crescent Moon (Secret)', 'https://smiski.com/e/p2019/bed/assets/images/modal/modal7.jpg'],
  'yoga-series': ['Twin Hearts (Secret)', 'https://cdn.shopify.com/s/files/1/0837/6310/2006/files/smiski_yoga_secret-figure_twin-hearts.webp?v=1721037343'],
  cheer: ['Trophy Angel (Secret)', 'https://cdn.shopify.com/s/files/1/0837/6310/2006/files/smiski_cheer_secret-figure_trophy.webp?v=1721037343'],
  museum: ['King Tut (Secret)', 'https://cdn.shopify.com/s/files/1/0837/6310/2006/files/smiski_museum_secret-figure_king-tut.webp?v=1721037344'],
  'work-series': ['Lucky Cat (Secret)', 'https://cdn.shopify.com/s/files/1/0837/6310/2006/files/smiski_work_secret_lucky-cat.webp?v=1721037344'],
  dressing: ['Costume Bunny (Secret)', 'https://cdn.shopify.com/s/files/1/0837/6310/2006/files/smiski_dressing_secret-figure_bunny-costume.webp?v=1721037344'],
  exercising: ['Flexing (Secret)', 'https://cdn.shopify.com/s/files/1/0837/6310/2006/files/smiski_exercising-figure_flexing.webp?v=1721037343'],
  moving: ['Teddy (Secret)', 'https://cdn.shopify.com/s/files/1/0837/6310/2006/files/smiski_moving_secret-figure_teddy.webp?v=1721037344'],
  sunday: ['Dog Walk (Secret)', 'https://cdn.shopify.com/s/files/1/0837/6310/2006/files/blog_smiski-secret_sunday-series.webp?v=1740035518'],
  hippers: ['Headphones (Secret)', 'https://cdn.shopify.com/s/files/1/0837/6310/2006/files/blog_secret-smiski-hipper.jpg?v=1726031428'],
  'birthday-series': ['Candle (Secret)', 'https://cdn.shopify.com/s/files/1/0837/6310/2006/files/blog_smiski-secret_birthday-series.webp?v=1740035518'],
}

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
  const knownSecret = knownSecrets[path]
  figures.push({
    name: knownSecret?.[0] || `${seriesName} Secret`,
    image_url: knownSecret?.[1] || secretImage || null,
    image_source_url: knownSecret ? (path === 'bed-series' ? 'https://smiski.com/e/p2019/bed/' : secretGuideUrl) : sourceUrl,
    rarity: 'Secret',
    edition_type: 'secret',
  })
  catalog.push({ brand: 'SMISKI', series: seriesName, slug: path, source_url: sourceUrl, figures })
}

await fs.writeFile(new URL('../data/smiski-official-catalog.json', import.meta.url), JSON.stringify(catalog, null, 2) + '\n')
console.log(JSON.stringify(catalog.map(({ series, figures }) => ({ series, figures: figures.length })), null, 2))
