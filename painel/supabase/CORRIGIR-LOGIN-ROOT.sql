-- =====================================================================
-- 🔧  CORRIGIR LOGIN ROOT — "Database error querying schema"
-- =====================================================================
-- Erro acontece quando colunas de token em auth.users estão NULL
-- (versões antigas do GoTrue esperam string vazia '').
--
-- Esse script:
--   1. Limpa o root anterior (auth.users + auth.identities + perfis)
--   2. Recria a conta com TODOS os campos preenchidos corretamente
--   3. Promove a root
--
-- COMO RODAR:
--   Supabase Studio → SQL Editor → cola TUDO → RUN
-- =====================================================================

create extension if not exists "pgcrypto";

do $$
declare
  v_email text := 'saulo.lsystem@gmail.com';
  v_senha text := 'governatoroot2006';
  v_nome  text := 'Saulo Xavier';
  v_user_id uuid;
  v_old_id  uuid;
begin
  -- 1. Remove dados antigos (se existirem)
  select id into v_old_id from auth.users where email = v_email;
  if v_old_id is not null then
    delete from public.perfis where id = v_old_id;
    delete from auth.identities where user_id = v_old_id;
    delete from auth.users where id = v_old_id;
    raise notice 'Conta antiga removida: % (id=%)', v_email, v_old_id;
  end if;

  -- 2. Cria de novo com TODOS os campos
  v_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_senha, gen_salt('bf')),
    now(),
    null,
    '',
    null,
    '',
    null,
    '',
    '',
    null,
    null,
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('nome', v_nome),
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null
  );

  -- 3. Identidade do provider 'email'
  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  );

  -- 4. Cria perfil root
  insert into public.perfis (id, nome, email, papel, pausado)
       values (v_user_id, v_nome, v_email, 'root', false)
  on conflict (id) do update
       set papel   = 'root',
           pausado = false,
           email   = excluded.email,
           nome    = coalesce(public.perfis.nome, excluded.nome);

  raise notice '✅ Login pronto: % / % (id=%)', v_email, v_senha, v_user_id;
end $$;

notify pgrst, 'reload schema';
