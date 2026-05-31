import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { Vote, Loader2, Trophy, BarChart3, MapPin, Users, Scale, X, Star, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useConfig } from '@/features/config/hooks'

export const Route = createFileRoute('/_authed/raio-x-votos')({
  component: RaioXPage,
})

interface RankingRow {
  numero_candidato: string
  nome_candidato: string
  partido_sigla: string | null
  total_votos: number
  total_secoes: number
}
interface DetalheRow {
  zona: number
  secao: number
  local_votacao: string | null
  votos: number
}

type Foco = 'candidatos' | 'comparativo' | 'locais' | 'zonas' | 'secoes'

function RaioXPage() {
  const { data: config } = useConfig()
  const candFixado = config?.candidato_fixado_numero?.trim() ?? ''

  const [erroSchema, setErroSchema] = useState(false)

  const [ano, setAno] = useState<number | ''>('')
  const [cargo, setCargo] = useState<string>('')
  const [anosDisponiveis, setAnosDisponiveis] = useState<number[]>([])
  const [cargosDisponiveis, setCargosDisponiveis] = useState<string[]>([])
  const [carregandoFiltros, setCarregandoFiltros] = useState(true)

  // Ranking — paginado, top 30 inicial
  const [ranking, setRanking] = useState<RankingRow[]>([])
  const [carregandoRanking, setCarregandoRanking] = useState(false)
  const [temMais, setTemMais] = useState(false)

  // Resumo (counters)
  const [resumo, setResumo] = useState<{ total_candidatos: number; total_votos: number; total_locais: number; total_secoes: number } | null>(null)

  // Busca (autocomplete server-side)
  const [busca, setBusca] = useState('')
  const [sugestoes, setSugestoes] = useState<RankingRow[]>([])

  // Aba ativa
  const [foco, setFoco] = useState<Foco>('candidatos')

  // Dados das outras abas (lazy)
  const [porZona, setPorZona] = useState<Array<[number, number]> | null>(null)
  const [porLocal, setPorLocal] = useState<Array<[string, number]> | null>(null)
  const [porSecao, setPorSecao] = useState<Array<[string, number]> | null>(null)
  const [carregandoZona, setCarregandoZona] = useState(false)
  const [carregandoLocal, setCarregandoLocal] = useState(false)
  const [carregandoSecao, setCarregandoSecao] = useState(false)

  // Comparativo
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [detalhes, setDetalhes] = useState<Record<string, DetalheRow[]>>({})
  const [carregandoComp, setCarregandoComp] = useState(false)

  // 1) Carrega filtros (ano/cargo) na primeira vez
  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase.from('v_raiox_filtros') as any).select('*')
      if (error) {
        if (error.code === 'PGRST205' || (error.message ?? '').includes('v_raiox_filtros') || (error.message ?? '').includes('votos_tse')) {
          setErroSchema(true)
        }
        setCarregandoFiltros(false)
        return
      }
      const rows = (data ?? []) as Array<{ ano: number; cargo: string }>
      const cargosNorm = [...new Set(rows.map(r => (r.cargo ?? '').toUpperCase()))].filter(Boolean).sort()
      const anos = [...new Set(rows.map(r => r.ano))].sort((a, b) => b - a)
      setAnosDisponiveis(anos)
      setCargosDisponiveis(cargosNorm)
      if (anos.length > 0) setAno(anos[0])
      if (cargosNorm.length > 0) setCargo(cargosNorm[0])
      setCarregandoFiltros(false)
    })()
  }, [])

  // 2) Quando ano/cargo muda, carrega resumo + top 30
  useEffect(() => {
    if (!ano || !cargo) return
    setCarregandoRanking(true)
    setRanking([])
    setSelecionados([])
    setDetalhes({})
    setPorZona(null)
    setPorLocal(null)
    setPorSecao(null)

    Promise.all([
      (supabase as any).rpc('raiox_resumo', { p_ano: ano, p_cargo: cargo }),
      (supabase as any).rpc('raiox_ranking', { p_ano: ano, p_cargo: cargo, p_limit: 30, p_offset: 0 }),
    ]).then(([r0, r1]) => {
      const re = (r0.data?.[0] ?? null)
      setResumo(re ? {
        total_candidatos: Number(re.total_candidatos),
        total_votos: Number(re.total_votos),
        total_locais: Number(re.total_locais),
        total_secoes: Number(re.total_secoes),
      } : null)
      const rk = ((r1.data ?? []) as RankingRow[]).map(r => ({
        ...r,
        total_votos: Number(r.total_votos),
        total_secoes: Number(r.total_secoes),
      }))
      setRanking(rk)
      setTemMais(rk.length === 30 && (re ? re.total_candidatos > 30 : true))
      // Auto-seleciona candidato fixado
      if (candFixado && rk.some(r => r.numero_candidato === candFixado)) {
        setSelecionados([candFixado])
      }
      setCarregandoRanking(false)
    })
  }, [ano, cargo, candFixado])

  // 3) Autocomplete (debounced server-side search)
  useEffect(() => {
    if (!busca.trim() || !ano || !cargo) { setSugestoes([]); return }
    const handler = setTimeout(() => {
      ;(supabase as any).rpc('raiox_buscar', { p_ano: ano, p_cargo: cargo, p_q: busca.trim() })
        .then((r: { data: RankingRow[] | null }) => {
          setSugestoes((r.data ?? []).map(x => ({ ...x, total_votos: Number(x.total_votos) })))
        })
    }, 250)
    return () => clearTimeout(handler)
  }, [busca, ano, cargo])

  // 4) Carregar mais (paginação)
  async function carregarMais() {
    if (!ano || !cargo) return
    setCarregandoRanking(true)
    const r = await (supabase as any).rpc('raiox_ranking', {
      p_ano: ano, p_cargo: cargo, p_limit: 30, p_offset: ranking.length,
    })
    const novos = ((r.data ?? []) as RankingRow[]).map(x => ({ ...x, total_votos: Number(x.total_votos), total_secoes: Number(x.total_secoes) }))
    setRanking(prev => [...prev, ...novos])
    if (novos.length < 30) setTemMais(false)
    setCarregandoRanking(false)
  }

  // 5) Lazy load das abas quando ativadas
  const carregarZona = useCallback(async () => {
    if (porZona || !ano || !cargo) return
    setCarregandoZona(true)
    const r = await (supabase as any).rpc('raiox_por_zona', { p_ano: ano, p_cargo: cargo })
    setPorZona(((r.data ?? []) as Array<{ zona: number; total_votos: number }>).map(x => [x.zona, Number(x.total_votos)]))
    setCarregandoZona(false)
  }, [porZona, ano, cargo])

  const carregarLocal = useCallback(async () => {
    if (porLocal || !ano || !cargo) return
    setCarregandoLocal(true)
    const r = await (supabase as any).rpc('raiox_por_local', { p_ano: ano, p_cargo: cargo })
    setPorLocal(((r.data ?? []) as Array<{ local_votacao: string; total_votos: number }>).map(x => [x.local_votacao, Number(x.total_votos)]))
    setCarregandoLocal(false)
  }, [porLocal, ano, cargo])

  const carregarSecao = useCallback(async () => {
    if (porSecao || !ano || !cargo) return
    setCarregandoSecao(true)
    const r = await (supabase as any).rpc('raiox_por_secao', { p_ano: ano, p_cargo: cargo })
    setPorSecao(((r.data ?? []) as Array<{ zona: number; secao: number; total_votos: number }>).map(x => [`Zona ${x.zona} · Seção ${x.secao}`, Number(x.total_votos)]))
    setCarregandoSecao(false)
  }, [porSecao, ano, cargo])

  function trocarAba(novo: Foco) {
    setFoco(novo)
    if (novo === 'zonas') carregarZona()
    if (novo === 'locais') carregarLocal()
    if (novo === 'secoes') carregarSecao()
  }

  // 6) Detalhes só pros selecionados
  useEffect(() => {
    if (selecionados.length === 0 || !ano || !cargo) { setDetalhes({}); return }
    setCarregandoComp(true)
    const faltam = selecionados.filter(n => !detalhes[n])
    if (faltam.length === 0) { setCarregandoComp(false); return }
    Promise.all(
      faltam.map(numero =>
        (supabase as any).rpc('raiox_detalhe_candidato', { p_ano: ano, p_cargo: cargo, p_numero: numero })
          .then((r: { data: DetalheRow[] | null }) => [numero, r.data ?? []] as [string, DetalheRow[]])
      )
    ).then(pares => {
      setDetalhes(prev => {
        const out = { ...prev }
        for (const [n, rows] of pares) out[n] = rows
        return out
      })
      setCarregandoComp(false)
    })
  }, [selecionados, ano, cargo, detalhes])

  function toggleSelecionado(numero: string) {
    setSelecionados(s =>
      s.includes(numero) ? s.filter(x => x !== numero) : (s.length < 5 ? [...s, numero] : s)
    )
  }

  // Lista mostrada = ranking carregado + sugestões que não tão nele
  const listaExibida = useMemo(() => {
    if (!busca.trim()) return ranking
    const visto = new Set(sugestoes.map(s => s.numero_candidato))
    return [
      ...sugestoes,
      ...ranking.filter(r => !visto.has(r.numero_candidato))
        .filter(r => r.nome_candidato.toLowerCase().includes(busca.toLowerCase()) ||
                     r.numero_candidato.includes(busca) ||
                     (r.partido_sigla ?? '').toLowerCase().includes(busca.toLowerCase()))
    ]
  }, [ranking, sugestoes, busca])

  const candidatosComparados = useMemo(() =>
    selecionados.map(n => {
      const r = ranking.find(x => x.numero_candidato === n) ?? sugestoes.find(x => x.numero_candidato === n)
      const d = detalhes[n] ?? []
      const porLocal: Record<string, number> = {}
      const porZona: Record<string, number> = {}
      for (const row of d) {
        if (row.local_votacao) porLocal[row.local_votacao] = (porLocal[row.local_votacao] ?? 0) + row.votos
        const k = `Zona ${row.zona}`
        porZona[k] = (porZona[k] ?? 0) + row.votos
      }
      return {
        numero: n,
        nome: r?.nome_candidato ?? n,
        partido: r?.partido_sigla ?? null,
        total: Number(r?.total_votos ?? d.reduce((s, x) => s + x.votos, 0)),
        porZona,
        porLocal,
      }
    }),
    [selecionados, ranking, sugestoes, detalhes]
  )

  function capitalize(s: string) {
    return s.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 flex items-center gap-2">
          <Vote className="w-7 h-7 sm:w-8 sm:h-8 text-marco-azul" /> Raio-X Votos
        </h1>
        <div className="text-xs text-slate-500">Dados oficiais TSE · Limeira-SP</div>
      </div>

      {erroSchema && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4 text-sm text-rose-800">
          ⚠️ Banco sem as views do raio-x. Rode <code>painel/supabase/12-otimizar-raiox.sql</code> no Supabase Studio.
        </div>
      )}

      {carregandoFiltros ? (
        <div className="text-center py-12 text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
      ) : anosDisponiveis.length === 0 && !erroSchema ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
          📭 <strong>Sem dados ainda.</strong> Rode o importador em <code>scripts/votos-limeira/</code>.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl ring-soft p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-bold uppercase">Ano</label>
              <select value={ano} onChange={e => setAno(Number(e.target.value))} className="input">
                {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-bold uppercase">Cargo</label>
              <select value={cargo} onChange={e => setCargo(e.target.value)} className="input">
                {cargosDisponiveis.map(c => <option key={c} value={c}>{capitalize(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-bold uppercase">Buscar candidato</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Nome, número ou partido..."
                  className="input pl-9"
                />
              </div>
            </div>
          </div>

          {resumo && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
              <ResumoCard icon={Users} label="Candidatos" valor={resumo.total_candidatos} cor="bg-emerald-100 text-emerald-600" />
              <ResumoCard icon={Trophy} label="Votos totais" valor={resumo.total_votos} cor="bg-amber-100 text-amber-600" />
              <ResumoCard icon={MapPin} label="Locais" valor={resumo.total_locais} cor="bg-sky-100 text-sky-600" />
              <ResumoCard icon={BarChart3} label="Seções" valor={resumo.total_secoes} cor="bg-purple-100 text-purple-600" />
            </div>
          )}

          {selecionados.length > 0 && (
            <div className="bg-marco-azul/5 border border-marco-azul/20 rounded-2xl p-3 mb-4 flex items-center gap-2 flex-wrap">
              <Scale className="w-4 h-4 text-marco-azul flex-shrink-0" />
              <span className="text-sm text-slate-700"><strong>{selecionados.length}</strong> selecionado(s)</span>
              <div className="flex flex-wrap gap-1 flex-1">
                {selecionados.map(n => {
                  const c = ranking.find(x => x.numero_candidato === n) ?? sugestoes.find(x => x.numero_candidato === n)
                  return (
                    <span key={n} className="inline-flex items-center gap-1 bg-white text-marco-azul text-xs font-bold px-2 py-1 rounded-full">
                      {c?.nome_candidato ?? n}
                      <button onClick={() => toggleSelecionado(n)} className="hover:bg-rose-100 rounded-full">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
              <button onClick={() => setFoco('comparativo')} className="bg-marco-azul text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                Ver comparativo →
              </button>
            </div>
          )}

          <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 ring-soft overflow-x-auto">
            <TabButton ativa={foco === 'candidatos'} onClick={() => trocarAba('candidatos')} icon={Trophy} label="Ranking" />
            <TabButton ativa={foco === 'comparativo'} onClick={() => trocarAba('comparativo')} icon={Scale} label={`Comparar (${selecionados.length})`} />
            <TabButton ativa={foco === 'zonas'} onClick={() => trocarAba('zonas')} icon={BarChart3} label="Zonas" />
            <TabButton ativa={foco === 'locais'} onClick={() => trocarAba('locais')} icon={MapPin} label="Locais" />
            <TabButton ativa={foco === 'secoes'} onClick={() => trocarAba('secoes')} icon={BarChart3} label="Seções" />
          </div>

          {foco === 'candidatos' && (
            <>
              <RankingTable
                lista={listaExibida}
                selecionados={selecionados}
                onToggle={toggleSelecionado}
                candFixado={candFixado}
                carregando={carregandoRanking && ranking.length === 0}
              />
              {!busca.trim() && temMais && (
                <button
                  onClick={carregarMais}
                  disabled={carregandoRanking}
                  className="w-full mt-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-lg text-sm disabled:opacity-50"
                >
                  {carregandoRanking ? 'Carregando...' : `Carregar mais (${ranking.length} de ${resumo?.total_candidatos ?? '?'})`}
                </button>
              )}
            </>
          )}
          {foco === 'comparativo' && (
            carregandoComp ? (
              <div className="text-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : (
              <ComparativoView candidatos={candidatosComparados} />
            )
          )}
          {foco === 'zonas' && (
            carregandoZona ? (
              <div className="text-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : (
              <BarChartView titulo="Votos por zona eleitoral" dados={(porZona ?? []).map(([z, v]) => [`Zona ${z}`, v])} cor="bg-amber-500" />
            )
          )}
          {foco === 'locais' && (
            carregandoLocal ? (
              <div className="text-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : (
              <BarChartView titulo="Votos por local de votação" dados={porLocal ?? []} cor="bg-sky-500" />
            )
          )}
          {foco === 'secoes' && (
            carregandoSecao ? (
              <div className="text-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : (
              <BarChartView titulo="Top 200 seções por votos" dados={porSecao ?? []} cor="bg-purple-500" />
            )
          )}
        </>
      )}
    </div>
  )
}

function ResumoCard({ icon: Icon, label, valor, cor }: { icon: typeof Vote; label: string; valor: number; cor: string }) {
  return (
    <div className="bg-white rounded-2xl ring-soft p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${cor}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-bold truncate">{label}</div>
        <div className="text-base sm:text-2xl font-black text-slate-800">{valor.toLocaleString('pt-BR')}</div>
      </div>
    </div>
  )
}

function TabButton({ ativa, onClick, icon: Icon, label }: { ativa: boolean; onClick: () => void; icon: typeof Trophy; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
        ativa ? 'bg-marco-azul text-white' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {label}
    </button>
  )
}

function RankingTable({ lista, selecionados, onToggle, candFixado, carregando }: {
  lista: RankingRow[]
  selecionados: string[]
  onToggle: (numero: string) => void
  candFixado: string
  carregando: boolean
}) {
  if (carregando) {
    return (
      <div className="bg-white rounded-2xl ring-soft p-12 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto" />
      </div>
    )
  }
  return (
    <div className="bg-white rounded-2xl ring-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-3 text-left w-10"></th>
              <th className="px-2 py-3 text-left w-10">#</th>
              <th className="px-3 py-3 text-left">Candidato</th>
              <th className="px-3 py-3 text-left">Número</th>
              <th className="px-3 py-3 text-left">Partido</th>
              <th className="px-3 py-3 text-right">Votos</th>
              <th className="px-3 py-3 text-right">Seções</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lista.map((c, i) => {
              const sel = selecionados.includes(c.numero_candidato)
              const fixado = candFixado && c.numero_candidato === candFixado
              return (
                <tr key={c.numero_candidato} className={fixado ? 'bg-marco-amarelo/20 hover:bg-marco-amarelo/30' : sel ? 'bg-marco-azul/5' : i < 9 ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-slate-50'}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => onToggle(c.numero_candidato)}
                      disabled={!sel && selecionados.length >= 5}
                      className="w-4 h-4 accent-marco-azul"
                    />
                  </td>
                  <td className="px-2 py-3 font-black text-slate-400">{i + 1}</td>
                  <td className="px-3 py-3 font-semibold text-slate-800 flex items-center gap-1">
                    {fixado && <Star className="w-3 h-3 text-marco-amarelo fill-marco-amarelo" />}
                    {c.nome_candidato}
                  </td>
                  <td className="px-3 py-3 font-mono text-slate-600">{c.numero_candidato}</td>
                  <td className="px-3 py-3 text-slate-600">{c.partido_sigla ?? '—'}</td>
                  <td className="px-3 py-3 text-right font-bold text-marco-azul">{Number(c.total_votos).toLocaleString('pt-BR')}</td>
                  <td className="px-3 py-3 text-right text-slate-500">{c.total_secoes}</td>
                </tr>
              )
            })}
            {lista.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">Sem resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface CompCandidato {
  numero: string
  nome: string
  partido: string | null
  total: number
  porZona: Record<string, number>
  porLocal: Record<string, number>
}

function ComparativoView({ candidatos }: { candidatos: CompCandidato[] }) {
  if (candidatos.length === 0) {
    return (
      <div className="bg-white rounded-2xl ring-soft p-12 text-center text-slate-400">
        <Scale className="w-12 h-12 mx-auto mb-3" />
        <div className="font-semibold">Selecione candidatos no ranking</div>
        <div className="text-xs mt-1">Marque até 5 candidatos pra comparar lado a lado.</div>
      </div>
    )
  }
  const todasZonas = [...new Set(candidatos.flatMap(c => Object.keys(c.porZona)))].sort()
  const todosLocais = [...new Set(candidatos.flatMap(c => Object.keys(c.porLocal)))]
    .map(l => ({ local: l, total: candidatos.reduce((s, c) => s + (c.porLocal[l] ?? 0), 0) }))
    .sort((a, b) => b.total - a.total).slice(0, 20).map(x => x.local)
  const maxTotal = Math.max(...candidatos.map(c => c.total), 1)
  const cores = ['bg-marco-azul', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500']
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl ring-soft p-5">
        <h3 className="font-bold text-slate-800 mb-3">Total de votos</h3>
        <div className="space-y-3">
          {candidatos.map((c, i) => (
            <div key={c.numero}>
              <div className="flex items-center justify-between mb-1 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-3 h-3 rounded-full ${cores[i % cores.length]}`} />
                  <span className="font-semibold truncate">{c.nome}</span>
                  <span className="text-xs text-slate-400">({c.partido ?? '—'} · {c.numero})</span>
                </div>
                <span className="font-black text-marco-azul ml-2">{c.total.toLocaleString('pt-BR')}</span>
              </div>
              <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className={`${cores[i % cores.length]} h-full transition-all`} style={{ width: `${(c.total / maxTotal) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl ring-soft p-5">
        <h3 className="font-bold text-slate-800 mb-3">Por zona eleitoral</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead className="bg-slate-50 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Zona</th>
                {candidatos.map((c, i) => (
                  <th key={c.numero} className="px-3 py-2 text-right">
                    <span className="flex items-center gap-1 justify-end">
                      <div className={`w-2 h-2 rounded-full ${cores[i % cores.length]}`} />{c.numero}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {todasZonas.map(z => (
                <tr key={z} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-semibold">{z}</td>
                  {candidatos.map(c => (
                    <td key={c.numero} className="px-3 py-2 text-right font-mono">{(c.porZona[z] ?? 0).toLocaleString('pt-BR')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white rounded-2xl ring-soft p-5">
        <h3 className="font-bold text-slate-800 mb-3">Top 20 locais de votação</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Local</th>
                {candidatos.map((c, i) => (
                  <th key={c.numero} className="px-3 py-2 text-right">
                    <span className="flex items-center gap-1 justify-end">
                      <div className={`w-2 h-2 rounded-full ${cores[i % cores.length]}`} />{c.numero}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {todosLocais.map(l => (
                <tr key={l} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-xs truncate max-w-[280px]" title={l}>{l}</td>
                  {candidatos.map(c => (
                    <td key={c.numero} className="px-3 py-2 text-right font-mono text-xs">{(c.porLocal[l] ?? 0).toLocaleString('pt-BR')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function BarChartView({ titulo, dados, cor }: { titulo: string; dados: Array<[string | number, number]>; cor: string }) {
  const max = Math.max(...dados.map(d => d[1]), 1)
  return (
    <div className="bg-white rounded-2xl ring-soft p-4 sm:p-5">
      <h3 className="font-bold text-slate-800 mb-4">{titulo}</h3>
      {dados.length === 0 ? (
        <div className="text-sm text-slate-400 text-center py-8">Sem dados</div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {dados.map(([k, v]) => (
            <div key={String(k)} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="w-32 sm:w-64 truncate text-slate-700" title={String(k)}>{String(k)}</div>
              <div className="flex-1 bg-slate-100 rounded-full h-5 sm:h-6 overflow-hidden">
                <div
                  className={`${cor} h-full transition-all flex items-center justify-end pr-2 text-white text-[10px] sm:text-xs font-bold`}
                  style={{ width: `${(v / max) * 100}%`, minWidth: 36 }}
                >
                  {v.toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
