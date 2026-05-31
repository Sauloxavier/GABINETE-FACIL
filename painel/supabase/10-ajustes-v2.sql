-- =====================================================================
-- Migração 10: Ajustes do painel-v2 (2026-05-31)
--
-- O que muda:
--   1. Adiciona coluna `codigo` em eleitores (formato MX-001, MX-002...)
--   2. Cria sequência + trigger pra auto-gerar o código
--   3. Preenche códigos pros eleitores já existentes
--   4. Notifica PostgREST pra recarregar schema cache
--   5. Cria automações tabela se ainda não existe (caso 09 não rodada)
--
-- Rodar TUDO de uma vez no SQL Editor do Supabase Studio.
-- =====================================================================

-- ====================================================
-- 1. CÓDIGO DO ELEITOR (MX-001)
-- ====================================================
alter table public.eleitores
  add column if not exists codigo text unique;

create sequence if not exists public.eleitor_codigo_seq start with 1;

-- Função pra gerar próximo código
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

-- Trigger antes de insert
drop trigger if exists trg_eleitor_codigo on public.eleitores;
create trigger trg_eleitor_codigo
  before insert on public.eleitores
  for each row execute procedure public.gerar_codigo_eleitor();

-- Preenche códigos pros eleitores que já estão sem código
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
-- 2. RECARREGAR SCHEMA CACHE DO POSTGREST
-- (Corrige bugs "Could not find column ... in schema cache")
-- ====================================================
notify pgrst, 'reload schema';

-- ====================================================
-- 3. GARANTE TABELA DE AUTOMAÇÕES (caso 09 não tenha rodado)
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
  atualizado_em timestamptz not null default now()
);

create table if not exists public.automacao_log (
  id uuid primary key default gen_random_uuid(),
  automacao_id uuid references public.automacoes(id) on delete cascade,
  eleitor_id uuid references public.eleitores(id) on delete set null,
  demanda_id uuid references public.demandas(id) on delete set null,
  status text not null default 'sucesso',
  detalhe text,
  executado_em timestamptz not null default now()
);

alter table public.automacoes    enable row level security;
alter table public.automacao_log enable row level security;

drop policy if exists "auth users full automacoes" on public.automacoes;
create policy "auth users full automacoes" on public.automacoes
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "auth users full automacao_log" on public.automacao_log;
create policy "auth users full automacao_log" on public.automacao_log
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Seeds de automação (só inserem se ainda não houver)
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
-- 4. RECARREGA SCHEMA DE NOVO PRA PEGAR TUDO
-- ====================================================
notify pgrst, 'reload schema';

-- ====================================================
-- FIM
-- ====================================================
-- Confere que rodou:
--   select codigo, nome from public.eleitores order by codigo limit 10;
--   select nome, tipo, ativo from public.automacoes;
