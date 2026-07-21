-- Retire duplicate regular-only series that split search results away from
-- their complete Secret/Robby catalog records. These rows had no user refs.
update public.series
set active = false
where slug in (
  'regular-animal-series-1', 'regular-animal-series-2',
  'regular-animal-series-3', 'regular-animal-series-4',
  'regular-flower-series', 'regular-fruit-series', 'regular-marine-series',
  'regular-snack-series', 'regular-sweets-series', 'regular-vegetable-series'
  , 'regular-animal-series-1-2018', 'regular-animal-series-2-2018'
  , 'regular-animal-series-3-2018', 'regular-animal-series-4-2018'
  , 'regular-flower-series-2019', 'regular-fruit-series-2019'
  , 'regular-marine-series-2019', 'regular-sweets-series-2018'
  , 'regular-vegetable-series-2019'
);

-- Curated special figures must remain active when the official regular-lineup
-- scraper refreshes its twelve displayed figures.
update public.figures f
set active = true
where f.edition_type in ('secret', 'lucky', 'robby')
  and exists (
    select 1 from public.series s
    where s.id = f.series_id and s.active = true
  );

update public.figures f
set name = 'Robby Angel Egg',
    slug = 'robby-angel-egg-robby',
    rarity = 'secret',
    edition_type = 'robby'
where f.name in ('Robby Angel Eg', 'Robby Angel Egg')
  and exists (
    select 1 from public.series s
    where s.id = f.series_id and s.name = 'Dinosaur(2024)'
  );

update public.figures f
set rarity = 'secret', edition_type = 'robby'
where f.name = 'Robby Angel Clown on Stilts'
  and exists (
    select 1 from public.series s
    where s.id = f.series_id
      and s.name = 'Circus Series -Join the Circus Edition- (2022)'
  );
