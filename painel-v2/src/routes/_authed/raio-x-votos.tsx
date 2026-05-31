import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { Vote, Loader2, Trophy, BarChart3, MapPin, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
}

function RaioXPage() {
  const [carregando, setCarregando] = useState(true)
  const [erroSchema, setErroSchema] = useState(false)
  const [linhas, setLinhas] = useState<VotoRow[]>([])

  const [ano, setAno] = useState<number | ''>('')
  const [cargo, setCargo] = useState<string>('')
  const [anosDisponiveis, setAnosDisponiveis] = useState<number[]>([])
  const [cargosDisponiveis, setCargosDisponiveis] = useState<string[]>([])
  const [foco, setFoco] = useState<'candidatos' | 'secoes' | 'locais'>('candidatos')
  const [busca, setBusca] = useState('')

  // Carrega anos/cargos disponíveis primeiro
  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase.from('votos_tse') as any)
        .select('ano, cargo')
        .limit(10000)
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

  // Carrega votos filtrados
  useEffect(() => {
    if (!ano || !cargo) return
    setCarregando(true)
    supabase
      .from('votos_tse')
      .select('*')
      .eq('ano', ano)
      .eq('cargo', cargo)
      .limit(50000)
      .then(({ data, error }) => {
        if (!error) setLinhas((data as VotoRow[]) ?? [])
        setCarregando(false)
      })
  }, [ano, cargo])

  // Ranking de candidatos
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
        }
      }
      mapa[r.numero_candidato].total += r.votos
      mapa[r.numero_candidato].secoes += 1
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

  // Top locais
  const porLocal = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const r of linhas) {
      const k = r.local_votacao ?? 'Sem local'
      mapa[k] = (mapa[k] ?? 0) + r.votos
    }
    return Object.entries(mapa).sort((a, b) => b[1] - a[1])
  }, [linhas])

  // Top seções
  const porSecao = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const r of linhas) {
      const k = `Zona ${r.zona} · Seção ${r.secao}`
      mapa[k] = (mapa[k] ?? 0) + r.votos
    }
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]).slice(0, 30)
  }, [linhas])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 flex items-center gap-2">
          <Vote className="w-8 h-8 text-marco-azul" /> Raio-X Votos
        </h1>
        <div className="text-xs text-slate-500">
          Dados oficiais do TSE · Limeira-SP
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
cp .env.example .env       # preencha SUPABASE_SERVICE_KEY
npm install
node index.js --ano 2024 --cargo VEREADOR`}
          </pre>
          <p className="mt-2 text-xs">
            Veja <code>scripts/votos-limeira/README.md</code> pra mais detalhes.
          </p>
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

          {/* Resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <ResumoCard icon={Users} label="Candidatos" valor={ranking.length} cor="bg-emerald-100 text-emerald-600" />
            <ResumoCard icon={Trophy} label="Votos totais" valor={linhas.reduce((s, r) => s + r.votos, 0)} cor="bg-amber-100 text-amber-600" />
            <ResumoCard icon={MapPin} label="Locais únicos" valor={porLocal.length} cor="bg-sky-100 text-sky-600" />
            <ResumoCard icon={BarChart3} label="Seções" valor={[...new Set(linhas.map(r => `${r.zona}-${r.secao}`))].length} cor="bg-purple-100 text-purple-600" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 ring-soft overflow-x-auto">
            <TabButton ativa={foco === 'candidatos'} onClick={() => setFoco('candidatos')} icon={Trophy} label="Ranking" />
            <TabButton ativa={foco === 'locais'} onClick={() => setFoco('locais')} icon={MapPin} label={`Locais (${porLocal.length})`} />
            <TabButton ativa={foco === 'secoes'} onClick={() => setFoco('secoes')} icon={BarChart3} label="Seções" />
          </div>

          {carregando ? (
            <div className="text-center py-12 text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
          ) : foco === 'candidatos' ? (
            <RankingTable lista={rankingFiltrado} />
          ) : foco === 'locais' ? (
            <BarChart titulo="Votos por local" dados={porLocal} cor="bg-sky-500" />
          ) : (
            <BarChart titulo="Top 30 seções por votos" dados={porSecao} cor="bg-purple-500" />
          )}
        </>
      )}
    </div>
  )
}

function ResumoCard({ icon: Icon, label, valor, cor }: { icon: typeof Vote; label: string; valor: number; cor: string }) {
  return (
    <div className="bg-white rounded-2xl ring-soft p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${cor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-[10px] text-slate-500 uppercase font-bold">{label}</div>
        <div className="text-2xl font-black text-slate-800">{valor.toLocaleString('pt-BR')}</div>
      </div>
    </div>
  )
}

function TabButton({ ativa, onClick, icon: Icon, label }: { ativa: boolean; onClick: () => void; icon: typeof Trophy; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
        ativa ? 'bg-marco-azul text-white' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  )
}

function RankingTable({ lista }: { lista: ResumoCandidato[] }) {
  return (
    <div className="bg-white rounded-2xl ring-soft overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-3 text-left w-12">#</th>
            <th className="px-4 py-3 text-left">Candidato</th>
            <th className="px-4 py-3 text-left">Número</th>
            <th className="px-4 py-3 text-left">Partido</th>
            <th className="px-4 py-3 text-right">Votos</th>
            <th className="px-4 py-3 text-right">Seções</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lista.slice(0, 200).map((c, i) => (
            <tr key={c.numero} className={i < 9 ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-slate-50'}>
              <td className="px-4 py-3 font-black text-slate-400">{i + 1}</td>
              <td className="px-4 py-3 font-semibold text-slate-800">{c.nome}</td>
              <td className="px-4 py-3 font-mono text-slate-600">{c.numero}</td>
              <td className="px-4 py-3 text-slate-600">{c.partido ?? '—'}</td>
              <td className="px-4 py-3 text-right font-bold text-marco-azul">{c.total.toLocaleString('pt-BR')}</td>
              <td className="px-4 py-3 text-right text-slate-500">{c.secoes}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {lista.length > 200 && (
        <div className="px-4 py-3 text-center text-xs text-slate-500 bg-slate-50">
          Mostrando 200 de {lista.length} candidatos. Use a busca pra filtrar.
        </div>
      )}
    </div>
  )
}

function BarChart({ titulo, dados, cor }: { titulo: string; dados: [string, number][]; cor: string }) {
  const max = Math.max(...dados.map(d => d[1]), 1)
  return (
    <div className="bg-white rounded-2xl ring-soft p-5">
      <h3 className="font-bold text-slate-800 mb-4">{titulo}</h3>
      {dados.length === 0 ? (
        <div className="text-sm text-slate-400 text-center py-8">Sem dados</div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {dados.map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 text-sm">
              <div className="w-48 sm:w-64 truncate text-slate-700">{k}</div>
              <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                <div
                  className={`${cor} h-full transition-all flex items-center justify-end pr-2 text-white text-xs font-bold`}
                  style={{ width: `${(v / max) * 100}%`, minWidth: 40 }}
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
