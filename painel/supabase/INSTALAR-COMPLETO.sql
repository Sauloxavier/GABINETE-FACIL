-- =====================================================================
-- 🚀  INSTALAR-COMPLETO — Painel governato (Marco Xavier) + ROOT
-- =====================================================================
-- Um único arquivo. Roda tudo de uma vez no Supabase Studio:
--   1. SQL Editor → New query
--   2. Cola TUDO
--   3. RUN (espera ~10-20s)
--
-- O que faz:
--   ✅ INSTALAR-TUDO (tabelas, RLS, storage, realtime, seeds)
--   ✅ ADICIONAR-ROOT (papel 'root', pausado, aviso, RPC e-mail)
--   ✅ CRIAR-ROOT (cria saulo.lsystem@gmail.com / governatoroot2006)
--
-- Idempotente: pode rodar quantas vezes quiser.
-- =====================================================================

-- ┌─────────────────────────────────────────────────────────────┐
-- │   PARTE 1/3 — INSTALAR-TUDO                                   │
-- └─────────────────────────────────────────────────────────────┘

-- =====================================================================
-- 📦  INSTALAR TUDO — Painel Marco Xavier
-- =====================================================================
-- Esse arquivo consolida TODAS as migrations (schema + 02 a 10).
-- É IDEMPOTENTE: pode rodar várias vezes, só aplica o que faltar.
--
-- COMO USAR:
--   1. Abre o Supabase Studio: https://iamob-supabase.fqejv1.easypanel.host
--   2. Vai em SQL Editor → New query
--   3. Cola TODO esse arquivo
--   4. Clica em RUN
--   5. Espera 5-10 segundos
--
-- O que isso faz:
--   ✅ Cria/atualiza todas as tabelas (eleitores, demandas, anexos, config,
--      solicitacoes, compromissos, perfis, proposituras, emendas, disparos,
--      diagnosticos, posts, automacoes, automacao_log, demanda_historico)
--   ✅ Cria índices, triggers, functions e policies (RLS)
--   ✅ Cria buckets de Storage (anexos, avatars)
--   ✅ Habilita Realtime nas tabelas principais
--   ✅ Insere seeds (mensagens padrão, marcadores, nichos, automações)
--   ✅ Adiciona coluna `codigo` em eleitores + auto-numeração MX-001
--   ✅ Recarrega schema cache do PostgREST (corrige bug anexos_meta)
-- =====================================================================

-- ============ EXTENSIONS ============
create extension if not exists "pgcrypto";

-- ====================================================
-- TRIGGER GENÉRICO: atualizado_em
-- ====================================================
create or replace function public.tg_atualizado_em() returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

-- ====================================================
-- TABELA: eleitores
-- ====================================================
create table if not exists public.eleitores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  telefone_res text,
  cpf text,
  sexo text,
  nascimento date,
  bairro text,
  endereco text,
  cidade text default 'Limeira',
  uf text default 'SP',
  email text,
  rede_social text,
  titulo_eleitor text,
  local_votacao text,
  envolvimento text default 'Não trabalhado',
  marcadores text[] default '{}',
  nichos text[] default '{}',
  obs text,
  ultimo_contato date,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  criado_por uuid references auth.users(id) on delete set null
);

create index if not exists idx_eleitores_nome on public.eleitores (lower(nome));
create index if not exists idx_eleitores_bairro on public.eleitores (bairro);
create index if not exists idx_eleitores_envolvimento on public.eleitores (envolvimento);
create index if not exists idx_eleitores_marcadores on public.eleitores using gin (marcadores);
create index if not exists idx_eleitores_nichos on public.eleitores using gin (nichos);
create index if not exists idx_eleitores_aniversario on public.eleitores (
  (extract(month from nascimento)),
  (extract(day from nascimento))
);

drop trigger if exists trg_eleitores_at on public.eleitores;
create trigger trg_eleitores_at before update on public.eleitores
  for each row execute procedure public.tg_atualizado_em();

-- ====================================================
-- TABELA: demandas
-- ====================================================
create table if not exists public.demandas (
  id uuid primary key default gen_random_uuid(),
  eleitor_id uuid references public.eleitores(id) on delete cascade,
  tipo text not null,
  status text not null default 'Aberta',
  orgao_responsavel text,
  origem text,
  classificacao text,
  setor text,
  descricao text not null,
  data date not null default current_date,
  prazo date,
  notas text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  criado_por uuid references auth.users(id) on delete set null
);

alter table public.demandas add column if not exists chat_id text;
alter table public.demandas add column if not exists ultima_visualizacao timestamptz;

create index if not exists idx_demandas_eleitor on public.demandas (eleitor_id);
create index if not exists idx_demandas_status on public.demandas (status);
create index if not exists idx_demandas_data on public.demandas (data desc);
create index if not exists idx_demandas_orgao on public.demandas (orgao_responsavel);

drop trigger if exists trg_demandas_at on public.demandas;
create trigger trg_demandas_at before update on public.demandas
  for each row execute procedure public.tg_atualizado_em();

-- ====================================================
-- TABELA: solicitacoes (formulário público)
-- ====================================================
create table if not exists public.solicitacoes (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null,
  nome text not null,
  telefone text,
  nascimento date,
  email text,
  rede_social text,
  bairro text,
  tipo text not null,
  descricao text not null,
  endereco text,
  consentimento boolean default false,
  status text not null default 'pendente',
  origem text default 'Site público',
  enviado_em timestamptz default now(),
  processado_em timestamptz,
  eleitor_id uuid references public.eleitores(id) on delete set null,
  demanda_id uuid references public.demandas(id) on delete set null
);

create index if not exists idx_solicitacoes_status on public.solicitacoes (status);
create index if not exists idx_solicitacoes_enviado on public.solicitacoes (enviado_em desc);
create index if not exists idx_solicitacoes_protocolo on public.solicitacoes (protocolo);

-- ====================================================
-- TABELA: compromissos
-- ====================================================
create table if not exists public.compromissos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  data date not null,
  hora time,
  local text,
  descricao text,
  cor text default '#1E5BBA',
  eleitor_id uuid references public.eleitores(id) on delete set null,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  criado_por uuid references auth.users(id) on delete set null
);

create index if not exists idx_compromissos_data on public.compromissos (data);

drop trigger if exists trg_compromissos_at on public.compromissos;
create trigger trg_compromissos_at before update on public.compromissos
  for each row execute procedure public.tg_atualizado_em();

-- ====================================================
-- TABELA: anexos
-- ====================================================
create table if not exists public.anexos (
  id uuid primary key default gen_random_uuid(),
  demanda_id uuid references public.demandas(id) on delete cascade,
  nome text not null,
  tipo text,
  tamanho bigint,
  caminho text not null,
  criado_em timestamptz default now(),
  criado_por uuid references auth.users(id) on delete set null
);

create index if not exists idx_anexos_demanda on public.anexos (demanda_id);

-- ====================================================
-- TABELA: config (key-value JSONB)
-- ====================================================
create table if not exists public.config (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz default now()
);

drop trigger if exists trg_config_at on public.config;
create trigger trg_config_at before update on public.config
  for each row execute procedure public.tg_atualizado_em();

-- ====================================================
-- TABELA: perfis (users + papel admin/assessor)
-- ====================================================
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel text not null default 'assessor',
  ativo boolean default true,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

alter table public.perfis add column if not exists avatar_url text;

create or replace function public.is_admin() returns boolean
language sql security definer stable
as $$
  select coalesce((select papel = 'admin' and ativo from public.perfis where id = auth.uid()), false);
$$;

create or replace function public.tg_handle_new_user() returns trigger
language plpgsql security definer
as $$
begin
  insert into public.perfis (id, nome, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'papel', 'assessor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_handle_new_user();

drop trigger if exists trg_perfis_at on public.perfis;
create trigger trg_perfis_at before update on public.perfis
  for each row execute procedure public.tg_atualizado_em();

-- Cria perfis pra usuários que já existem
insert into public.perfis (id, nome, papel)
  select id, coalesce(raw_user_meta_data->>'nome', split_part(email, '@', 1)), 'assessor'
  from auth.users
  on conflict (id) do nothing;

-- ====================================================
-- TABELA: proposituras (processos legislativos)
-- ====================================================
create table if not exists public.proposituras (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  numero text,
  ano int not null default extract(year from now()),
  titulo text not null,
  descricao text,
  status text not null default 'Em elaboração',
  data_protocolo date,
  data_aprovacao date,
  coautores text,
  link_pdf text,
  observacoes text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  criado_por uuid references auth.users(id) on delete set null
);

create index if not exists idx_proposituras_tipo on public.proposituras (tipo);
create index if not exists idx_proposituras_status on public.proposituras (status);
create index if not exists idx_proposituras_data on public.proposituras (data_protocolo desc);

drop trigger if exists trg_proposituras_at on public.proposituras;
create trigger trg_proposituras_at before update on public.proposituras
  for each row execute procedure public.tg_atualizado_em();

-- ====================================================
-- TABELA: emendas
-- ====================================================
create table if not exists public.emendas (
  id uuid primary key default gen_random_uuid(),
  numero text,
  ano int not null default extract(year from now()),
  tipo text not null default 'Emenda Impositiva',
  titulo text not null,
  descricao text,
  area text,
  valor numeric(15,2) default 0,
  beneficiario text,
  status text not null default 'Em elaboração',
  data_protocolo date,
  propositura_id uuid references public.proposituras(id) on delete set null,
  observacoes text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  criado_por uuid references auth.users(id) on delete set null
);

create index if not exists idx_emendas_status on public.emendas (status);
create index if not exists idx_emendas_propositura on public.emendas (propositura_id);

drop trigger if exists trg_emendas_at on public.emendas;
create trigger trg_emendas_at before update on public.emendas
  for each row execute procedure public.tg_atualizado_em();

-- ====================================================
-- TABELA: demanda_historico + trigger
-- ====================================================
create table if not exists public.demanda_historico (
  id uuid primary key default gen_random_uuid(),
  demanda_id uuid not null references public.demandas(id) on delete cascade,
  acao text not null,
  campo text,
  valor_antigo text,
  valor_novo text,
  feito_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz default now()
);

create index if not exists idx_historico_demanda on public.demanda_historico (demanda_id, criado_em desc);

create or replace function public.tg_demanda_historico() returns trigger
language plpgsql security definer as $$
declare
  v_uid uuid := coalesce(auth.uid(), null);
begin
  if tg_op = 'INSERT' then
    insert into public.demanda_historico (demanda_id, acao, valor_novo, feito_por)
    values (new.id, 'criada', new.descricao, v_uid);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status is distinct from new.status then
      insert into public.demanda_historico (demanda_id, acao, campo, valor_antigo, valor_novo, feito_por)
      values (new.id, 'status', 'status', old.status, new.status, v_uid);
    end if;
    if old.descricao is distinct from new.descricao then
      insert into public.demanda_historico (demanda_id, acao, campo, valor_antigo, valor_novo, feito_por)
      values (new.id, 'atualizada', 'descricao', left(coalesce(old.descricao,''), 200), left(coalesce(new.descricao,''), 200), v_uid);
    end if;
    if old.notas is distinct from new.notas then
      insert into public.demanda_historico (demanda_id, acao, campo, valor_antigo, valor_novo, feito_por)
      values (new.id, 'nota', 'notas', left(coalesce(old.notas,''), 200), left(coalesce(new.notas,''), 200), v_uid);
    end if;
    if old.orgao_responsavel is distinct from new.orgao_responsavel then
      insert into public.demanda_historico (demanda_id, acao, campo, valor_antigo, valor_novo, feito_por)
      values (new.id, 'atualizada', 'orgao_responsavel', old.orgao_responsavel, new.orgao_responsavel, v_uid);
    end if;
    if old.prazo is distinct from new.prazo then
      insert into public.demanda_historico (demanda_id, acao, campo, valor_antigo, valor_novo, feito_por)
      values (new.id, 'atualizada', 'prazo', old.prazo::text, new.prazo::text, v_uid);
    end if;
    return new;
  end if;

  return null;
end $$;

drop trigger if exists trg_demandas_hist on public.demandas;
create trigger trg_demandas_hist
  after insert or update on public.demandas
  for each row execute function public.tg_demanda_historico();

create or replace function public.registrar_visualizacao(p_demanda_id uuid) returns void
language plpgsql security definer as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  update public.demandas set ultima_visualizacao = now() where id = p_demanda_id;
  insert into public.demanda_historico (demanda_id, acao, feito_por)
  values (p_demanda_id, 'visualizada', v_uid);
end $$;

-- ====================================================
-- TABELAS: disparos, diagnosticos, posts
-- ====================================================
create table if not exists public.disparos (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  criado_por text,
  template_id text,
  conteudo text not null,
  filtros jsonb not null default '{}'::jsonb,
  intervalo_min int not null default 8,
  intervalo_max int not null default 20,
  total_alvos int not null default 0,
  total_enviados int not null default 0,
  total_falhas int not null default 0,
  status text not null default 'concluido',
  finalizado_em timestamptz,
  log jsonb not null default '[]'::jsonb
);

create index if not exists idx_disparos_criado on public.disparos (criado_em desc);
create index if not exists idx_disparos_status on public.disparos (status);

create table if not exists public.diagnosticos (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  criado_por text,
  periodo text,
  conteudo text not null,
  metricas jsonb not null default '{}'::jsonb
);

create index if not exists idx_diagnosticos_criado on public.diagnosticos (criado_em desc);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  criado_por text,
  tema text not null,
  formato text not null default 'feed',
  legenda text,
  hashtags text,
  slides jsonb not null default '[]'::jsonb,
  status text not null default 'rascunho',
  agendado_para timestamptz
);

create index if not exists idx_posts_criado on public.posts (criado_em desc);
create index if not exists idx_posts_status on public.posts (status);

-- ====================================================
-- TABELAS: automacoes + automacao_log
-- ====================================================
create table if not exists public.automacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  tipo text not null,
  ativo boolean not null default true,
  gatilho jsonb not null default '{}'::jsonb,
  acao jsonb not null default '{}'::jsonb,
  ultima_execucao timestamptz,
  total_execucoes int not null default 0,
  total_falhas int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null
);

create index if not exists idx_automacoes_tipo on public.automacoes (tipo);
create index if not exists idx_automacoes_ativo on public.automacoes (ativo);

drop trigger if exists trg_automacoes_at on public.automacoes;
create trigger trg_automacoes_at before update on public.automacoes
  for each row execute procedure public.tg_atualizado_em();

create table if not exists public.automacao_log (
  id uuid primary key default gen_random_uuid(),
  automacao_id uuid references public.automacoes(id) on delete cascade,
  eleitor_id uuid references public.eleitores(id) on delete set null,
  demanda_id uuid references public.demandas(id) on delete set null,
  status text not null default 'sucesso',
  detalhe text,
  executado_em timestamptz not null default now()
);

create index if not exists idx_autlog_aut on public.automacao_log (automacao_id, executado_em desc);
create index if not exists idx_autlog_eleitor on public.automacao_log (eleitor_id);

-- ====================================================
-- CÓDIGO DO ELEITOR (MX-001)
-- ====================================================
alter table public.eleitores add column if not exists codigo text unique;

create sequence if not exists public.eleitor_codigo_seq start with 1;

create or replace function public.gerar_codigo_eleitor()
returns trigger as $$
declare
  proximo int;
begin
  if NEW.codigo is null or NEW.codigo = '' then
    proximo := nextval('public.eleitor_codigo_seq');
    NEW.codigo := 'MX-' || lpad(proximo::text, 3, '0');
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_eleitor_codigo on public.eleitores;
create trigger trg_eleitor_codigo
  before insert on public.eleitores
  for each row execute procedure public.gerar_codigo_eleitor();

-- Preenche códigos retroativos pros eleitores antigos
do $$
declare
  r record;
  proximo int;
begin
  for r in
    select id from public.eleitores
    where codigo is null or codigo = ''
    order by criado_em asc
  loop
    proximo := nextval('public.eleitor_codigo_seq');
    update public.eleitores
    set codigo = 'MX-' || lpad(proximo::text, 3, '0')
    where id = r.id;
  end loop;
end $$;

create index if not exists idx_eleitores_codigo on public.eleitores (codigo);

-- ====================================================
-- TABELA: votos_tse (Raio-X Votos)
-- ====================================================
create table if not exists public.votos_tse (
  id bigserial primary key,
  ano int not null,
  turno int not null default 1,
  cargo text not null,
  uf text not null default 'SP',
  municipio_codigo text not null,
  municipio text not null,
  zona int not null,
  secao int not null,
  local_votacao text,
  local_endereco text,
  bairro text,
  numero_candidato text not null,
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

create or replace view public.v_votos_por_candidato as
select
  ano, turno, cargo, municipio, municipio_codigo,
  numero_candidato, nome_candidato, partido_sigla,
  sum(votos) as total_votos,
  count(distinct secao) as secoes
from public.votos_tse
group by ano, turno, cargo, municipio, municipio_codigo, numero_candidato, nome_candidato, partido_sigla
order by total_votos desc;

-- ====================================================
-- RLS — Row Level Security
-- ====================================================
alter table public.eleitores         enable row level security;
alter table public.demandas          enable row level security;
alter table public.anexos            enable row level security;
alter table public.config            enable row level security;
alter table public.solicitacoes      enable row level security;
alter table public.compromissos      enable row level security;
alter table public.perfis            enable row level security;
alter table public.proposituras      enable row level security;
alter table public.emendas           enable row level security;
alter table public.demanda_historico enable row level security;
alter table public.disparos          enable row level security;
alter table public.diagnosticos      enable row level security;
alter table public.posts             enable row level security;
alter table public.automacoes        enable row level security;
alter table public.automacao_log     enable row level security;
alter table public.votos_tse         enable row level security;

-- Eleitores
drop policy if exists "auth users full eleitores" on public.eleitores;
create policy "auth users full eleitores" on public.eleitores
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Demandas
drop policy if exists "auth users full demandas" on public.demandas;
create policy "auth users full demandas" on public.demandas
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Anexos
drop policy if exists "auth users full anexos" on public.anexos;
create policy "auth users full anexos" on public.anexos
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Config
drop policy if exists "auth users full config" on public.config;
create policy "auth users full config" on public.config
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Compromissos
drop policy if exists "auth users full compromissos" on public.compromissos;
create policy "auth users full compromissos" on public.compromissos
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Solicitações (público pra insert via form, auth pro resto)
drop policy if exists "anyone can insert solicitacoes" on public.solicitacoes;
create policy "anyone can insert solicitacoes" on public.solicitacoes
  for insert with check (true);

drop policy if exists "auth users read solicitacoes" on public.solicitacoes;
create policy "auth users read solicitacoes" on public.solicitacoes
  for select using (auth.uid() is not null);

drop policy if exists "auth users update solicitacoes" on public.solicitacoes;
create policy "auth users update solicitacoes" on public.solicitacoes
  for update using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "auth users delete solicitacoes" on public.solicitacoes;
create policy "auth users delete solicitacoes" on public.solicitacoes
  for delete using (auth.uid() is not null);

-- Perfis
drop policy if exists "auth users read perfis" on public.perfis;
create policy "auth users read perfis" on public.perfis
  for select using (auth.uid() is not null);

drop policy if exists "self update nome" on public.perfis;
create policy "self update nome" on public.perfis
  for update using (id = auth.uid())
  with check (id = auth.uid() and papel = (select papel from public.perfis where id = auth.uid()));

drop policy if exists "admin manage perfis" on public.perfis;
create policy "admin manage perfis" on public.perfis
  for all using (public.is_admin()) with check (public.is_admin());

-- Proposituras
drop policy if exists "auth users full proposituras" on public.proposituras;
create policy "auth users full proposituras" on public.proposituras
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Emendas
drop policy if exists "auth users full emendas" on public.emendas;
create policy "auth users full emendas" on public.emendas
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Histórico
drop policy if exists "auth users read historico" on public.demanda_historico;
create policy "auth users read historico" on public.demanda_historico
  for select using (auth.uid() is not null);
drop policy if exists "auth users insert historico" on public.demanda_historico;
create policy "auth users insert historico" on public.demanda_historico
  for insert with check (auth.uid() is not null);

-- Disparos, diagnosticos, posts
drop policy if exists "auth users full disparos" on public.disparos;
create policy "auth users full disparos" on public.disparos
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "auth users full diagnosticos" on public.diagnosticos;
create policy "auth users full diagnosticos" on public.diagnosticos
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "auth users full posts" on public.posts;
create policy "auth users full posts" on public.posts
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Automações
drop policy if exists "auth users full automacoes" on public.automacoes;
create policy "auth users full automacoes" on public.automacoes
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "auth users full automacao_log" on public.automacao_log;
create policy "auth users full automacao_log" on public.automacao_log
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Votos TSE
drop policy if exists "auth users full votos" on public.votos_tse;
create policy "auth users full votos" on public.votos_tse
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- ====================================================
-- STORAGE — buckets
-- ====================================================
insert into storage.buckets (id, name, public)
  values ('anexos', 'anexos', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Policies anexos
drop policy if exists "auth read anexos" on storage.objects;
create policy "auth read anexos" on storage.objects
  for select using (bucket_id = 'anexos' and auth.uid() is not null);

drop policy if exists "auth write anexos" on storage.objects;
create policy "auth write anexos" on storage.objects
  for insert with check (bucket_id = 'anexos' and auth.uid() is not null);

drop policy if exists "auth delete anexos" on storage.objects;
create policy "auth delete anexos" on storage.objects
  for delete using (bucket_id = 'anexos' and auth.uid() is not null);

-- Policies avatars
drop policy if exists "avatar public read" on storage.objects;
create policy "avatar public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatar auth write" on storage.objects;
create policy "avatar auth write" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid() is not null);

drop policy if exists "avatar auth update" on storage.objects;
create policy "avatar auth update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid() is not null);

drop policy if exists "avatar auth delete" on storage.objects;
create policy "avatar auth delete" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid() is not null);

-- ====================================================
-- REALTIME — habilita pra todas as tabelas relevantes
-- ====================================================
do $$
declare
  t text;
  tabelas text[] := array[
    'eleitores','demandas','anexos','compromissos','proposituras','emendas',
    'perfis','config','solicitacoes','demanda_historico','disparos','posts',
    'automacoes'
  ];
begin
  foreach t in array tabelas loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ====================================================
-- SEEDS
-- ====================================================
-- Config inicial
insert into public.config (chave, valor) values
  ('nome_vereador', '"Marco Xavier"'::jsonb),
  ('proxima_eleicao', '"2028-10-01"'::jsonb),
  ('marcadores', '["Liderança","Pai","Mãe","Cônjuge","Voluntário","Doador"]'::jsonb),
  ('nichos', '["Católico Sta Luzia","Atendido pelo gabinete","Tiro de Guerra 94","Romeiro","Vista Alegre","Novo Horizonte","Nova Suíça","Família","Voluntariado"]'::jsonb),
  ('dias_sem_contato', '15'::jsonb),
  ('mensagens_padrao', '[
    {"id":"aniversario","nome":"Aniversário","categoria":"Aniversário","conteudo":"Olá {{nome}}! Hoje é seu dia! 🎉\nQue Deus abençoe sua vida e sua família. Conta comigo aqui no gabinete pra o que precisar.\n— Marco Xavier"},
    {"id":"agradecimento","nome":"Agradecimento","categoria":"Geral","conteudo":"Olá {{nome}}, tudo bem? Passando pra agradecer o seu contato. Conta comigo sempre que precisar.\n— Marco Xavier"},
    {"id":"demanda-rec","nome":"Demanda recebida","categoria":"Atendimento","conteudo":"Olá {{nome}}! Recebemos sua solicitação aqui no gabinete. Já estamos encaminhando e te aviso assim que tiver retorno.\n— Equipe Marco Xavier"},
    {"id":"demanda-res","nome":"Demanda resolvida","categoria":"Atendimento","conteudo":"Olá {{nome}}! Boa notícia: sua solicitação foi atendida. Qualquer coisa, conta comigo.\n— Marco Xavier"},
    {"id":"convite-igreja","nome":"Convite — Sta Luzia","categoria":"Comunidade","conteudo":"Oi {{nome}}! Tem celebração na nossa Paróquia Santa Luzia esta semana. Conto com você! 🙏\n— Marco Xavier"}
  ]'::jsonb)
on conflict (chave) do nothing;

-- Seeds de automação (todos desligados)
insert into public.automacoes (nome, descricao, tipo, ativo, gatilho, acao)
select * from (values
  ('Boas-vindas a novo eleitor',
   'Manda mensagem 1h depois de cadastrar eleitor novo (que tem telefone).',
   'boas_vindas',
   false,
   '{"quando":"novo_eleitor","esperar_minutos":60}'::jsonb,
   '{"tipo":"enviar_whatsapp","template_id":"agradecimento"}'::jsonb),
  ('FUP atendimento parado',
   'Se atendimento ficar 3 dias em "Pendência" sem update, manda mensagem.',
   'fup',
   false,
   '{"dias_sem_movimento":3,"status_demanda":"Em andamento"}'::jsonb,
   '{"tipo":"enviar_whatsapp","template_id":"demanda-rec","so_horario":{"de":9,"ate":18}}'::jsonb),
  ('Reativar conquistados frios',
   'Eleitores Conquistados sem contato há 60 dias.',
   'reativacao',
   false,
   '{"dias_sem_contato":60,"envolvimento":"Conquistado"}'::jsonb,
   '{"tipo":"enviar_whatsapp","template_id":"convite-igreja"}'::jsonb),
  ('Mensagem de aniversário',
   'Manda mensagem no dia do aniversário.',
   'aniversario',
   false,
   '{"dias_antes":0}'::jsonb,
   '{"tipo":"enviar_whatsapp","template_id":"aniversario","so_horario":{"de":9,"ate":11}}'::jsonb)
) as v(nome, descricao, tipo, ativo, gatilho, acao)
where not exists (select 1 from public.automacoes where nome = v.nome);

-- ====================================================
-- RECARREGA SCHEMA CACHE DO POSTGREST
-- (corrige "Could not find column ... in schema cache")
-- ====================================================
notify pgrst, 'reload schema';

-- ====================================================
-- 🎉 FIM
-- ====================================================
-- Pra conferir que tudo rodou:
select 'eleitores' as tabela, count(*) as registros from public.eleitores
union all select 'demandas', count(*) from public.demandas
union all select 'config', count(*) from public.config
union all select 'automacoes', count(*) from public.automacoes
union all select 'perfis', count(*) from public.perfis
order by tabela;

-- Próximo passo manual (1 vez):
-- No Supabase Studio → Authentication → Users → crie:
--   - marcoxavier@limeira.sp.leg.br (senha 041228@)
-- Depois eleve a admin com:
--   update public.perfis set papel = 'admin'
--   where id = (select id from auth.users where email = 'marcoxavier@limeira.sp.leg.br');


-- ┌─────────────────────────────────────────────────────────────┐
-- │   PARTE 2/3 — ADICIONAR-ROOT                                  │
-- └─────────────────────────────────────────────────────────────┘

-- =====================================================================
-- 👑  ROOT + PAUSAR + AVISO — extensão da tabela perfis
-- =====================================================================
-- Rodar no Supabase Studio → SQL Editor → RUN
-- Idempotente: pode rodar várias vezes
-- =====================================================================

-- 1. Adiciona colunas (se não existirem)
alter table public.perfis add column if not exists pausado boolean default false;
alter table public.perfis add column if not exists pausado_em timestamptz;
alter table public.perfis add column if not exists aviso text;
alter table public.perfis add column if not exists email text;

-- 2. Preenche email a partir de auth.users (pra perfis antigos sem email)
update public.perfis p
   set email = u.email
  from auth.users u
 where p.id = u.id
   and (p.email is null or p.email = '');

-- 3. Helper: is_root()
create or replace function public.is_root() returns boolean
language sql security definer stable
as $$
  select coalesce(
    (select papel = 'root' and not coalesce(pausado, false)
       from public.perfis
      where id = auth.uid()),
    false
  );
$$;

-- 4. Atualiza is_admin pra considerar pausado também
create or replace function public.is_admin() returns boolean
language sql security definer stable
as $$
  select coalesce(
    (select papel in ('admin', 'root') and not coalesce(pausado, false)
       from public.perfis
      where id = auth.uid()),
    false
  );
$$;

-- 5. RLS: root pode tudo em perfis
drop policy if exists "root manage perfis" on public.perfis;
create policy "root manage perfis" on public.perfis
  for all using (public.is_root()) with check (public.is_root());

-- 6. RPC: root pode alterar o e-mail de login (auth.users)
--    Atualiza tanto em auth.users quanto em perfis.
create or replace function public.root_atualizar_email(
  p_user_id uuid,
  p_novo_email text
) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_root() then
    raise exception 'Acesso negado: apenas root pode alterar e-mail';
  end if;

  if p_novo_email is null or length(trim(p_novo_email)) = 0 then
    raise exception 'E-mail vazio';
  end if;

  -- Evita duplicata
  if exists (
    select 1 from auth.users
     where email = lower(trim(p_novo_email))
       and id <> p_user_id
  ) then
    raise exception 'Já existe outro usuário com esse e-mail';
  end if;

  update auth.users
     set email = lower(trim(p_novo_email)),
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at = now()
   where id = p_user_id;

  update public.perfis
     set email = lower(trim(p_novo_email))
   where id = p_user_id;
end;
$$;

grant execute on function public.root_atualizar_email(uuid, text) to authenticated;

-- 7. Recarrega schema cache do PostgREST
notify pgrst, 'reload schema';

-- =====================================================================
-- COMO PROMOVER ALGUÉM A ROOT (rodar só uma vez, manualmente):
--
--   update public.perfis
--      set papel = 'root'
--    where email = 'saulo.lsystem@gmail.com';
-- =====================================================================


-- ┌─────────────────────────────────────────────────────────────┐
-- │   PARTE 3/3 — CRIAR-ROOT (saulo.lsystem@gmail.com)            │
-- └─────────────────────────────────────────────────────────────┘

-- =====================================================================
-- 👑  CRIAR USUÁRIO ROOT — saulo.lsystem@gmail.com
-- =====================================================================
-- Pré-requisitos:
--   1. INSTALAR-TUDO.sql já rodado (cria perfis, triggers, etc)
--   2. ADICIONAR-ROOT.sql já rodado (adiciona papel 'root', pausado, aviso)
--
-- Como rodar:
--   Supabase Studio → SQL Editor → cola TUDO → RUN
--
-- O que faz:
--   - Cria conta em auth.users (idempotente — se já existir, só atualiza senha)
--   - Cria identidade do provider 'email' em auth.identities
--   - Cria/atualiza perfil com papel='root'
--
-- Credenciais criadas:
--   E-mail:  saulo.lsystem@gmail.com
--   Senha:   governatoroot2006
-- =====================================================================

-- Garante a extensão de criptografia (pra crypt()/gen_salt())
create extension if not exists "pgcrypto";

do $$
declare
  v_email text := 'saulo.lsystem@gmail.com';
  v_senha text := 'governatoroot2006';
  v_nome  text := 'Saulo Xavier';
  v_user_id uuid;
begin
  -- 1. Já existe?
  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is null then
    -- 2a. Cria do zero
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_senha, gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('nome', v_nome),
      false
    );

    -- Identidade do provider 'email' (necessária pro login com senha funcionar)
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email',
      now(), now(), now()
    );

    raise notice 'Usuário root criado: % (id=%)', v_email, v_user_id;
  else
    -- 2b. Já existe — apenas garante a senha
    update auth.users
       set encrypted_password = crypt(v_senha, gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = v_user_id;

    raise notice 'Usuário já existia — senha atualizada: % (id=%)', v_email, v_user_id;
  end if;

  -- 3. Cria / atualiza perfil como root
  insert into public.perfis (id, nome, email, papel, pausado)
       values (v_user_id, v_nome, v_email, 'root', false)
  on conflict (id) do update
       set papel    = 'root',
           pausado  = false,
           email    = excluded.email,
           nome     = coalesce(public.perfis.nome, excluded.nome);

  raise notice 'Perfil ROOT pronto.';
end $$;

-- Recarrega cache do PostgREST
notify pgrst, 'reload schema';

-- =====================================================================
-- 🎉 FIM. Login do root:
--    E-mail: saulo.lsystem@gmail.com
--    Senha:  governatoroot2006
-- =====================================================================
