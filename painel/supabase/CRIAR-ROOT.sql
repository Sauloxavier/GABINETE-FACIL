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
