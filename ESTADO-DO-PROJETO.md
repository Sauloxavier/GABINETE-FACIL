# Governato — Estado do Projeto

> Painel de gestão de mandato parlamentar. Nasceu como MazyOS pro vereador
> Marco Xavier (Limeira-SP), virou produto SaaS chamado **governato**.

---

## 🧭 Visão geral

- **Cliente piloto**: Marco Xavier — Vereador de Limeira-SP (PP, 46ª Legislatura 2026-2028)
- **Equipe do gabinete**: Marco + 2 assessores
- **Marca**: governato (logo "g" em gradiente azul)
- **Tagline**: powered by GOVERNATO

---

## 🚀 Deploy

| | |
|---|---|
| **Produção** | https://governato.com.br (Vercel alias: https://governata.vercel.app) |
| **GitHub** | https://github.com/Sauloxavier/MazyOS |
| **Branch ativa** | `main` (auto-deploy a cada push) |
| **Login do Marco** | `marcoxavier@limeira.sp.leg.br` / `041228@` |

---

## 🔧 Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + Vite + TanStack Router/Query + Tailwind |
| Backend | Supabase self-hosted no Easypanel |
| WhatsApp | WAHA self-hosted (mesma VM) |
| IA | OpenAI API (chave em config, chamada direta do browser) |
| Hospedagem do painel | Vercel (free tier) |
| Mapas | Leaflet + OpenStreetMap (removido na sessão atual) |

### URLs da infra

| Serviço | URL |
|---|---|
| Supabase Studio | https://iamob-supabase.fqejv1.easypanel.host |
| WAHA | (mesma VM, URL no config) |
| Repositório | github.com/Sauloxavier/MazyOS |

---

## 📁 Estrutura de pastas

```
mazyos/
├── painel-v2/                  ← FRENTE DE DESENVOLVIMENTO ATIVO
│   ├── src/
│   │   ├── routes/_authed/     ← Páginas autenticadas
│   │   ├── features/           ← Componentes por domínio
│   │   ├── lib/                ← Clientes (supabase, waha, openai, spintax)
│   │   └── store/              ← Zustand (auth)
│   ├── public/                 ← Logos governato + manifest + sw
│   └── package.json
├── painel/                     ← v1 LEGACY (não mexer)
│   └── supabase/               ← SQLs (INSTALAR-TUDO.sql consolida tudo)
├── scripts/                    ← Workers Node.js
│   ├── votos-limeira/          ← Import TSE
│   ├── atendimento-ia/         ← Bot WhatsApp 24/7
│   ├── automacoes/             ← FUP, boas-vindas, aniversário
│   ├── geocodificar-locais/    ← Nominatim
│   └── noticias-limeira/       ← Scraper Google News
└── logo saas/                  ← Variações da marca governato
```

---

## 🎯 Funcionalidades implementadas

### 📊 Dashboard (`/`)
- Saudação "Boa noite, MARCO" como h1 grande
- Card destaque do Raio-X Votos
- Widget "Eleitorado de SP" (dados ao vivo do TRE-SP)
- Widget "Sua votação" — gráfico do candidato fixado nas últimas eleições
- 5 counters + 4 atalhos + 5 gráficos (bairro, tipo, andamento, envolvimento, cadastros/mês)
- Filtro de período: 7/15/30/60 dias

### 👥 Eleitores (`/eleitores`)
- Lista virtualizada (TanStack Virtual)
- **Cadastro incompleto** destacado com borda amarela + badge `⚠ INCOMPLETO`
- Filtros: bairro, envolvimento, **Só incompletos**
- Botão "Ver" (read-only) e "Editar" no modal
- Atendimentos do eleitor listados dentro do modal
- Marcadores/nichos via **dropdown com checkbox**
- Código único `MX-001` (auto-gerado por trigger)
- Envolvimentos: Não trabalhado / Em prospecção / Conquistado / **Incerto** / Perdido
- Deeplink `?id=X` abre o eleitor automaticamente

### 📨 Atendimentos (`/atendimentos`)
- Lista + Kanban
- Status: Não iniciado / Pendência / Concluída (renomeado, valor no banco mantém compat)
- Filtro de data: Últimos **7/15/30/60 dias** ou Tudo
- Modal com botões "Ver cadastro do eleitor" + "Abrir WhatsApp"

### 💬 Conversas WhatsApp (`/conversas`)
- Lista de chats + thread
- **Foto dos contatos** (via WAHA, cacheada 24h)
- Filtros: todos / não lidos / cadastrados
- Avatar com foto ou iniciais

### 🗳 Raio-X Votos (`/raio-x-votos`)
- Dados oficiais do TSE — Limeira município **66397**
- 6 eleições importadas: Vereador + Prefeito 2016, 2020, 2024 (**242.582 registros**)
- Carregamento lazy (top 30 → "carregar mais")
- Autocomplete server-side (busca por nome/número/partido)
- 5 abas: Ranking · Comparar · Zonas · Locais · Seções
- **Comparativo até 5 candidatos** com tabelas cruzadas + evolução histórica
- **Candidato fixado** (Marco 11200) aparece em dourado ⭐, auto-selecionado

### 🏆 Ranking de lideranças (`/ranking`)
- Score calculado de envolvimento, marcadores (Liderança +100), atendimentos, atividade
- Top 50 com pódio dourado/prata/bronze

### 🤖 Recursos Pro

| Rota | O que faz |
|---|---|
| `/pro/disparo` | Disparo em massa texto/imagem/áudio + spintax `{Olá|Oi}` + microvariações anti-bloqueio Meta + intervalo aleatório 8-20s |
| `/pro/automacoes` | CRUD de automações: boas-vindas, FUP, reativação, aniversário, resposta por keyword |
| `/pro/posts` | Gerador de carrossel/legenda/hashtags com OpenAI |
| `/pro/trafego` | Briefing Meta Ads (criativos + segmentação + KPIs) |
| `/pro/ia` | Atendimento por IA com modo "Auto" e "Só sugere" |
| `/pro/analise` | Diagnóstico estratégico do mandato com OpenAI |

### ⚙️ Configurações (`/config`)
- Aba **Geral** — nome do vereador, próxima eleição, **candidato fixado** (número + nome)
- Aba **WhatsApp** — URL/Key/Sessão WAHA
- Aba **IA** — chave OpenAI, modelo, prompt do atendimento IA
- Aba **Tags & Nichos** — gerenciar marcadores e nichos
- Aba **Equipe** — gerenciamento de perfis

### 🔐 Auth
- Login via Supabase Auth
- **Timeout 20 min** de inatividade (avisa 1 min antes, desloga automático)
- Foto de perfil do usuário (upload pro Storage)
- Papéis: admin / assessor
- Botão de deslogar com redirect forçado

### 📱 PWA
- Manifest configurado, Service Worker registrado
- Funciona offline (cache de assets)
- Instalável via browser nativo

### 🎨 Identidade governato
- Logo "g + governato" horizontal sólida no login e sidebar
- Favicon "g" gradient azul
- Topbar limpo (busca + WhatsApp + sino + nome + avatar)
- "powered by GOVERNATO" no rodapé

---

## 💾 Banco de dados (Supabase)

### Tabelas principais
- `eleitores` — codigo (MX-001), nome, telefone, cpf, envolvimento, marcadores[], nichos[]
- `demandas` — atendimentos
- `compromissos` — agenda
- `proposituras` + `emendas` — parlamentar
- `solicitacoes` — formulário público
- `config` — key-value JSONB (settings)
- `perfis` — extensão de auth.users
- `automacoes` + `automacao_log` — automações
- `disparos` + `posts` + `diagnosticos` — recursos Pro
- `votos_tse` — votos detalhados Limeira
- `locais_votacao_geo` — geocoding (criado, não usado)

### Funções RPC (otimizam Raio-X)
- `raiox_ranking(ano, cargo, limit, offset)`
- `raiox_resumo(ano, cargo)`
- `raiox_buscar(ano, cargo, q)` — autocomplete
- `raiox_por_zona/local/secao(ano, cargo)`
- `raiox_detalhe_candidato(ano, cargo, numero)`
- `raiox_historico_candidato(numero)`
- `gerar_codigo_eleitor()` — trigger MX-001
- `registrar_visualizacao(demanda_id)`
- `is_admin()`

### SQL único pra rodar
```
painel/supabase/INSTALAR-TUDO.sql
```
Idempotente — pode rodar várias vezes.

---

## 🛠 Scripts Node.js (rodar na VM)

| Script | Pra que serve | Como rodar |
|---|---|---|
| `votos-limeira/` | Importa CSV oficial do TSE (município **66397** = Limeira) | `node index.js --ano 2024 --cargo VEREADOR` |
| `atendimento-ia/` | Bot WhatsApp 24/7 que responde com ChatGPT | `pm2 start index.js --name atendimento-ia` |
| `automacoes/` | Worker que executa automações configuradas | `pm2 start index.js --name automacoes` |
| `geocodificar-locais/` | Nominatim pra mapa (não usado atualmente) | `node index.js` |
| `noticias-limeira/` | Scraper Google News | `node index.js --topico saude --salvar` |

Todos precisam de `.env` com `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, e os específicos (`WAHA_URL`, `OPENAI_API_KEY`).

---

## 📌 Decisões técnicas importantes

| | |
|---|---|
| **Painel-v2 only** | v1 (HTML/Alpine) está congelado, todo trabalho novo no painel-v2 (React/TS) |
| **Sem n8n** | Tudo via WAHA direto + OpenAI direto, sem webhooks externos |
| **OpenAI > Claude** | Trocado por preferência do usuário |
| **Limeira TSE = 66397** | (NÃO IBGE 3526902, NÃO 70319 que era Santa Ernestina) |
| **Cargos UPPERCASE** | UPDATE no banco normalizou tudo (`vereador` → `VEREADOR`) |
| **Lazy loading** | Raio-X usa RPCs server-side com paginação — sem mais "select 50k linhas" |

---

## ⚠️ Pendências e riscos

### Segurança (importante antes de vender)
- [ ] Chaves demo do Supabase (JWT_SECRET, ANON, SERVICE_ROLE) ainda padrão
- [ ] Service_role hardcoded no `supabase-client.js` (frontend) — mover pra Edge Function
- [ ] CORS aberto pra qualquer origem
- [ ] Senha do Supabase Studio padrão

### Funcional
- [ ] Worker `atendimento-ia` ainda não está rodando na VM
- [ ] Modo "Só sugere" do atendimento IA — UI pronta, worker não lê o flag
- [ ] Geocoding/mapa removidos (decisão do usuário)
- [ ] PWA "Instalar como app" — botão removido a pedido (mas SW continua ativo)

### SaaS (próximos passos pra virar produto)
- [ ] Multi-tenant — hoje é deploy individual pro Marco
- [ ] Onboarding de novos vereadores
- [ ] Cobrança / planos
- [ ] Site institucional do governato
- [ ] Documentação pro cliente final

---

## 🔄 Fluxo de trabalho

1. **Alteração**: editar em `mazyos/painel-v2/src/`
2. **Validar**: `cd painel-v2 && npm run build` (TS estrito ativo)
3. **Commit + push** pra `main`
4. **Vercel auto-deploy** em ~1-2 min
5. **SQL novo?** Editar `painel/supabase/INSTALAR-TUDO.sql` e rodar no Studio

---

## 📞 Contatos do mandato (cliente piloto)

- **Vereador**: Marco Xavier
- **Câmara**: marcoxavier@limeira.sp.leg.br
- **WhatsApp atendimento**: +55 19 99711-6834
- **Base eleitoral**: Paróquia Sta Luzia, TG 94, Vista Alegre, Novo Horizonte, Nova Suíça
- **Número eleitoral**: 11200 (só usar em material de campanha, NÃO de mandato)

---

## 📊 Dados importados

| Eleição | Cargo | Registros |
|---|---|---|
| 2024 | VEREADOR | 73.043 |
| 2024 | PREFEITO | 7.260 |
| 2020 | VEREADOR | 73.405 |
| 2020 | PREFEITO | 9.556 |
| 2016 | VEREADOR | 74.165 |
| 2016 | PREFEITO | 5.153 |
| **Total** | | **242.582** |

---

*Última atualização: 2026-05-31*
