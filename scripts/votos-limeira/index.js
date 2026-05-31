#!/usr/bin/env node
// =====================================================================
// Importador de Votos do TSE — Limeira-SP
//
// Baixa o CSV oficial do TSE (boletim por seção) pra um ano de eleição,
// filtra Limeira (código 70319), e importa pro Supabase na tabela
// votos_tse.
//
// USO:
//   cp .env.example .env
//   npm install
//   node index.js --ano 2024 --cargo VEREADOR
//   node index.js --ano 2022 --cargo "DEPUTADO ESTADUAL"
//   node index.js --ano 2020 --cargo PREFEITO --municipio 70319
//
// Após rodar a primeira vez, /raio-x-votos no painel mostra os dados.
// =====================================================================

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const https = require('https')
const readline = require('readline')
const { execSync } = require('child_process')
const { createClient } = require('@supabase/supabase-js')

const MUNICIPIO_LIMEIRA = '66397'  // código TSE de Limeira-SP (NÃO IBGE)
const UF = 'SP'

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {
    ano: 2024,
    cargo: 'VEREADOR',
    municipio: MUNICIPIO_LIMEIRA,
    uf: UF,
    dryRun: false,
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--ano') out.ano = Number(args[++i])
    else if (a === '--cargo') out.cargo = args[++i].toUpperCase()
    else if (a === '--municipio') out.municipio = args[++i]
    else if (a === '--uf') out.uf = args[++i]
    else if (a === '--dry-run') out.dryRun = true
  }
  return out
}

function urlTse({ ano, uf }) {
  // Estrutura oficial:
  // https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_<ANO>_<UF>.zip
  return `https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_${ano}_${uf}.zip`
}

function baixar(url, destino) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destino)) {
      console.log(`  ✓ Já tinha em cache: ${destino}`)
      return resolve()
    }
    console.log(`  ↓ Baixando ${url}...`)
    const file = fs.createWriteStream(destino)
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return baixar(res.headers.location, destino).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const total = Number(res.headers['content-length'] ?? 0)
      let baixado = 0
      let ultimoPct = -1
      res.on('data', chunk => {
        baixado += chunk.length
        if (total) {
          const pct = Math.floor(baixado / total * 100)
          // Só loga a cada 10% (sem \r pra não poluir captura)
          if (pct >= ultimoPct + 10) {
            ultimoPct = pct
            console.log(`    ${pct}% (${Math.round(baixado / 1024 / 1024)} MB)`)
          }
        }
      })
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', reject)
  })
}

function descompactar(zipPath, destDir) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
  try {
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'ignore' })
  } catch (err) {
    throw new Error(`Falha ao descompactar (precisa do comando 'unzip'): ${err.message}`)
  }
}

function csvParse(linha, sep = ';') {
  // Parser simples respeitando aspas
  const out = []
  let cur = ''
  let dentro = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (c === '"') { dentro = !dentro; continue }
    if (c === sep && !dentro) { out.push(cur); cur = ''; continue }
    cur += c
  }
  out.push(cur)
  return out
}

async function processarCsv(csvPath, filtro) {
  // Stream linha por linha — arquivos do TSE podem passar de 2 GB
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(csvPath, { encoding: 'latin1' })
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
    let header = null
    let idx = null
    const resultado = []

    rl.on('line', (linha) => {
      if (!header) {
        header = csvParse(linha)
        const find = (col) => header.findIndex(h => h.toUpperCase().replace(/"/g, '').trim() === col)
        idx = {
          ano: find('ANO_ELEICAO'),
          turno: find('NR_TURNO'),
          cargo: find('DS_CARGO'),
          uf: find('SG_UF'),
          municipio: find('CD_MUNICIPIO'),
          municipioNome: find('NM_MUNICIPIO'),
          zona: find('NR_ZONA'),
          secao: find('NR_SECAO'),
          local: find('NM_LOCAL_VOTACAO'),
          localEnd: find('DS_LOCAL_VOTACAO_ENDERECO'),
          numero: find('NR_VOTAVEL'),
          nome: find('NM_VOTAVEL'),
          partido: find('SG_PARTIDO'),
          votos: find('QT_VOTOS'),
        }
        if (idx.ano < 0 || idx.cargo < 0) {
          console.warn(`  ! CSV sem colunas esperadas: ${path.basename(csvPath)}`)
          rl.close()
          return resolve([])
        }
        return
      }

      const linhaArr = csvParse(linha)
      if (linhaArr.length < 5) return
      const get = (j) => (j >= 0 ? linhaArr[j].replace(/"/g, '').trim() : '')
      if (filtro.cargo && get(idx.cargo).toUpperCase() !== filtro.cargo) return
      if (filtro.municipio && get(idx.municipio) !== filtro.municipio) return
      const votos = Number(get(idx.votos)) || 0
      if (votos === 0) return
      resultado.push({
        ano: Number(get(idx.ano)),
        turno: Number(get(idx.turno)) || 1,
        cargo: get(idx.cargo),
        uf: get(idx.uf),
        municipio_codigo: get(idx.municipio),
        municipio: get(idx.municipioNome),
        zona: Number(get(idx.zona)) || 0,
        secao: Number(get(idx.secao)) || 0,
        local_votacao: get(idx.local) || null,
        local_endereco: get(idx.localEnd) || null,
        numero_candidato: get(idx.numero),
        nome_candidato: get(idx.nome),
        partido_sigla: get(idx.partido),
        votos,
      })
    })

    rl.on('close', () => resolve(resultado))
    rl.on('error', reject)
  })
}

async function importar(supabase, registros) {
  if (registros.length === 0) {
    console.log('  ⚠ Nenhum registro pra importar')
    return
  }
  console.log(`  ↑ Importando ${registros.length} registros pro Supabase em lotes de 500...`)
  let inseridos = 0
  let erros = 0
  for (let i = 0; i < registros.length; i += 500) {
    const lote = registros.slice(i, i + 500)
    const { error } = await supabase.from('votos_tse').upsert(lote, {
      onConflict: 'ano,turno,cargo,municipio_codigo,zona,secao,numero_candidato',
    })
    if (error) {
      erros++
      console.warn(`    ✗ Lote ${i/500 + 1} falhou: ${error.message}`)
    } else {
      inseridos += lote.length
    }
    process.stdout.write(`\r  ${Math.round((i + lote.length) / registros.length * 100)}%`)
  }
  console.log()
  console.log(`  ✓ ${inseridos} inseridos/atualizados${erros > 0 ? `, ${erros} lote(s) com erro` : ''}`)
}

async function main() {
  const args = parseArgs()
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  console.log(`🗳  Importador TSE — ${args.cargo} ${args.ano} (Limeira ${args.municipio})`)
  console.log()

  // 1. Download
  const cacheDir = path.join(__dirname, 'cache')
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir)
  const zipPath = path.join(cacheDir, `votacao_secao_${args.ano}_${args.uf}.zip`)
  const csvDir = path.join(cacheDir, `${args.ano}_${args.uf}`)

  console.log('1) Download do TSE')
  try {
    await baixar(urlTse(args), zipPath)
  } catch (err) {
    console.error(`  ✗ Falhou: ${err.message}`)
    process.exit(1)
  }

  console.log('\n2) Descompactando')
  descompactar(zipPath, csvDir)
  console.log(`  ✓ Em ${csvDir}`)

  // 3. Processar CSVs
  console.log('\n3) Filtrando registros de Limeira')
  const csvs = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'))
  const todos = []
  for (const csv of csvs) {
    const arq = path.join(csvDir, csv)
    const reg = await processarCsv(arq, { cargo: args.cargo, municipio: args.municipio })
    if (reg.length > 0) console.log(`  + ${csv}: ${reg.length} linhas`)
    todos.push(...reg)
  }
  console.log(`  Total: ${todos.length} registros de ${args.cargo} em Limeira ${args.ano}`)

  if (args.dryRun) {
    console.log('\n4) Dry-run — não importa pro Supabase')
    console.log('  Primeiros 5 registros:')
    console.log(todos.slice(0, 5))
    return
  }

  // 4. Importar
  if (!url || !key) {
    console.warn('\n  ⚠ SUPABASE_URL e SUPABASE_SERVICE_KEY não configurados no .env — não importou.')
    console.warn('     Use --dry-run pra só ver os dados sem importar.')
    return
  }

  console.log('\n4) Importando pro Supabase')
  const sb = createClient(url, key, { auth: { persistSession: false } })
  await importar(sb, todos)

  console.log('\n✅ Pronto! Veja em /raio-x-votos no painel.')
}

main().catch(err => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
