import popmart from '../data/popmart-official-catalog.json' with { type: 'json' }
import smiski from '../data/smiski-official-catalog.json' with { type: 'json' }

const rows = [...popmart, ...smiski].flatMap((series) => series.figures.map((figure) => ({ brand: series.brand, series: series.series, ...figure })))
const missing = rows.filter((row) => !row.image_url)
const broken = []
let cursor = 0

async function check() {
  while (cursor < rows.length) {
    const row = rows[cursor++]
    if (!row.image_url) continue
    try {
      const response = await fetch(row.image_url, { headers: { Range: 'bytes=0-64', 'User-Agent': 'CollectorVaultCatalogAudit/1.0' } })
      if (!response.ok && response.status !== 206) broken.push({ ...row, status: response.status })
    } catch (error) {
      broken.push({ ...row, status: error.message })
    }
  }
}

await Promise.all(Array.from({ length: 16 }, check))
console.log(JSON.stringify({ total: rows.length, with_images: rows.length - missing.length, missing: missing.map(({ brand, series, name }) => ({ brand, series, name })), broken: broken.map(({ brand, series, name, image_url, status }) => ({ brand, series, name, image_url, status })) }, null, 2))
if (missing.length || broken.length) process.exitCode = 1
