import { readFile } from 'node:fs/promises'

const chunkIndex = Number(process.argv[2] ?? 0)
const chunkSize = Number(process.argv[3] ?? 5)
const data = JSON.parse(await readFile(new URL('../data/sonny-angel-official-secret-candidates.json', import.meta.url)))
const rows = data.candidates.slice(chunkIndex * chunkSize, (chunkIndex + 1) * chunkSize)
const quote = (value) => value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const slugify = (value) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const sql = rows.map((row) => {
  const slug = `${slugify(row.name)}-${row.editionType}`
  return `
    insert into public.figures
      (series_id,name,slug,rarity,sort_order,active,image_url,image_source_url,image_verified_at,edition_type)
    select s.id,${quote(row.name)},${quote(slug)},${quote(row.rarity)},900,true,${quote(row.imageUrl)},${quote(row.sourceUrl)},${quote(data.generatedAt)}::timestamptz,${quote(row.editionType)}
    from public.series s where s.name=${quote(row.seriesName)} and s.active=true order by s.id limit 1
    on conflict (series_id,slug) do update set name=excluded.name,rarity=excluded.rarity,active=true,image_url=excluded.image_url,image_source_url=excluded.image_source_url,image_verified_at=excluded.image_verified_at,edition_type=excluded.edition_type;
  `
}).join('\n')

process.stdout.write(`begin;\n${sql}\ncommit;\n`)
