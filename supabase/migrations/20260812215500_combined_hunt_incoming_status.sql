alter table public.user_figures add column if not exists incoming boolean not null default false;
insert into public.user_figures (user_id, figure_id, incoming)
select distinct user_id, figure_id, true from public.incoming_figures where status in ('ordered', 'shipped', 'out_for_delivery')
on conflict (user_id, figure_id) do update set incoming = true, updated_at = now();
