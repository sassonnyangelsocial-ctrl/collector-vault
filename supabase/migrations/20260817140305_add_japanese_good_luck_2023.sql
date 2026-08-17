-- Japanese Good Luck Series 2023 is a refreshed release of the 2021 collection.
-- Keep both historical releases: the 2023 version adds four Lucky Darumas.

delete from public.figures f
using public.series s
where f.series_id = s.id
  and s.slug = 'snack-series'
  and f.slug = 'test'
  and f.name = 'Test';

insert into public.series (
  brand_id, name, slug, category, release_year, sort_order, active, source_url, verified_at
)
select
  s.brand_id,
  'Japanese Good Luck Series (2023)',
  'japanese-good-luck-series-2023',
  'limited',
  2023,
  78,
  true,
  'https://www.sonnyangel.com/2023/07/10/japanese-goodluck-2023/',
  now()
from public.series s
where s.slug = 'vegetable-series'
  and not exists (
    select 1 from public.series existing
    where existing.slug = 'japanese-good-luck-series-2023'
  );

with figure_data as (
  select *
  from (values
    ('Lucky Cat', 'japanese-good-luck-2023-lucky-cat', 'regular', 1, 'regular', '01__lucky-cat.png', array[]::text[]),
    ('Mount Fuji', 'japanese-good-luck-2023-mount-fuji', 'regular', 2, 'regular', '02__mount-fuji.png', array[]::text[]),
    ('Daruma', 'japanese-good-luck-2023-daruma', 'regular', 3, 'regular', '03__daruma.png', array[]::text[]),
    ('Raccoon Dog', 'japanese-good-luck-2023-raccoon-dog', 'regular', 4, 'regular', '04__raccoon-dog.png', array['Tanuki']),
    ('Guardian Dog', 'japanese-good-luck-2023-guardian-dog', 'regular', 5, 'regular', '05__guardian-dog.png', array['Komainu']),
    ('Ebisuten', 'japanese-good-luck-2023-ebisuten', 'regular', 6, 'regular', '06__ebisuten.png', array['Ebisu']),
    ('Golden Lucky Cat', 'japanese-good-luck-2023-golden-lucky-cat', 'secret', 900, 'secret', '07__golden-lucky-cat.png', array[]::text[]),
    ('Daruma Robby Angel', 'japanese-good-luck-2023-daruma-robby-angel', 'secret', 910, 'robby', '08__daruma-robby-angel.png', array['Robby Angel']),
    ('Lucky Daruma Victory', 'japanese-good-luck-2023-lucky-daruma-victory', 'lucky', 100, 'lucky', '09__lucky-daruma-victory.png', array['Lucky Daruma "Victory"']),
    ('Lucky Daruma Great Blessing', 'japanese-good-luck-2023-lucky-daruma-great-blessing', 'lucky', 101, 'lucky', '10__lucky-daruma-great-blessing.png', array['Lucky Daruma "Great blessing"']),
    ('Lucky Daruma Love', 'japanese-good-luck-2023-lucky-daruma-love', 'lucky', 102, 'lucky', '11__lucky-daruma-love.png', array['Lucky Daruma "Love"']),
    ('Lucky Daruma Good Luck', 'japanese-good-luck-2023-lucky-daruma-good-luck', 'lucky', 103, 'lucky', '12__lucky-daruma-good-luck.png', array['Lucky Daruma "Good Luck"'])
  ) as v(name, slug, rarity, sort_order, edition_type, file_name, aliases)
)
insert into public.figures (
  series_id, name, slug, rarity, sort_order, active, image_url,
  image_source_url, image_verified_at, edition_type, verification_source, aliases
)
select
  s.id,
  d.name,
  d.slug,
  d.rarity,
  d.sort_order,
  true,
  'https://angelvaulttracker.com/sonny_png_library/limited/special-collections/japanese-good-luck-2021/' || d.file_name,
  s.source_url,
  now(),
  d.edition_type,
  'Sonny Angel official Japanese Good Luck Series 2023 announcement; verified official-web product image map',
  d.aliases
from figure_data d
join public.series s on s.slug = 'japanese-good-luck-series-2023'
where not exists (
  select 1 from public.figures f
  where f.series_id = s.id and f.slug = d.slug
);
