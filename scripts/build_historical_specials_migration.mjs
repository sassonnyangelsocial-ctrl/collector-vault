import { writeFile } from 'node:fs/promises'
import vm from 'node:vm'

const base = 'https://angelvaulttracker.com/app/data/'
const context = { window: {} }
vm.createContext(context)
for (const file of [
  'sonnies.js?v=20260412-t-shirt-go-for-it',
  'sonny_image_map.js?v=20260401-curated-catalog-lock',
  'manual_overrides.js?v=20260419-gingerbread-robby-refresh',
]) {
  const response = await fetch(`${base}${file}`, { headers: { 'user-agent': 'CollectorVault/1.0 catalog audit' } })
  if (!response.ok) throw new Error(`${response.status} ${file}`)
  vm.runInContext(await response.text(), context, { filename: file })
}

const aliases = {
  'Advent Calendar(2025)': ['Advent Calendar(2025)'],
  'Afternoon Tea(2023)': ['Afternoon Tea(2023)'],
  "Bug's World (2022)": ["Bug's World"],
  'Cactus Series (2020)': ['Cactus Series'],
  'Cat Life(2023)': ['Cat Life(2023)'],
  'Charm Candy Store(2023)': ['Charm Candy Store(2023)'],
  'Cherry Blossom -Night Version- (2021)': ['Cherry Blossom Series: Night Version'],
  'Cherry Blossom -Peaceful Spring Edition- (2022)': ['Cherry Blossom Series: Peaceful Spring Edition'],
  'Cherry Blossom Series': ['Cherry Blossom Series'],
  'Circus Series': ['Circus Series'],
  'Dreaming Christmas (2021)': ['Christmas Series 2021 Dreaming Christmas'],
  'Flower Gift(2023)': ['Flower Gift'],
  'Flower Series': ['Flower Series'],
  'Gifts of Love(2024)': ['Gifts of Love Series'],
  'Halloween Series(2021)': ['Halloween Series 2021', 'Halloween Series 2021 Additional Secret'],
  'Japanese Good Luck(2021)': ['Japanese Good Luck(2021)'],
  'Marine Series': ['Marine Series'],
  'Message of Love (2022)': ['Message of Love (2022)'],
  'NewYork Series': ['NewYork Series'],
  'Okinawa Series': ['Okinawa Series'],
  'Seoul Series': ['Seoul Series'],
  'Sonny Angel Christmas Ornament(2022)': ['Sonny Angel Christmas Ornament(2022)'],
  'Sonny Angel Enjoy the Moment (2022)': ['Enjoy the Moment'],
  'Sonny Angel Hello Jeju (2022)': ['Sonny Angel Hello Jeju (2022)'],
  'Sonny Angel in Space Adventure Series (2020)': ['Sonny Angel in Space Adventure Series (2020)'],
  'Sonny Angel in Wonderland Series (2020)': ['Sonny Angel in Wonderland Series (2020)'],
  'Strawberry Love Series': ['Strawberry Love Series'],
  'Sweets Series': ['Sweets Series'],
  'The Sonny Angel Town Musicians(2021)': ['The Sonny Angel Town Musicians'],
  'Valentine Series (2020)': ['Valentine Series (2020)'],
  "Valentine's Day Series (2019)": ["Valentine's Day Series 2019"],
  "Valentine's Day Series 2017": ["Valentine's Day Series 2017"],
  "Valentine's Day Series 2018": ["Valentine's Day Series 2018"],
  'Vegetable Series': ['Vegetable Series'],
}

const overrideRoot = context.window.SONNY_MANUAL_OVERRIDES || {}
const overrides = overrideRoot.items || overrideRoot
const imageMap = context.window.SONNY_IMAGE_MAP || {}
const rows = (context.window.SONNIES_DATA || []).map((item) => ({
  ...item,
  ...(imageMap[item.id] || {}),
  ...(overrides[item.id] || {}),
}))

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
const slugify = (value) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const imageUrl = (item) => {
  const path = item.artPath || item.path
  if (!path) return null
  if (/^https?:/.test(path)) return path
  return new URL(path.replace(/^\.\//, ''), 'https://angelvaulttracker.com/app/').href
}

const inserts = []
const audit = []
for (const [databaseSeries, guideSeries] of Object.entries(aliases)) {
  const specials = rows.filter((item) => guideSeries.includes(item.series) && (item.isSecret || /robby/i.test(item.name)))
  for (const item of specials) {
    const edition = /robby/i.test(item.name) ? 'robby' : 'secret'
    const image = imageUrl(item)
    if (!image) {
      audit.push({ databaseSeries, guideSeries: item.series, name: item.name, status: 'missing-image' })
      continue
    }
    const slug = `${slugify(item.name)}-${edition}`
    inserts.push(`insert into public.figures (series_id,name,slug,rarity,sort_order,active,image_url,image_source_url,image_verified_at,edition_type,verification_source,aliases)
select s.id,${quote(item.name)},${quote(slug)},'secret',950,true,${quote(image)},'https://angelvaulttracker.com/',now(),${quote(edition)},'historical_guidebook',array[]::text[]
from public.series s where s.name=${quote(databaseSeries)} and s.active=true order by s.id limit 1
on conflict (series_id,slug) do update set name=excluded.name,rarity=excluded.rarity,active=true,image_url=excluded.image_url,image_source_url=excluded.image_source_url,image_verified_at=excluded.image_verified_at,edition_type=excluded.edition_type,verification_source=excluded.verification_source;`)
    audit.push({ databaseSeries, guideSeries: item.series, name: item.name, edition, image, status: 'included' })
  }
}

const sql = `-- Generated from the published Angel Vault historical guidebook catalog.\n-- Official Sonny Angel announcement images remain preferred where already present.\nbegin;\n${inserts.join('\n')}\ncommit;\n`
const target = new URL('../supabase/migrations/20260721211500_historical_secret_robby_coverage.sql', import.meta.url)
await writeFile(target, sql)
process.stdout.write(JSON.stringify({ insertCount: inserts.length, missingImages: audit.filter((item) => item.status === 'missing-image'), includedSeries: [...new Set(audit.filter((item) => item.status === 'included').map((item) => item.databaseSeries))] }, null, 2))
