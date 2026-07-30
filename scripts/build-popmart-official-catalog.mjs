import fs from 'node:fs/promises'

const origin = 'https://www.popmart.com'
const normalizeAsset = (url) => {
  if (!url) return url
  const secondHttp = url.indexOf('https://', 8)
  return secondHttp > 0 ? url.slice(secondHttp) : url
}
const indexHtml = await (await fetch(`${origin}/us/collection`)).text()
const collections = []
const collectionPattern = /<a[^>]+href="(\/us\/collection\/(\d+))"[^>]*>[\s\S]{0,500}?<img[^>]+alt="([^"]+)"/gi
for (const match of indexHtml.matchAll(collectionPattern)) {
  const name = match[3].trim()
  if (!name || collections.some((item) => item.id === match[2])) continue
  collections.push({ id: match[2], name, url: `${origin}${match[1]}` })
}

const productMap = new Map()
for (const collection of collections) {
  const html = await (await fetch(collection.url)).text()
  const nextJson = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1]
  const officialProducts = nextJson ? JSON.parse(nextJson).props?.pageProps?.serverCollectionRaw?.productData || [] : []
  const officialById = new Map(officialProducts.map((product) => [String(product.id), product]))
  const pattern = /<a[^>]+href="(\/us\/products\/(\d+)\/[^"]+)"[^>]+data-sensors-exposure-property-spu_name="([^"]+)"[\s\S]*?<div class="index_itemPrice[^>]*>(?:From )?\$([\d.]+)<\/div>[\s\S]*?<\/a>/gi
  for (const match of html.matchAll(pattern)) {
    const name = match[3].replaceAll('&quot;', '"').replaceAll('&amp;', '&')
    if (!/(series|blind box|figures)/i.test(name) || /(bag|case|magnet|fragrance|card|blocks|phone|cup|blanket|light|holder)/i.test(name)) continue
    const id = match[2]
    const current = productMap.get(id)
    const official = officialById.get(id)
    const imageUrl = official?.coverImg || official?.bannerImages?.[0] || official?.skus?.[0]?.mainImage || official?.mainImage || null
    if (!current) productMap.set(id, {
      id, name, url: `${origin}${match[1]}`, retail_price: Number(match[4]), collection: collection.name,
      image_url: normalizeAsset(imageUrl), banner_images: (official?.bannerImages || []).map(normalizeAsset),
    })
  }
}

const products = [...productMap.values()]

const excludeDetail = /(scene[-_ ]?\d*|single[-_ ]?box|whole[-_ ]?sets?|packaging|size|certificate)/i
const isExplicitSecret = (url) => /(secret|hidden|chase)/i.test(decodeURIComponent(url))

function lineupFor(product) {
  const banners = [...new Set(product.banner_images)].filter(Boolean)
  const candidates = banners.filter((url) => url !== product.image_url)
  const explicit = candidates.filter((url) => !excludeDetail.test(decodeURIComponent(url)) || isExplicitSecret(url))
  const numbered = explicit.filter((url) => /(?:____|[-_])(\d{1,2})(?:[-_]|\.)/i.test(decodeURIComponent(url)) || isExplicitSecret(url))
  let lineup = numbered.length >= 3 ? numbered : explicit
  if (!lineup.length) lineup = candidates
  if (!lineup.length && product.image_url) lineup = [product.image_url]

  const hasExplicitSecret = lineup.some(isExplicitSecret)
  const isBlindBoxSeries = /(blind box|series figures|scene sets|pop bean)/i.test(product.name)
  const canInferSecret = !hasExplicitSecret && isBlindBoxSeries && lineup.length >= 2
  const secretFlags = lineup.map((imageUrl, index) => isExplicitSecret(imageUrl) || (canInferSecret && index === lineup.length - 1))
  const totalSecrets = secretFlags.filter(Boolean).length
  let secretIndex = 0
  return lineup.map((imageUrl, index) => {
    const secret = secretFlags[index]
    if (secret) secretIndex += 1
    return {
      name: secret ? `Secret Figure${totalSecrets > 1 ? ` ${secretIndex}` : ''}` : `Figure ${String(index + 1).padStart(2, '0')}`,
      slug: `popmart-${product.id}-${secret ? `secret-${secretIndex}` : `figure-${index + 1}`}`,
      image_url: imageUrl,
      image_source_url: product.url,
      rarity: secret ? 'Secret' : 'Regular',
      edition_type: secret ? 'secret' : 'standard',
      sort_order: index + 1,
      retail_price: product.retail_price,
    }
  })
}

const grouped = products.map((product) => ({
  brand: 'POP MART', series: product.name, slug: `popmart-series-${product.id}`, source_url: product.url,
  character_area: product.collection, figures: lineupFor(product),
})).filter((series) => series.figures.length)

await fs.writeFile(new URL('../data/popmart-official-catalog.json', import.meta.url), JSON.stringify(grouped, null, 2) + '\n')
console.log(JSON.stringify({
  official_character_areas: collections.length,
  searchable_series: grouped.length,
  searchable_figures: grouped.reduce((sum, series) => sum + series.figures.length, 0),
  series_with_secrets: grouped.filter((series) => series.figures.some((figure) => figure.edition_type === 'secret')).length,
  missing_images: grouped.flatMap((series) => series.figures).filter((figure) => !figure.image_url).length,
}, null, 2))
