import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const pageCount = Number(process.argv[2] || 12)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(await (await import('node:fs/promises')).readFile(path.join(root, 'data/sonny-angel-official-catalog.json')))

const decode = (value = '') => value
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0*39;|&apos;/g, "'")
  .replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim()

const words = (value) => new Set(decode(value).toLowerCase().replace(/\b(19|20)\d{2}\b/g, '').match(/[a-z0-9]+/g) || [])
function similarity(a, b) {
  const aa = words(a), bb = words(b)
  if (!aa.size || !bb.size) return 0
  const common = [...aa].filter((word) => bb.has(word)).length
  return common / Math.max(aa.size, bb.size)
}

function findSeries(title) {
  const aliases = [
    [/strawberry love/i, 'Strawberry Love Series'],
    [/kiss kiss/i, 'Kiss Kiss(2025)'],
    [/gifts of love/i, 'Gifts of Love(2024)'],
    [/winter wonderland/i, 'Winter Wonderland(2023)'],
    [/dinosaur/i, 'Dinosaur(2024)'],
    [/candy x animal/i, 'Charm Candy Store(2023)'],
  ]
  const alias = aliases.find(([pattern]) => pattern.test(decode(title)))
  if (alias) return { series: catalog.series.find((series) => series.name === alias[1]), score: 1 }
  const titleWords = words(title)
  const contained = catalog.series
    .filter((series) => {
      const seriesWords = words(series.name)
      return seriesWords.size >= 2 && [...seriesWords].every((word) => titleWords.has(word))
    })
    .sort((a, b) => words(b.name).size - words(a.name).size)[0]
  if (contained) return { series: contained, score: 1 }
  return catalog.series
    .map((series) => ({ series, score: similarity(title, series.name) }))
    .sort((a, b) => b.score - a.score)[0]
}

const posts = []
for (let page = 1; page <= pageCount; page += 1) {
  const sourceUrl = `https://www.sonnyangel.com/en/category/en/page/${page}/`
  const response = await fetch(sourceUrl, { headers: { 'user-agent': 'CollectorVault/1.0 catalog verification' } })
  if (!response.ok) throw new Error(`${response.status} ${sourceUrl}`)
  const html = await response.text()
  const bodyStart = html.indexOf('<section class="inner" id="toukou">')
  const body = bodyStart >= 0 ? html.slice(bodyStart) : html
  const marker = /<h2>([\s\S]*?)<\/h2>\s*<time datetime="([^"]+)"/gi
  const matches = [...body.matchAll(marker)]
  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index
    const end = matches[index + 1]?.index ?? body.length
    posts.push({ title: decode(matches[index][1]), date: matches[index][2], sourceUrl, html: body.slice(start, end) })
  }
}

const candidates = []
for (const post of posts) {
  const nameThenImage = /<(?:p|h[3-5])[^>]*>\s*(?:<strong[^>]*>)?([^<]{1,100})(?:<\/strong>)?\s*<\/(?:p|h[3-5])>\s*<p[^>]*>\s*<img[^>]*src=["']([^"']+)["'][^>]*>/gi
  const imageThenName = /<img[^>]*src=["']([^"']+)["'][^>]*>\s*<p[^>]*>\s*<strong[^>]*>([^<]{1,100})<\/strong>/gi
  const pairs = [
    ...[...post.html.matchAll(nameThenImage)].map((match) => ({ index: match.index, name: match[1], image: match[2] })),
    ...[...post.html.matchAll(imageThenName)].map((match) => ({ index: match.index, name: match[2], image: match[1] })),
  ].sort((a, b) => a.index - b.index)
  for (const match of pairs) {
    let name = decode(match.name)
    if (!name || /lineup|figure|types?|release|series/i.test(name)) continue
    const before = decode(post.html.slice(0, match.index))
    const lastRegular = Math.max(before.lastIndexOf('Regular Figure'), before.lastIndexOf('Regular figure'))
    const lastSecret = Math.max(before.lastIndexOf('Secret Figure'), before.lastIndexOf('Secret figure'), before.lastIndexOf('Secret:'))
    const lastLucky = Math.max(before.lastIndexOf('Lucky Figure'), before.lastIndexOf('Lucky figure'))
    const isRobby = /robby/i.test(name)
    const rarity = lastLucky > Math.max(lastRegular, lastSecret) ? 'lucky' : (lastSecret > lastRegular || isRobby ? 'secret' : null)
    if (!rarity) continue
    const best = findSeries(post.title)
    const imageUrl = match.image.startsWith('http') ? match.image : `https://www.sonnyangel.com${match.image}`
    if (/^\(Left\)/i.test(name)) continue
    if (name === 'Robby Angel Eg') name = 'Robby Angel Egg'
    candidates.push({
      seriesName: best?.series?.name || null,
      seriesMatchScore: best?.score || 0,
      name: name.replace(/(.+?)\1$/, '$1').trim(),
      rarity,
      editionType: isRobby ? 'robby' : rarity,
      imageUrl,
      sourceUrl: post.sourceUrl,
      releaseTitle: post.title,
      releaseDate: post.date,
    })
  }
}

const unique = [...new Map(candidates.map((item) => [`${item.releaseTitle}|${item.name}|${item.imageUrl}`, item])).values()]
const result = { generatedAt: new Date().toISOString(), postCount: posts.length, candidateCount: unique.length, candidates: unique }
await mkdir(path.join(root, 'data'), { recursive: true })
await writeFile(path.join(root, 'data', 'sonny-angel-official-secret-candidates.json'), `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify({ postCount: posts.length, candidateCount: unique.length, highConfidence: unique.filter((x) => x.seriesMatchScore >= 0.45).length }, null, 2))
