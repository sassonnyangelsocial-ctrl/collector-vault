-- Add missing verified Sonny Angel catalog entries requested for the collector directory.
-- Product sources: Sonny Angel's official Vegetable, Caribbean Sea, and Hawaii announcements.

insert into public.figures (
  series_id, name, slug, rarity, sort_order, active, image_url,
  image_source_url, image_verified_at, edition_type, verification_source, aliases
)
select
  s.id,
  'Shiitake',
  'vegetable-series-shiitake-secret',
  'secret',
  900,
  true,
  'https://angelvaulttracker.com/sonny_png_library/regulars/vegetable-collections/vegetable-series/13__shiitake.png',
  'https://www.sonnyangel.com/en/products/',
  now(),
  'secret',
  'Sonny Angel official product catalog; verified official-web product image map',
  array['Mushroom', 'Secret Mushroom', 'Shiitake Mushroom']
from public.series s
where s.slug = 'vegetable-series'
  and not exists (
    select 1 from public.figures f
    where f.series_id = s.id and f.slug = 'vegetable-series-shiitake-secret'
  );

insert into public.series (
  brand_id, name, slug, category, release_year, sort_order, active, source_url, verified_at
)
select
  s.brand_id,
  v.name,
  v.slug,
  'limited',
  v.release_year,
  v.sort_order,
  true,
  v.source_url,
  now()
from public.series s
cross join (
  values
    ('Summer Series Caribbean Sea Version (2016)', 'summer-series-caribbean-sea-version-2016', 2016, 76, 'https://www.sonnyangel.com/en/2016/06/17/sonny-angel-summer-series-caribbean-sea-version-%E7%99%BA%E5%A3%B2%E6%B1%BA%E5%AE%9A%EF%BC%81/'),
    ('Beach Series Hawaii Version (2015)', 'beach-series-hawaii-version-2015', 2015, 77, 'https://www.sonnyangel.com/en/2015/06/15/%E3%83%93%E3%83%BC%E3%83%81%E3%82%B7%E3%83%AA%E3%83%BC%E3%82%BA-%E3%83%8F%E3%83%AF%E3%82%A4%E3%83%90%E3%83%BC%E3%82%B8%E3%83%A7%E3%83%B3-%E7%99%BA%E5%A3%B2%E6%B1%BA%E5%AE%9A%EF%BC%81/')
) as v(name, slug, release_year, sort_order, source_url)
where s.slug = 'vegetable-series'
  and not exists (select 1 from public.series existing where existing.slug = v.slug);

with figure_data as (
  select
    'summer-series-caribbean-sea-version-2016'::text as series_slug,
    v.name, v.slug, v.rarity, v.sort_order, v.edition_type,
    'https://angelvaulttracker.com/sonny_png_library/limited/special-collections/summer-series-caribbean-sea-version-2016/' || v.file_name as image_url,
    array[]::text[] as aliases
  from (values
    ('Blue Panama Hat', 'caribbean-blue-panama-hat', 'regular', 1, 'regular', '01__blue-panama-hat.png'),
    ('Blue Straw Hat', 'caribbean-blue-straw-hat', 'regular', 2, 'regular', '02__blue-straw-hat.png'),
    ('Orange Panama Hat', 'caribbean-orange-panama-hat', 'regular', 3, 'regular', '03__orange-panama-hat.png'),
    ('Pink Straw Hat', 'caribbean-pink-straw-hat', 'regular', 4, 'regular', '04__pink-straw-hat.png'),
    ('Yellow Straw Hat', 'caribbean-yellow-straw-hat', 'regular', 5, 'regular', '05__yellow-straw-hat.png'),
    ('Caribbean Hat', 'caribbean-hat-secret', 'secret', 900, 'secret', '06__caribbean-hat.png'),
    ('Caribbean Robby Angel', 'caribbean-robby-angel', 'secret', 910, 'robby', '07__caribbean-robby-angel.png'),
    ('Sky Blue Panama Hat', 'caribbean-sky-blue-panama-hat', 'regular', 8, 'regular', '08__sky-blue-panama-hat.png')
  ) as v(name, slug, rarity, sort_order, edition_type, file_name)

  union all

  select
    'beach-series-hawaii-version-2015'::text,
    v.name, v.slug, v.rarity, v.sort_order, v.edition_type,
    'https://www.sonnyangel.com/renewal/wp-content/uploads/2018/10/news_hawaii.png',
    v.aliases
  from (values
    ('Ala Moana', 'hawaii-ala-moana', 'regular', 1, 'regular', array[]::text[]),
    ('Hanauma Bay', 'hawaii-hanauma-bay', 'regular', 2, 'regular', array[]::text[]),
    ('Kahaluu Beach', 'hawaii-kahaluu-beach', 'regular', 3, 'regular', array[]::text[]),
    ('Kailua Beach', 'hawaii-kailua-beach', 'regular', 4, 'regular', array[]::text[]),
    ('Ko Olina Bay', 'hawaii-ko-olina-bay', 'regular', 5, 'regular', array[]::text[]),
    ('Kuhio Beach', 'hawaii-kuhio-beach', 'regular', 6, 'regular', array[]::text[]),
    ('Laniakea', 'hawaii-laniakea', 'regular', 7, 'regular', array[]::text[]),
    ('Lanikai Beach', 'hawaii-lanikai-beach', 'regular', 8, 'regular', array[]::text[]),
    ('Sunset Beach', 'hawaii-sunset-beach', 'regular', 9, 'regular', array[]::text[]),
    ('Waikiki Beach', 'hawaii-waikiki-beach', 'regular', 10, 'regular', array[]::text[]),
    ('Waimanalo Beach', 'hawaii-waimanalo-beach', 'regular', 11, 'regular', array[]::text[]),
    ('Waimea Beach', 'hawaii-waimea-beach', 'regular', 12, 'regular', array[]::text[]),
    ('Aloha', 'hawaii-aloha-secret', 'secret', 900, 'secret', array['Aloha Secret']),
    ('Robby Angel', 'hawaii-robby-angel', 'secret', 910, 'robby', array['Hawaii Robby Angel'])
  ) as v(name, slug, rarity, sort_order, edition_type, aliases)
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
  d.image_url,
  s.source_url,
  now(),
  d.edition_type,
  'Sonny Angel official series announcement; verified product artwork',
  d.aliases
from figure_data d
join public.series s on s.slug = d.series_slug
where not exists (
  select 1 from public.figures f
  where f.series_id = s.id and f.slug = d.slug
);
