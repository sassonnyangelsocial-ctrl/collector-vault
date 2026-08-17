-- The previous Turtle link resolved to an HTML page, not product artwork.
-- This official Marine Series secret image includes the verified Secret Turtle.
update public.figures
set
  image_url = 'https://cdn.shopify.com/s/files/1/0082/3168/2103/files/secrets_marine_480x480.png?v=1573188340',
  image_source_url = 'https://sonnyangelusa.com/products/minifigure-marine-series-2019',
  image_verified_at = now(),
  verification_source = 'Official Sonny Angel USA Marine Series product page'
where slug = 'secret-turtle-secret'
  and exists (
    select 1 from public.series s
    where s.id = public.figures.series_id
      and s.slug = 'marine-series'
  );
