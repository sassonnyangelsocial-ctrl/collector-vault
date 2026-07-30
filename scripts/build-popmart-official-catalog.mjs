import fs from 'node:fs/promises'

const origin = 'https://www.popmart.com'
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
    if (!current) productMap.set(id, { id, name, url: `${origin}${match[1]}`, retail_price: Number(match[4]), collection: collection.name, image_url: imageUrl })
  }
}

const products = [...productMap.values()]

const grouped = collections.map((collection) => ({
  brand: 'POP MART', series: collection.name, slug: `popmart-${collection.id}`, source_url: collection.url,
  figures: products.filter((product) => product.collection === collection.name).map((product, index) => ({
    name: product.name, slug: `popmart-${product.id}`, image_url: product.image_url, image_source_url: product.url,
    rarity: 'Official product', edition_type: 'standard', sort_order: index + 1, retail_price: product.retail_price,
  })),
})).filter((series) => series.figures.length)

await fs.writeFile(new URL('../data/popmart-official-catalog.json', import.meta.url), JSON.stringify(grouped, null, 2) + '\n')
console.log(JSON.stringify({ official_character_areas: collections.length, searchable_products: products.length, with_official_images: products.filter((p) => p.image_url).length, series: grouped.map((s) => `${s.series}: ${s.figures.length}`) }, null, 2))
