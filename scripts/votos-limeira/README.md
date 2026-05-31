# Raio-X Votos — Importador TSE

Baixa dados oficiais do **TSE** (boletim por seção) e importa pro Supabase
pra alimentar a página **/raio-x-votos** do painel.

## O que importa

- Votos detalhados por **seção, zona, local de votação**
- Por **candidato**, **partido**, **cargo** (Vereador, Prefeito, Deputado…)
- De qualquer eleição **2012 a 2026** (mais recente disponível)
- De qualquer município (default: Limeira-SP, código 70319)

Fonte: https://dadosabertos.tse.jus.br/ (CSV oficial, gratuito)

## Setup (1 vez)

```bash
cd scripts/votos-limeira
cp .env.example .env       # preenche SUPABASE_SERVICE_KEY
npm install
```

Também precisa do comando `unzip` (já vem em macOS/Linux por padrão).

## Antes de rodar

No Supabase Studio, rode a migration:
```
painel/supabase/11-votos-tse.sql
```

Cria a tabela `votos_tse` + view + índices.

## Como usar

```bash
# Vereadores 2024 de Limeira (~50-200 MB de download, depende da UF)
node index.js --ano 2024 --cargo VEREADOR

# Prefeito 2024
node index.js --ano 2024 --cargo PREFEITO

# Deputado Estadual 2022
node index.js --ano 2022 --cargo "DEPUTADO ESTADUAL"

# Outra cidade (Campinas = 67121)
node index.js --ano 2024 --cargo VEREADOR --municipio 67121

# Só ver os dados sem importar
node index.js --ano 2024 --cargo VEREADOR --dry-run
```

Ou usa os atalhos:

```bash
npm run vereador-2024
npm run prefeito-2024
npm run deputado-est-2022
```

## O que o script faz

1. Baixa o ZIP oficial do TSE pro UF/ano (`https://cdn.tse.jus.br/.../votacao_secao_<ANO>_<UF>.zip`)
2. Descompacta o CSV
3. Filtra pelas linhas do cargo + município que você escolheu
4. Faz **upsert** no Supabase em lotes de 500 (idempotente — pode rodar várias vezes)

Cache: o ZIP baixado fica em `cache/` — não baixa de novo nas próximas execuções.

## Como ver os dados depois

No painel: **/raio-x-votos**

Aí dá pra:
- Filtrar por ano/cargo
- Ver ranking de candidatos
- Comparar votos entre candidatos
- Ver totais por seção/local de votação/zona

## Códigos de município SP (referência)

| Município | Código TSE |
|---|---|
| Limeira | 70319 |
| Piracicaba | 67121 |
| Americana | 60151 |
| Rio Claro | 69680 |
| Campinas | 60500 |
| Cordeirópolis | 65668 |

## Limitações

- TSE **não publica bairro direto** — vem só endereço do local de votação. Pra ter votos por bairro real, precisa geocodificar o endereço (não fazemos aqui).
- 2026 vai estar disponível só **depois da eleição**, normalmente em janeiro do ano seguinte.
- Cargo "PREFEITO" só tem em anos pares municipais (2020, 2024).
- Cargo "DEPUTADO ESTADUAL/FEDERAL", "GOVERNADOR", "SENADOR" tem em 2022, 2018, etc.
