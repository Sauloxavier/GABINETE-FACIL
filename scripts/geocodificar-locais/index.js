#!/usr/bin/env node
// =====================================================================
// Geocodificador de locais de votação (Limeira-SP)
//
// Lê todos os locais únicos da tabela votos_tse, geocodifica via
// Nominatim (OpenStreetMap, gratuito) e salva lat/lng em
// locais_votacao_geo.
//
// USO:
//   cp .env.example .env  # preencha SUPABASE_SERVICE_KEY
//   npm install
//   node index.js
//
// Nominatim limita 1 req/s, então pra ~440 locais demora ~8 min.
// Roda 1x só — depois fica em cache no banco.
// =====================================================================

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
const MUN_CODE = process.env.MUNICIPIO_CODE || '66397'     // Limeira-SP TSE
const CIDADE = process.env.CIDADE_NOME || 'Limeira'
const UF = process.env.UF || 'SP'

if (!url || !key) {
  console.error('Faltam SUPABASE_URL e SUPABASE_SERVICE_KEY no .env')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })

async function geocodeNominatim(query) {
  const u = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`
  const res = await fetch(u, {
    headers: { 'User-Agent': 'GovernatoGeocoder/1.0 (gabinete-marco-xavier)' },
  })
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  const arr = await res.json()
  if (!arr || arr.length === 0) return null
  return { lat: Number(arr[0].lat), lng: Number(arr[0].lon) }
}

function dormir(ms) { return new Promise(r => setTimeout(r, ms)) }

async function listarLocaisUnicos() {
  // Faz select distinct dos locais únicos da Limeira
  const { data, error } = await sb
    .from('votos_tse')
    .select('local_votacao, local_endereco')
    .eq('municipio_codigo', MUN_CODE)
    .not('local_votacao', 'is', null)
    .limit(100000)
  if (error) throw error
  const map = new Map()
  for (const r of data ?? []) {
    if (!map.has(r.local_votacao)) {
      map.set(r.local_votacao, r.local_endereco || '')
    }
  }
  return [...map.entries()].map(([nome, endereco]) => ({ nome, endereco }))
}

async function jaGeocodificado(nome) {
  const { data } = await sb
    .from('locais_votacao_geo')
    .select('lat, lng')
    .eq('municipio_codigo', MUN_CODE)
    .eq('nome', nome)
    .maybeSingle()
  return data?.lat ? data : null
}

async function salvarGeo(nome, endereco, lat, lng, precisao) {
  const { error } = await sb.from('locais_votacao_geo').upsert({
    municipio_codigo: MUN_CODE,
    nome,
    endereco_busca: endereco,
    lat,
    lng,
    precisao,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'municipio_codigo,nome' })
  if (error) console.warn(`  ✗ upsert ${nome}: ${error.message}`)
}

async function main() {
  console.log(`📍 Geocodificador — ${CIDADE}-${UF} (TSE ${MUN_CODE})`)
  console.log(`   Fonte: Nominatim (limite 1 req/s)\n`)

  const locais = await listarLocaisUnicos()
  console.log(`  ${locais.length} locais únicos encontrados\n`)

  let ok = 0
  let aprox = 0
  let falhou = 0
  let pulado = 0

  for (let i = 0; i < locais.length; i++) {
    const { nome, endereco } = locais[i]
    const prefix = `[${String(i+1).padStart(3)}/${locais.length}]`

    // Cache: se já está geocodificado, pula
    const existente = await jaGeocodificado(nome)
    if (existente) {
      pulado++
      console.log(`${prefix} ⏭  ${nome.slice(0, 60)} (já tem)`)
      continue
    }

    // 1ª tentativa: endereço completo + cidade
    let pos = null
    let precisao = 'falhou'
    if (endereco) {
      const q1 = `${endereco}, ${CIDADE}, ${UF}, Brasil`
      try { pos = await geocodeNominatim(q1); if (pos) precisao = 'ok' } catch {}
      await dormir(1100)
    }

    // 2ª tentativa: nome do local + cidade
    if (!pos) {
      const q2 = `${nome}, ${CIDADE}, ${UF}, Brasil`
      try { pos = await geocodeNominatim(q2); if (pos) precisao = 'aproximado' } catch {}
      await dormir(1100)
    }

    if (pos) {
      await salvarGeo(nome, endereco, pos.lat, pos.lng, precisao)
      if (precisao === 'ok') {
        ok++
        console.log(`${prefix} ✓ ${nome.slice(0, 60)} → ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`)
      } else {
        aprox++
        console.log(`${prefix} ~ ${nome.slice(0, 60)} → ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)} (aprox)`)
      }
    } else {
      await salvarGeo(nome, endereco, null, null, 'falhou')
      falhou++
      console.log(`${prefix} ✗ ${nome.slice(0, 60)} (sem coordenadas)`)
    }
  }

  console.log(`\n📊 Resumo:`)
  console.log(`  ✓  Geocodificados:  ${ok}`)
  console.log(`  ~  Aproximados:     ${aprox}`)
  console.log(`  ⏭  Em cache:        ${pulado}`)
  console.log(`  ✗  Falharam:        ${falhou}`)
  console.log(`\n🗺️  Pronto! Ative a aba Mapa em /raio-x-votos.`)
}

main().catch(e => { console.error(e); process.exit(1) })
