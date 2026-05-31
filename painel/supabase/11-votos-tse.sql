-- =====================================================================
-- Migração 11: Tabela de votos do TSE (Raio-X Votos)
-- Armazena votação por seção/local/zona de Limeira (e outras cidades
-- que você quiser importar via script).
-- Rodar no SQL Editor depois do INSTALAR-TUDO.sql
-- =====================================================================

create table if not exists public.votos_tse (
  id bigserial primary key,
  ano int not null,                  -- 2020, 2024, 2026...
  turno int not null default 1,      -- 1 ou 2
  cargo text not null,               -- VEREADOR, PREFEITO, DEPUTADO ESTADUAL, etc.
  uf text not null default 'SP',
  municipio_codigo text not null,    -- código TSE (Limeira = 70319)
  municipio text not null,           -- 'LIMEIRA'
  zona int not null,
  secao int not null,
  local_votacao text,                -- nome do local (escola, ginásio)
  local_endereco text,
  bairro text,                       -- enriquecido depois (TSE não tem bairro direto)

  numero_candidato text not null,    -- 11200 etc.
  nome_candidato text not null,
  nome_urna text,
  partido text,
  partido_sigla text,
  coligacao text,

  votos int not null default 0,
  criado_em timestamptz default now(),

  unique (ano, turno, cargo, municipio_codigo, zona, secao, numero_candidato)
);

create index if not exists idx_votos_ano on public.votos_tse (ano, cargo);
create index if not exists idx_votos_municipio on public.votos_tse (municipio_codigo, ano);
create index if not exists idx_votos_candidato on public.votos_tse (numero_candidato, ano);
create index if not exists idx_votos_bairro on public.votos_tse (bairro);

alter table public.votos_tse enable row level security;

drop policy if exists "auth users read votos" on public.votos_tse;
create policy "auth users read votos" on public.votos_tse
  for select using (auth.uid() is not null);

drop policy if exists "auth users full votos" on public.votos_tse;
create policy "auth users full votos" on public.votos_tse
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- View útil: total de votos por candidato/cidade
create or replace view public.v_votos_por_candidato as
select
  ano, turno, cargo, municipio, municipio_codigo,
  numero_candidato, nome_candidato, partido_sigla,
  sum(votos) as total_votos,
  count(distinct secao) as secoes
from public.votos_tse
group by ano, turno, cargo, municipio, municipio_codigo, numero_candidato, nome_candidato, partido_sigla
order by total_votos desc;

notify pgrst, 'reload schema';
