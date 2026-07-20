import { readFile } from 'node:fs/promises'

const chunkIndex = Number(process.argv[2] ?? 0)
const chunkSize = Number(process.argv[3] ?? 10)
const catalog = JSON.parse(await readFile(new URL('../data/sonny-angel-official-catalog.json', import.meta.url)))
const series = catalog.series.slice(chunkIndex * chunkSize, (chunkIndex + 1) * chunkSize)

const quote = (value) => value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const slugify = (value) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

const statements = series.map((item, seriesOffset) => {
  const seriesSlug = slugify(`${item.category}-${item.name}`)
  const seriesSort = chunkIndex * chunkSize + seriesOffset
  const figures = item.figures.map((figure) => `
    insert into public.figures
      (series_id, name, slug, rarity, sort_order, active, image_url, image_source_url, image_verified_at, edition_type)
    select s.id, ${quote(figure.name)}, ${quote(slugify(figure.name))}, 'regular', ${figure.sortOrder}, true,
      ${quote(figure.imageUrl)}, ${quote(figure.imageSourceUrl)}, ${quote(figure.imageVerifiedAt)}::timestamptz, 'regular'
    from public.series s where s.slug = ${quote(seriesSlug)}
    on conflict (series_id, slug) do update set
      name = excluded.name,
      sort_order = excluded.sort_order,
      active = true,
      image_url = excluded.image_url,
      image_source_url = excluded.image_source_url,
      image_verified_at = excluded.image_verified_at;
  `).join('\n')

  return `
    insert into public.series
      (brand_id, name, slug, category, release_year, sort_order, active, source_url, verified_at)
    select b.id, ${quote(item.name)}, ${quote(seriesSlug)}, ${quote(item.category)}, ${item.releaseYear ?? 'null'}, ${seriesSort}, true,
      ${quote(item.sourceUrl)}, ${quote(catalog.generatedAt)}::timestamptz
    from public.brands b where b.slug = 'sonny-angel'
    on conflict (brand_id, slug) do update set
      name = excluded.name,
      category = excluded.category,
      release_year = coalesce(excluded.release_year, public.series.release_year),
      sort_order = excluded.sort_order,
      active = true,
      source_url = excluded.source_url,
      verified_at = excluded.verified_at;
    ${figures}
  `
}).join('\n')

process.stdout.write(`begin;\n${statements}\ncommit;\n`)
