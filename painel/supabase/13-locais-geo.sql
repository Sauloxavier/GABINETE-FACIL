-- =====================================================================
-- Migração 13: Geocoding de locais de votação
-- Pra exibir mapa real no Raio-X (Leaflet + OpenStreetMap).
-- Coordenadas vêm do Nominatim (script scripts/geocodificar-locais/).
-- =====================================================================

create table if not exists public.locais_votacao_geo (
  id bigserial primary key,
  municipio_codigo text not null,
  nome text not null,
  endereco_busca text,             -- endereço que foi geocodificado
  lat double precision,
  lng double precision,
  precisao text,                   -- 'ok' | 'aproximado' | 'falhou'
  fonte text default 'nominatim',
  atualizado_em timestamptz default now(),
  unique (municipio_codigo, nome)
);

create index if not exists idx_locais_geo_codigo on public.locais_votacao_geo (municipio_codigo);
create index if not exists idx_locais_geo_latlng on public.locais_votacao_geo (lat, lng) where lat is not null;

alter table public.locais_votacao_geo enable row level security;

drop policy if exists "auth users full locais_geo" on public.locais_votacao_geo;
create policy "auth users full locais_geo" on public.locais_votacao_geo
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- View útil: locais únicos com votos totais agregados (juntando geo)
create or replace function public.raiox_locais_com_geo(p_ano int, p_cargo text)
returns table (
  nome text,
  endereco text,
  lat double precision,
  lng double precision,
  total_votos bigint,
  total_secoes bigint
)
language sql stable as $$
  select
    v.local_votacao,
    max(v.local_endereco),
    g.lat,
    g.lng,
    sum(v.votos)::bigint,
    count(distinct v.secao)::bigint
  from public.votos_tse v
  left join public.locais_votacao_geo g
    on g.municipio_codigo = v.municipio_codigo
    and g.nome = v.local_votacao
  where v.ano = p_ano
    and upper(v.cargo) = upper(p_cargo)
    and v.local_votacao is not null
  group by v.local_votacao, g.lat, g.lng
  order by sum(v.votos) desc
$$;

notify pgrst, 'reload schema';
