const SOURCE = 'https://angelvaulttracker.com'
const APP = 'https://collector-vault-one.vercel.app'

const normalize = (value = '') => value.toLowerCase()
  .replace(/ver(?:sion)?\.?\s*/g, '')
  .replace(/[^a-z0-9]+/g, '')
const normalizeName = (value = '') => value.toLowerCase().match(/[a-z0-9]+/g)?.sort().join('') || ''

const fetchText = async (url) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return response.text()
}

const assignedJson = (text, prefix) => JSON.parse(text.slice(text.indexOf(prefix) + prefix.length).trim().replace(/;\s*$/, ''))

const [sonniesText, imageMapText, overrideText, home] = await Promise.all([
  fetchText(`${SOURCE}/app/data/sonnies.js?v=20260412-t-shirt-go-for-it`),
  fetchText(`${SOURCE}/app/data/sonny_image_map.js?v=20260401-curated-catalog-lock`),
  fetchText(`${SOURCE}/app/data/manual_overrides.js?v=20260419-gingerbread-robby-refresh`),
  fetchText(APP),
])

const sonnies = assignedJson(sonniesText, 'window.SONNIES_DATA =')
const imageMap = assignedJson(imageMapText, 'window.SONNY_IMAGE_MAP =')
const secretIds = new Set()
for (const match of overrideText.matchAll(/secretIds:\s*\[([^\]]*)\]/g)) {
  for (const id of match[1].matchAll(/["']([^"']+)["']/g)) secretIds.add(id[1])
}
for (const match of overrideText.matchAll(/assign\(["']([^"']+)["'],\s*\{([\s\S]*?)\}\);/g)) {
  if (/isSecret:\s*true/.test(match[2])) secretIds.add(match[1])
}

const asset = home.match(/src="(\/assets\/index-[^"]+\.js)"/)[1]
const bundle = await fetchText(`${APP}${asset}`)
const supabaseUrl = bundle.match(/https:\/\/[a-z0-9-]+\.supabase\.co/)[0]
const anonKey = [...bundle.matchAll(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g)].map((match) => match[0]).find((key) => key.length > 150)
const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
const getRows = async (table, select) => {
  const rows = []
  for (let start = 0; ; start += 1000) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}&order=id`, {
      headers: { ...headers, Range: `${start}-${start + 999}` },
    })
    if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
    const page = await response.json()
    rows.push(...page)
    if (page.length < 1000) return rows
  }
}
const [series, figures] = await Promise.all([
  getRows('series', 'id,name,active'),
  getRows('figures', 'id,series_id,name,rarity,image_url,active'),
])

const activeSeries = series.filter((row) => row.active)
const sourceBySeries = new Map()
for (const item of sonnies) {
  if (!secretIds.has(item.id) && !/robby/i.test(item.name)) continue
  const key = normalize(item.series)
  const path = imageMap[item.id]?.path
  const imageUrl = path ? new URL(path.replace(/^\.\//, '/'), `${SOURCE}/`).href : null
  const entry = { id: item.id, name: item.name, series: item.series, kind: /robby/i.test(item.name) ? 'robby' : 'secret', imageUrl }
  sourceBySeries.set(key, [...(sourceBySeries.get(key) || []), entry])
}

const report = []
for (const row of activeSeries) {
  const key = normalize(row.name)
  const expected = sourceBySeries.get(key) || []
  if (!expected.length) continue
  const actual = figures.filter((figure) => figure.active && figure.series_id === row.id)
  for (const item of expected) {
    const match = actual.find((figure) => normalizeName(figure.name) === normalizeName(item.name))
    report.push({
      series: row.name,
      sourceId: item.id,
      kind: item.kind,
      expectedName: item.name,
      found: Boolean(match),
      actualName: match?.name || null,
      actualImage: match?.image_url || null,
      expectedImage: item.imageUrl,
      obsoletePath: Boolean(match?.image_url?.includes('/app/sonny_png_library/')),
    })
  }
}

const result = {
  activeSeries: activeSeries.length,
  sourceSpecialsMatchedToActiveSeries: report.length,
  missingListings: report.filter((row) => !row.found),
  verifiableMissingListings: report.filter((row) => !row.found && row.expectedImage),
  missingListingCount: report.filter((row) => !row.found).length,
  verifiableMissingListingCount: report.filter((row) => !row.found && row.expectedImage).length,
  obsoleteImageCount: report.filter((row) => row.obsoletePath).length,
  obsoleteImages: report.filter((row) => row.obsoletePath),
  matchedSeries: [...new Set(report.map((row) => row.series))].length,
}
if (process.argv.includes('--summary')) {
  delete result.missingListings
  delete result.verifiableMissingListings
  delete result.obsoleteImages
}
console.log(JSON.stringify(result, null, 2))
