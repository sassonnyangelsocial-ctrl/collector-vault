import { getAdminSupabase, sendError } from './_server.js'

const DAY = 86400000
const clean = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const median = values => { const list = [...values].sort((a, b) => a - b); const middle = Math.floor(list.length / 2); return list.length % 2 ? list[middle] : (list[middle - 1] + list[middle]) / 2 }

async function ebayToken() {
  const id = process.env.EBAY_CLIENT_ID, secret = process.env.EBAY_CLIENT_SECRET
  if (!id || !secret) throw new Error('Live marketplace pricing needs eBay production API credentials.')
  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', { method: 'POST', headers: { authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope' })
  if (!response.ok) throw new Error(`eBay authorization failed (${response.status}).`)
  return (await response.json()).access_token
}

function comparableItems(payload, figure, series) {
  const figureWords = clean(figure).split(' ').filter(word => word.length > 1), seriesWords = clean(series).replace(/series$/, '').split(' ').filter(word => word.length > 2)
  const reject = /\b(lot|bundle|case|box|sealed box|full set|complete set|keychain|sticker|shirt|custom|fake|replica)\b/i
  return (payload.itemSummaries || []).filter(item => { const title = clean(item.title); return !reject.test(item.title || '') && figureWords.every(word => title.includes(word)) && seriesWords.every(word => title.includes(word)) && item.price?.currency === 'USD' }).map(item => ({ title: item.title, url: item.itemWebUrl, price: Number(item.price.value || 0) + Number(item.shippingOptions?.[0]?.shippingCost?.value || 0) })).filter(item => item.price > 0)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' })
  try {
    const figureId = String(req.query.figure_id || '')
    if (!figureId) return res.status(400).json({ error: 'figure_id is required.' })
    const db = getAdminSupabase()
    const { data: figure, error } = await db.from('figures').select('id,name,series:series_id(name)').eq('id', figureId).single()
    if (error || !figure) return res.status(404).json({ error: 'Figure not found.' })
    const { data: cached } = await db.from('figure_market_values').select('*').eq('figure_id', figureId).eq('currency', 'USD').order('as_of_date', { ascending: false }).limit(1).maybeSingle()
    if (cached && Date.now() - new Date(`${cached.as_of_date}T12:00:00Z`).getTime() < DAY) return res.status(200).json(cached)
    const token = await ebayToken(), query = `Sonny Angel ${figure.series?.name || ''} ${figure.name}`
    const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search')
    url.searchParams.set('q', query); url.searchParams.set('limit', '50'); url.searchParams.set('filter', 'buyingOptions:{FIXED_PRICE},itemLocationCountry:US')
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}`, 'x-ebay-c-marketplace-id': 'EBAY_US' } })
    if (!response.ok) throw new Error(`Marketplace search failed (${response.status}).`)
    const matches = comparableItems(await response.json(), figure.name, figure.series?.name || '')
    if (matches.length < 2) return res.status(404).json({ error: 'Not enough exact single-figure listings were found.', search_url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}` })
    const firstMedian = median(matches.map(item => item.price)), filtered = matches.filter(item => item.price >= firstMedian * .35 && item.price <= firstMedian * 2.5), prices = filtered.map(item => item.price).sort((a, b) => a - b)
    const record = { figure_id: figureId, currency: 'USD', estimated_value: median(prices).toFixed(2), low_value: prices[Math.floor((prices.length - 1) * .25)].toFixed(2), high_value: prices[Math.ceil((prices.length - 1) * .75)].toFixed(2), as_of_date: new Date().toISOString().slice(0, 10), source_urls: filtered.slice(0, 12).map(item => item.url), sample_size: filtered.length, methodology: 'Median current eBay US fixed-price asking total (item + listed shipping), exact figure and series matches; lots, bundles and price outliers excluded.', confidence: filtered.length >= 8 ? 'high' : filtered.length >= 4 ? 'medium' : 'low' }
    const { data: saved, error: saveError } = await db.from('figure_market_values').upsert(record, { onConflict: 'figure_id,currency,as_of_date' }).select().single()
    if (saveError) throw saveError
    return res.status(200).json(saved)
  } catch (error) { return sendError(res, error, /credentials/.test(error.message) ? 503 : 500) }
}
