import catalog from '../data/popmart-official-catalog.json' with { type: 'json' }

const [mode = 'series', startArg = '0', countArg = '100'] = process.argv.slice(2)
const start = Number(startArg)
const count = Number(countArg)

const series = catalog.map((item, sortOrder) => ({
  name: item.series,
  slug: item.slug,
  source_url: item.source_url,
  sort_order: sortOrder,
  character_area: item.character_area || 'POP MART',
}))

const figures = catalog.flatMap((item) => item.figures.map((figure) => ({
  series_slug: item.slug,
  name: figure.name,
  slug: figure.slug,
  rarity: figure.rarity,
  edition_type: figure.edition_type,
  sort_order: figure.sort_order,
  image_url: figure.image_url,
  image_source_url: figure.image_source_url,
})))

const rows = mode === 'figures' ? figures : mode === 'series-figures'
  ? catalog.slice(start, start + count).flatMap((item) => item.figures.map((figure) => ({
      series_slug: item.slug,
      name: figure.name,
      slug: figure.slug,
      rarity: figure.rarity,
      edition_type: figure.edition_type,
      sort_order: figure.sort_order,
      image_url: figure.image_url,
      image_source_url: figure.image_source_url,
      official_lineup: Boolean(item.official_lineup),
    })))
  : series
console.log(JSON.stringify({ total: rows.length, rows: mode === 'series-figures' ? rows : rows.slice(start, start + count) }))
