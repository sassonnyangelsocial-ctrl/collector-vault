import vm from 'node:vm'

const base = 'https://angelvaulttracker.com/app/data/'
const sources = [
  ['sonnies.js?v=20260412-t-shirt-go-for-it', 'SONNIES_DATA'],
  ['sonny_image_map.js?v=20260401-curated-catalog-lock', 'SONNY_IMAGE_MAP'],
  ['manual_overrides.js?v=20260419-gingerbread-robby-refresh', 'SONNY_MANUAL_OVERRIDES'],
]

const context = { window: {} }
vm.createContext(context)
for (const [file] of sources) {
  const response = await fetch(`${base}${file}`, { headers: { 'user-agent': 'CollectorVault/1.0 catalog audit' } })
  if (!response.ok) throw new Error(`${response.status} ${file}`)
  vm.runInContext(await response.text(), context, { filename: file })
}

const data = context.window.SONNIES_DATA || []
const overrideRoot = context.window.SONNY_MANUAL_OVERRIDES || {}
const overrides = overrideRoot.items || overrideRoot
const imageRoot = context.window.SONNY_IMAGE_MAP || {}
const imageMap = imageRoot.items || imageRoot
const rows = data.map((item) => ({ ...item, ...(imageMap[item.id] || {}), ...(overrides[item.id] || {}) }))
const special = rows.filter((item) => item.isSecret || /robby/i.test(item.name))
const bySeries = Object.groupBy(special, (item) => item.series)
const result = Object.entries(bySeries).map(([series, items]) => ({
  series,
  secrets: items.filter((item) => item.isSecret && !/robby/i.test(item.name)).map((item) => item.name),
  robbys: items.filter((item) => /robby/i.test(item.name)).map((item) => item.name),
  items: items.map((item) => ({ id: item.id, name: item.name, isSecret: Boolean(item.isSecret), artPath: item.artPath || null })),
})).sort((a, b) => a.series.localeCompare(b.series))

process.stdout.write(JSON.stringify({ seriesCount: result.length, specialCount: special.length, series: result }, null, 2))
