import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'

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

const clientKey = 'nw3b089qrgw9m7b7i'
const lineupEndpoint = 'https://prod-na-horizon-api.popmart.com/shop/v4/shop/productDetail/groupSpu'
const md5 = (value) => createHash('md5').update(value).digest('hex')
const slugify = (value) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function findToys(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 7) return null
  if (Array.isArray(value.toys) && value.toys.some((toy) => toy?.name && toy?.url)) return value.toys
  for (const child of Object.values(value)) {
    const toys = findToys(child, depth + 1)
    if (toys) return toys
  }
  return null
}

async function fetchOfficialLineup(product, attempt = 1, mixSpuID = String(product.id)) {
  const timestamp = Math.floor(Date.now() / 1000)
  const params = { mixSpuID }
  const sorted = Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, String(value)]))
  const apiUrl = new URL(lineupEndpoint)
  apiUrl.searchParams.set('mixSpuID', params.mixSpuID)
  apiUrl.searchParams.set('s', md5(`${JSON.stringify(sorted)}W_ak^moHpMla${timestamp}`))
  apiUrl.searchParams.set('t', String(timestamp))
  const clientTimestamp = Number(Date.now().toString().slice(0, 10))
  try {
    const response = await fetch(apiUrl, { headers: {
      Country: 'US', Language: 'en', 'X-Client-Country': 'US', Origin: origin, Referer: product.url,
      'X-Project-ID': 'social', 'X-Device-OS-Type': 'web', ClientKey: clientKey,
      'X-Sign': `${md5(`${clientTimestamp},${clientKey}`)},${clientTimestamp}`,
      'X-Client-Namespace': 'community', tz: 'America/New_York',
      'TD-Session-Key': '', 'Td-Session-Path': '/shop/v4/shop/productDetail/groupSpu',
      'Td-Session-Query': '', 'Td-Session-Sign': '',
    } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const payload = await response.json()
    const toys = findToys(payload)
    if (!toys?.length && mixSpuID === String(product.id)) {
      const html = await (await fetch(product.url)).text()
      const nextJson = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1]
      const pageData = nextJson ? JSON.parse(nextJson) : null
      const pageToys = findToys(pageData)
      if (pageToys?.length) return pageToys
      const mainSpuID = String(pageData?.props?.pageProps?.serverSeoData?.commonInfo?.mainSpuID || '')
      if (mainSpuID && mainSpuID !== mixSpuID) return fetchOfficialLineup(product, 1, mainSpuID)
    }
    if (!toys?.length) throw new Error('No official toy lineup')
    return toys
  } catch (error) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 400))
      return fetchOfficialLineup(product, attempt + 1, mixSpuID)
    }
    console.warn(`Official lineup unavailable for ${product.id} ${product.name}: ${error.message}`)
    return null
  }
}

const lineupResults = new Map()
let nextProduct = 0
await Promise.all(Array.from({ length: 8 }, async () => {
  while (nextProduct < products.length) {
    const product = products[nextProduct++]
    lineupResults.set(product.id, await fetchOfficialLineup(product))
  }
}))

function lineupFor(product) {
  const officialToys = lineupResults.get(product.id)
  if (officialToys?.length) return officialToys.map((toy, index) => {
    const name = String(toy.name).trim()
    const secret = Number(toy.type) === 2 || /(secret|hidden|chase)/i.test(name)
    return {
      name,
      slug: `popmart-${product.id}-${String(index + 1).padStart(2, '0')}-${slugify(name) || 'figure'}`,
      image_url: normalizeAsset(toy.url),
      image_source_url: product.url,
      rarity: secret ? 'Secret' : 'Regular',
      edition_type: secret ? 'secret' : 'standard',
      sort_order: index + 1,
      retail_price: product.retail_price,
    }
  })

  return [{
    name: product.name,
    slug: `popmart-${product.id}-01-${slugify(product.name) || 'product'}`,
    image_url: product.image_url,
    image_source_url: product.url,
    rarity: 'Regular',
    edition_type: 'standard',
    sort_order: 1,
    retail_price: product.retail_price,
  }]
}

const grouped = products.map((product) => ({
  brand: 'POP MART', series: product.name, slug: `popmart-series-${product.id}`, source_url: product.url,
  character_area: product.collection, official_lineup: Boolean(lineupResults.get(product.id)?.length), figures: lineupFor(product),
})).filter((series) => series.figures.length)

await fs.writeFile(new URL('../data/popmart-official-catalog.json', import.meta.url), JSON.stringify(grouped, null, 2) + '\n')
console.log(JSON.stringify({
  official_character_areas: collections.length,
  searchable_series: grouped.length,
  searchable_figures: grouped.reduce((sum, series) => sum + series.figures.length, 0),
  series_with_secrets: grouped.filter((series) => series.figures.some((figure) => figure.edition_type === 'secret')).length,
  missing_images: grouped.flatMap((series) => series.figures).filter((figure) => !figure.image_url).length,
  official_named_figures: grouped.flatMap((series) => series.figures).filter((figure) => !/^Figure \d+|^Secret Figure(?: \d+)?$/.test(figure.name)).length,
  unresolved_generic_names: grouped.flatMap((series) => series.figures).filter((figure) => /^Figure \d+|^Secret Figure(?: \d+)?$/.test(figure.name)).length,
}, null, 2))
