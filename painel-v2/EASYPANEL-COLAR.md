# Easypanel — valores pra copiar e colar

App: `iamob / mazyos-painel`

---

## Aba SOURCE (origem)

| Campo | Valor |
|---|---|
| Tipo | `GitHub` |
| Owner | `Sauloxavier` |
| Repository | `MazyOS` |
| Branch | `main` |
| Build Path | `painel-v2` |
| Auto Deploy | ✅ ligado |

---

## Aba BUILD (build)

| Campo | Valor |
|---|---|
| Build Method / Tipo | `Dockerfile` |
| Dockerfile path | `Dockerfile` |

---

## Aba ENVIRONMENT (ambiente)

⚠️ Tem que ser **Build Args** (não Runtime). Cole na caixa de texto:

```
VITE_SUPABASE_URL=https://iamob-supabase.fqejv1.easypanel.host
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
```

---

## Aba DOMAINS / PORTS (portas)

| Campo | Valor |
|---|---|
| Container Port | `80` |
| Path | `/` |
| HTTPS | ✅ ligado |

URL gerada será algo tipo:
`https://iamob-mazyos-painel.fqejv1.easypanel.host`

---

## Aba DEPLOY

Clica **Deploy** no canto superior direito.
Aguarda 2-3 minutos.

---

## Depois do deploy

Volta no Supabase → Settings → API → Allowed Origins e adiciona:

```
https://iamob-mazyos-painel.fqejv1.easypanel.host
```

(Substitui pelo URL exato que o Easypanel gerar.)
