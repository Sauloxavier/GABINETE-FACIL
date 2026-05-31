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

-- 6. Recarrega schema cache do PostgREST
notify pgrst, 'reload schema';

-- =====================================================================
-- COMO PROMOVER ALGUÉM A ROOT (rodar só uma vez, manualmente):
--
--   update public.perfis
--      set papel = 'root'
--    where email = 'saulo.lsystem@gmail.com';
-- =====================================================================
