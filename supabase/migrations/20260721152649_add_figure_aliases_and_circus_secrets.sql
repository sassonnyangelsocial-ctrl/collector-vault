alter table public.figures
  add column if not exists aliases text[] not null default '{}';

update public.series
set name = 'Circus Series -Join the Circus Edition- (2022)',
    slug = 'limited-circus-series-join-the-circus-edition-2022',
    source_url = 'https://www.sonnyangel.com/en/2022/08/01/circus2022/',
    verified_at = now()
where slug = 'limited-circus-series-join-the-circus-editon-2022';

insert into public.figures
  (series_id, name, slug, rarity, sort_order, active, image_url, image_source_url, image_verified_at, edition_type, verification_source, aliases)
select
  s.id,
  'Merry-go-round',
  'merry-go-round',
  'secret',
  6,
  true,
  'https://www.sonnyangel.com/renewal/wp-content/uploads/2022/07/img_circus2022_09.png',
  'https://www.sonnyangel.com/en/2022/08/01/circus2022/',
  now(),
  'secret',
  'Official Sonny Angel 2022 release announcement',
  array['Carousel Lop', 'Carousel Lop Ear Rabbit', 'Carousel Lop Ear Bunny', 'Merry Go Round']::text[]
from public.series s
where s.slug = 'limited-circus-series-join-the-circus-edition-2022'
on conflict (series_id, slug) do update set
  name = excluded.name,
  rarity = excluded.rarity,
  sort_order = excluded.sort_order,
  active = excluded.active,
  image_url = excluded.image_url,
  image_source_url = excluded.image_source_url,
  image_verified_at = excluded.image_verified_at,
  edition_type = excluded.edition_type,
  verification_source = excluded.verification_source,
  aliases = excluded.aliases;

insert into public.figures
  (series_id, name, slug, rarity, sort_order, active, image_url, image_source_url, image_verified_at, edition_type, verification_source, aliases)
select
  s.id,
  'Robby Angel Clown on Stilts',
  'robby-angel-clown-on-stilts',
  'robby',
  7,
  true,
  'https://www.sonnyangel.com/renewal/wp-content/uploads/2022/07/img_circus2022_10.png',
  'https://www.sonnyangel.com/en/2022/08/01/circus2022/',
  now(),
  'secret',
  'Official Sonny Angel 2022 release announcement',
  array['Circus Robby', 'Tall Circus Robby', 'Long Legged Clown Robby Angel']::text[]
from public.series s
where s.slug = 'limited-circus-series-join-the-circus-edition-2022'
on conflict (series_id, slug) do update set
  name = excluded.name,
  rarity = excluded.rarity,
  sort_order = excluded.sort_order,
  active = excluded.active,
  image_url = excluded.image_url,
  image_source_url = excluded.image_source_url,
  image_verified_at = excluded.image_verified_at,
  edition_type = excluded.edition_type,
  verification_source = excluded.verification_source,
  aliases = excluded.aliases;
