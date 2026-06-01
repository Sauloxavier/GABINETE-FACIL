-- =====================================================================
-- 👥  HIERARQUIA — admin é dono dos assessores que criou
-- =====================================================================
-- Adiciona perfis.criado_por (uuid → perfis.id)
-- Permite mostrar "assessores desta conta" no painel
-- Idempotente.
-- =====================================================================

-- 1. Coluna criado_por
alter table public.perfis
  add column if not exists criado_por uuid references public.perfis(id) on delete set null;

create index if not exists idx_perfis_criado_por on public.perfis (criado_por);

-- 2. RLS: admin vê apenas próprios assessores + ele mesmo + admins root
drop policy if exists "admin manage perfis" on public.perfis;
create policy "admin manage perfis" on public.perfis
  for all using (
    public.is_root()
    or (public.is_admin() and (criado_por = auth.uid() or id = auth.uid()))
  ) with check (
    public.is_root()
    or (public.is_admin() and (criado_por = auth.uid() or id = auth.uid()))
  );

-- 3. Recarrega cache
notify pgrst, 'reload schema';
