-- =====================================================================
-- Migração 12: Otimizar Raio-X Votos
-- 1. Normaliza cargo pra UPPERCASE (resolve "vereador" vs "VEREADOR")
-- 2. Cria views agregadas pra evitar baixar 50k linhas no frontend
-- 3. Função RPC pra ranking otimizado por ano+cargo
-- =====================================================================

-- 1. Uniformiza cargos (UPPERCASE)
update public.votos_tse
set cargo = upper(cargo)
where cargo != upper(cargo);

-- 2. View: anos e cargos distintos (rápido)
create or replace view public.v_raiox_filtros as
select distinct ano, cargo
from public.votos_tse
order by ano desc, cargo;

-- 3. Função: ranking de candidatos por ano+cargo (agregado server-side)
--    Aceita limit/offset pra paginação leve
create or replace function public.raiox_ranking(p_ano int, p_cargo text, p_limit int default 50, p_offset int default 0)
returns table (
  numero_candidato text,
  nome_candidato text,
  partido_sigla text,
  total_votos bigint,
  total_secoes bigint
)
language sql stable as $$
  select
    numero_candidato,
    max(nome_candidato) as nome_candidato,
    max(partido_sigla) as partido_sigla,
    sum(votos)::bigint as total_votos,
    count(distinct (zona, secao))::bigint as total_secoes
  from public.votos_tse
  where ano = p_ano and upper(cargo) = upper(p_cargo)
  group by numero_candidato
  order by total_votos desc
  limit p_limit offset p_offset
$$;

-- 3.5. Função: busca por nome/partido/numero (pra autocomplete)
create or replace function public.raiox_buscar(p_ano int, p_cargo text, p_q text)
returns table (
  numero_candidato text,
  nome_candidato text,
  partido_sigla text,
  total_votos bigint
)
language sql stable as $$
  select numero_candidato, max(nome_candidato), max(partido_sigla), sum(votos)::bigint
  from public.votos_tse
  where ano = p_ano
    and upper(cargo) = upper(p_cargo)
    and (
      upper(nome_candidato) like '%' || upper(p_q) || '%' or
      numero_candidato like p_q || '%' or
      upper(coalesce(partido_sigla, '')) like '%' || upper(p_q) || '%'
    )
  group by numero_candidato
  order by sum(votos) desc
  limit 30
$$;

-- 3.6. Resumo total (pra mostrar contadores sem buscar tudo)
create or replace function public.raiox_resumo(p_ano int, p_cargo text)
returns table (
  total_candidatos bigint,
  total_votos bigint,
  total_locais bigint,
  total_secoes bigint
)
language sql stable as $$
  select
    count(distinct numero_candidato)::bigint,
    sum(votos)::bigint,
    count(distinct local_votacao)::bigint,
    count(distinct (zona, secao))::bigint
  from public.votos_tse
  where ano = p_ano and upper(cargo) = upper(p_cargo)
$$;

-- 4. Função: votos por zona (de um ano+cargo)
create or replace function public.raiox_por_zona(p_ano int, p_cargo text)
returns table (zona int, total_votos bigint)
language sql stable as $$
  select zona, sum(votos)::bigint as total_votos
  from public.votos_tse
  where ano = p_ano and upper(cargo) = upper(p_cargo)
  group by zona
  order by total_votos desc
$$;

-- 5. Função: votos por local (de um ano+cargo)
create or replace function public.raiox_por_local(p_ano int, p_cargo text)
returns table (local_votacao text, total_votos bigint)
language sql stable as $$
  select coalesce(local_votacao, 'Sem local'), sum(votos)::bigint
  from public.votos_tse
  where ano = p_ano and upper(cargo) = upper(p_cargo)
  group by local_votacao
  order by 2 desc
$$;

-- 6. Função: votos por seção
create or replace function public.raiox_por_secao(p_ano int, p_cargo text)
returns table (zona int, secao int, total_votos bigint)
language sql stable as $$
  select zona, secao, sum(votos)::bigint
  from public.votos_tse
  where ano = p_ano and upper(cargo) = upper(p_cargo)
  group by zona, secao
  order by 3 desc
  limit 200
$$;

-- 7. Função: detalhamento de candidato específico (pra comparar)
create or replace function public.raiox_detalhe_candidato(p_ano int, p_cargo text, p_numero text)
returns table (
  zona int,
  secao int,
  local_votacao text,
  votos int
)
language sql stable as $$
  select zona, secao, local_votacao, votos
  from public.votos_tse
  where ano = p_ano
    and upper(cargo) = upper(p_cargo)
    and numero_candidato = p_numero
  order by votos desc
$$;

-- 8. Função: histórico de votos de um candidato (todos os anos/cargos)
create or replace function public.raiox_historico_candidato(p_numero text)
returns table (
  ano int,
  cargo text,
  nome_candidato text,
  total_votos bigint
)
language sql stable as $$
  select
    ano,
    cargo,
    max(nome_candidato),
    sum(votos)::bigint
  from public.votos_tse
  where numero_candidato = p_numero
  group by ano, cargo
  order by ano desc, cargo
$$;

-- 9. Índices que ajudam essas queries
create index if not exists idx_votos_tse_ano_cargo on public.votos_tse (ano, cargo);
create index if not exists idx_votos_tse_numero    on public.votos_tse (numero_candidato);

-- 10. Recarrega schema cache
notify pgrst, 'reload schema';
