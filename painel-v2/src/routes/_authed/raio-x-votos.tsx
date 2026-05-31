import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { Vote, Loader2, Trophy, BarChart3, MapPin, Users, Scale, X, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useConfig } from '@/features/config/hooks'

export const Route = createFileRoute('/_authed/raio-x-votos')({
  component: RaioXPage,
})

interface VotoRow {
  id: number
  ano: number
  turno: number
  cargo: string
  municipio: string
  municipio_codigo: string
  zona: number
  secao: number
  local_votacao: string | null
  local_endereco: string | null
  numero_candidato: string
  nome_candidato: string
  partido_sigla: string | null
  votos: number
}

interface ResumoCandidato {
  numero: string
  nome: string
  partido: string | null
  total: number
  secoes: number
  porLocal: Record<string, number>
  porZona: Record<string, number>
}

type Foco = 'candidatos' | 'comparativo' | 'locais' | 'zonas' | 'secoes'

function RaioXPage() {
  const { data: config } = useConfig()
  const candFixado = config?.candidato_fixado_numero?.trim() ?? ''

  const [carregando, setCarregando] = useState(true)
  const [erroSchema, setErroSchema] = useState(false)
  const [linhas, setLinhas] = useState<VotoRow[]>([])

  const [ano, setAno] = useState<number | ''>('')
  const [cargo, setCargo] = useState<string>('')
  const [anosDisponiveis, setAnosDisponiveis] = useState<number[]>([])
  const [cargosDisponiveis, setCargosDisponiveis] = useState<string[]>([])
  const [foco, setFoco] = useState<Foco>('candidatos')
  const [busca, setBusca] = useState('')
  const [selecionados, setSelecionados] = useState<string[]>([])

  // Carrega ano/cargo disponíveis
  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase.from('votos_tse') as any)
        .select('ano, cargo')
        .limit(50000)
      if (error) {
        if (error.code === 'PGRST205' || (error.message ?? '').includes('votos_tse')) {
          setErroSchema(true)
        }
        setCarregando(false)
        return
      }
      const rows = (data ?? []) as Array<{ ano: number; cargo: string }>
      const anos = [...new Set(rows.map(r => r.ano))].sort((a, b) => b - a)
      const cargos = [...new Set(rows.map(r => r.cargo))].sort()
      setAnosDisponiveis(anos)
      setCargosDisponiveis(cargos)
      if (anos.length > 0 && ano === '') setAno(anos[0])
      if (cargos.length > 0 && !cargo) setCargo(cargos[0])
      setCarregando(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ano || !cargo) return
    setCarregando(true)
    ;(supabase.from('votos_tse') as any)
      .select('*')
      .eq('ano', ano)
      .eq('cargo', cargo)
      .limit(50000)
      .then(({ data, error }: { data: VotoRow[] | null; error: { message?: string } | null }) => {
        if (!error) {
          const rows = data ?? []
          setLinhas(rows)
          // Auto-seleciona o candidato fixado se ele aparecer nesses dados
          if (candFixado && rows.some(r => r.numero_candidato === candFixado)) {
            setSelecionados([candFixado])
          } else {
            setSelecionados([])
          }
        }
        setCarregando(false)
      })
  }, [ano, cargo, candFixado])

  // Ranking + breakdown por local/zona
  const ranking = useMemo<ResumoCandidato[]>(() => {
    const mapa: Record<string, ResumoCandidato> = {}
    for (const r of linhas) {
      if (!mapa[r.numero_candidato]) {
        mapa[r.numero_candidato] = {
          numero: r.numero_candidato,
          nome: r.nome_candidato,
          partido: r.partido_sigla,
          total: 0,
          secoes: 0,
          porLocal: {},
          porZona: {},
        }
      }
      const c = mapa[r.numero_candidato]
      c.total += r.votos
      c.secoes += 1
      if (r.local_votacao) c.porLocal[r.local_votacao] = (c.porLocal[r.local_votacao] ?? 0) + r.votos
      const k = `Zona ${r.zona}`
      c.porZona[k] = (c.porZona[k] ?? 0) + r.votos
    }
    return Object.values(mapa).sort((a, b) => b.total - a.total)
  }, [linhas])

  const rankingFiltrado = useMemo(() => {
    const q = busca.toLowerCase().trim()
    if (!q) return ranking
    return ranking.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      c.numero.includes(q) ||
      (c.partido ?? '').toLowerCase().includes(q)
    )
  }, [ranking, busca])

  const porLocal = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const r of linhas) {
      const k = r.local_votacao ?? 'Sem local'
      mapa[k] = (mapa[k] ?? 0) + r.votos
    }
    return Object.entries(mapa).sort((a, b) => b[1] - a[1])
  }, [linhas])

  const porZona = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const r of linhas) {
      const k = `Zona ${r.zona}`
      mapa[k] = (mapa[k] ?? 0) + r.votos
    }
    return Object.entries(mapa).sort((a, b) => b[1] - a[1])
  }, [linhas])

  const porSecao = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const r of linhas) {
      const k = `Zona ${r.zona} · Seção ${r.secao}`
      mapa[k] = (mapa[k] ?? 0) + r.votos
    }
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]).slice(0, 50)
  }, [linhas])

  function toggleSelecionado(numero: string) {
    setSelecionados(s =>
      s.includes(numero) ? s.filter(x => x !== numero) : (s.length < 5 ? [...s, numero] : s)
    )
  }

  const candidatosComparados = useMemo(() =>
    ranking.filter(c => selecionados.includes(c.numero)),
    [ranking, selecionados]
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 flex items-center gap-2">
          <Vote className="w-7 h-7 sm:w-8 sm:h-8 text-marco-azul" /> Raio-X Votos
        </h1>
        <div className="text-xs text-slate-500">
          Dados oficiais TSE · Limeira-SP
        </div>
      </div>

      {erroSchema && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4 text-sm text-rose-800">
          ⚠️ A tabela <code>votos_tse</code> não existe. Rode <code>painel/supabase/11-votos-tse.sql</code>.
        </div>
      )}

      {anosDisponiveis.length === 0 && !erroSchema && !carregando && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
          📭 <strong>Sem dados ainda.</strong>
          <p className="mt-2">Pra importar, na VM rode:</p>
          <pre className="bg-slate-900 text-emerald-300 text-xs p-3 rounded-lg mt-2 overflow-x-auto">
{`cd scripts/votos-limeira
cp .env.example .env
npm install
node index.js --ano 2024 --cargo VEREADOR`}
          </pre>
        </div>
      )}

      {anosDisponiveis.length > 0 && (
        <>
          {/* Filtros */}
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
                {cargosDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-bold uppercase">Buscar candidato</label>
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Nome, número ou partido..."
                className="input"
              />
            </div>
          </div>

          {/* Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
            <ResumoCard icon={Users} label="Candidatos" valor={ranking.length} cor="bg-emerald-100 text-emerald-600" />
            <ResumoCard icon={Trophy} label="Votos totais" valor={linhas.reduce((s, r) => s + r.votos, 0)} cor="bg-amber-100 text-amber-600" />
            <ResumoCard icon={MapPin} label="Locais" valor={porLocal.length} cor="bg-sky-100 text-sky-600" />
            <ResumoCard icon={BarChart3} label="Seções" valor={porSecao.length > 0 ? [...new Set(linhas.map(r => `${r.zona}-${r.secao}`))].length : 0} cor="bg-purple-100 text-purple-600" />
          </div>

          {/* Comparativo selecionados */}
          {selecionados.length > 0 && (
            <div className="bg-marco-azul/5 border border-marco-azul/20 rounded-2xl p-3 mb-4 flex items-center gap-2 flex-wrap">
              <Scale className="w-4 h-4 text-marco-azul flex-shrink-0" />
              <span className="text-sm text-slate-700">
                <strong>{selecionados.length}</strong> selecionado(s) pra comparar
              </span>
              <div className="flex flex-wrap gap-1 flex-1">
                {selecionados.map(n => {
                  const c = ranking.find(x => x.numero === n)
                  return (
                    <span key={n} className="inline-flex items-center gap-1 bg-white text-marco-azul text-xs font-bold px-2 py-1 rounded-full">
                      {c?.nome ?? n}
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

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 ring-soft overflow-x-auto">
            <TabButton ativa={foco === 'candidatos'} onClick={() => setFoco('candidatos')} icon={Trophy} label="Ranking" />
            <TabButton ativa={foco === 'comparativo'} onClick={() => setFoco('comparativo')} icon={Scale} label={`Comparar (${selecionados.length})`} />
            <TabButton ativa={foco === 'zonas'} onClick={() => setFoco('zonas')} icon={BarChart3} label={`Zonas (${porZona.length})`} />
            <TabButton ativa={foco === 'locais'} onClick={() => setFoco('locais')} icon={MapPin} label={`Locais (${porLocal.length})`} />
            <TabButton ativa={foco === 'secoes'} onClick={() => setFoco('secoes')} icon={BarChart3} label="Seções" />
          </div>

          {carregando ? (
            <div className="text-center py-12 text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
          ) : foco === 'candidatos' ? (
            <RankingTable lista={rankingFiltrado} selecionados={selecionados} onToggle={toggleSelecionado} candFixado={candFixado} />
          ) : foco === 'comparativo' ? (
            <ComparativoView candidatos={candidatosComparados} />
          ) : foco === 'zonas' ? (
            <BarChartView titulo="Votos por zona eleitoral" dados={porZona} cor="bg-amber-500" />
          ) : foco === 'locais' ? (
            <BarChartView titulo="Votos por local de votação" dados={porLocal} cor="bg-sky-500" />
          ) : (
            <BarChartView titulo="Top 50 seções por votos" dados={porSecao} cor="bg-purple-500" />
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

function RankingTable({ lista, selecionados, onToggle, candFixado }: {
  lista: ResumoCandidato[]
  selecionados: string[]
  onToggle: (numero: string) => void
  candFixado: string
}) {
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
            {lista.slice(0, 200).map((c, i) => {
              const sel = selecionados.includes(c.numero)
              const fixado = candFixado && c.numero === candFixado
              return (
                <tr key={c.numero} className={fixado ? 'bg-marco-amarelo/20 hover:bg-marco-amarelo/30' : sel ? 'bg-marco-azul/5' : i < 9 ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-slate-50'}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => onToggle(c.numero)}
                      disabled={!sel && selecionados.length >= 5}
                      className="w-4 h-4 accent-marco-azul"
                      title={selecionados.length >= 5 && !sel ? 'Máximo 5 candidatos' : ''}
                    />
                  </td>
                  <td className="px-2 py-3 font-black text-slate-400">{i + 1}</td>
                  <td className="px-3 py-3 font-semibold text-slate-800 flex items-center gap-1">
                    {fixado && <Star className="w-3 h-3 text-marco-amarelo fill-marco-amarelo" />}
                    {c.nome}
                  </td>
                  <td className="px-3 py-3 font-mono text-slate-600">{c.numero}</td>
                  <td className="px-3 py-3 text-slate-600">{c.partido ?? '—'}</td>
                  <td className="px-3 py-3 text-right font-bold text-marco-azul">{c.total.toLocaleString('pt-BR')}</td>
                  <td className="px-3 py-3 text-right text-slate-500">{c.secoes}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {lista.length > 200 && (
        <div className="px-4 py-3 text-center text-xs text-slate-500 bg-slate-50">
          Mostrando 200 de {lista.length} candidatos. Use a busca pra filtrar.
        </div>
      )}
    </div>
  )
}

function ComparativoView({ candidatos }: { candidatos: ResumoCandidato[] }) {
  if (candidatos.length === 0) {
    return (
      <div className="bg-white rounded-2xl ring-soft p-12 text-center text-slate-400">
        <Scale className="w-12 h-12 mx-auto mb-3" />
        <div className="font-semibold">Selecione candidatos no ranking</div>
        <div className="text-xs mt-1">Marque até 5 candidatos pra comparar votos lado a lado.</div>
      </div>
    )
  }

  // Top zonas/locais unindo todos os comparados
  const todasZonas = [...new Set(candidatos.flatMap(c => Object.keys(c.porZona)))].sort()
  const todosLocais = [...new Set(candidatos.flatMap(c => Object.keys(c.porLocal)))]
    .map(l => ({ local: l, total: candidatos.reduce((s, c) => s + (c.porLocal[l] ?? 0), 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)
    .map(x => x.local)

  const maxTotal = Math.max(...candidatos.map(c => c.total), 1)
  const cores = ['bg-marco-azul', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500']

  return (
    <div className="space-y-4">
      {/* Total geral */}
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

      {/* Por zona */}
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
                      <div className={`w-2 h-2 rounded-full ${cores[i % cores.length]}`} />
                      {c.numero}
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
                    <td key={c.numero} className="px-3 py-2 text-right font-mono">
                      {(c.porZona[z] ?? 0).toLocaleString('pt-BR')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top locais */}
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
                      <div className={`w-2 h-2 rounded-full ${cores[i % cores.length]}`} />
                      {c.numero}
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
                    <td key={c.numero} className="px-3 py-2 text-right font-mono text-xs">
                      {(c.porLocal[l] ?? 0).toLocaleString('pt-BR')}
                    </td>
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

function BarChartView({ titulo, dados, cor }: { titulo: string; dados: [string, number][]; cor: string }) {
  const max = Math.max(...dados.map(d => d[1]), 1)
  return (
    <div className="bg-white rounded-2xl ring-soft p-4 sm:p-5">
      <h3 className="font-bold text-slate-800 mb-4">{titulo}</h3>
      {dados.length === 0 ? (
        <div className="text-sm text-slate-400 text-center py-8">Sem dados</div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {dados.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="w-32 sm:w-64 truncate text-slate-700" title={k}>{k}</div>
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
