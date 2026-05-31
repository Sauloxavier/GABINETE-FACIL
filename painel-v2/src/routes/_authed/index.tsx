import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, useEffect } from 'react'
import { Users, MessageSquare, TrendingUp, FileText, BarChart3, Map, Vote, MapPin, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/auth'
import { useEleitores } from '@/features/eleitores/hooks'
import { useDemandas } from '@/features/demandas/hooks'
import { useEleitoradoAtual } from '@/features/tre-sp/hooks'
import { useConfig } from '@/features/config/hooks'

export const Route = createFileRoute('/_authed/')({
  component: InicioPage,
})

const PERIODOS = [
  { id: '7',  dias: 7,  label: 'Últimos 7 dias' },
  { id: '15', dias: 15, label: 'Últimos 15 dias' },
  { id: '30', dias: 30, label: 'Últimos 30 dias' },
  { id: '60', dias: 60, label: 'Últimos 60 dias' },
  { id: 'tudo', dias: 0, label: 'Tudo' },
] as const

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function useCounters() {
  return useQuery({
    queryKey: ['counters'],
    queryFn: async () => {
      const hoje = new Date().toISOString().slice(0, 10)
      const trintaDiasAtras = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

      const [eleitoresRes, atendHojeRes, abertasRes, resolvidasRes, conquistadosRes] = await Promise.all([
        supabase.from('eleitores').select('*', { count: 'exact', head: true }),
        supabase.from('demandas').select('*', { count: 'exact', head: true }).eq('data', hoje),
        supabase.from('demandas').select('*', { count: 'exact', head: true }).in('status', ['Aberta', 'Em andamento']),
        supabase.from('demandas').select('*', { count: 'exact', head: true }).eq('status', 'Resolvida').gte('data', trintaDiasAtras),
        supabase.from('eleitores').select('*', { count: 'exact', head: true }).eq('envolvimento', 'Conquistado'),
      ])

      return {
        eleitores: eleitoresRes.count ?? 0,
        atendHoje: atendHojeRes.count ?? 0,
        abertas: abertasRes.count ?? 0,
        resolvidasMes: resolvidasRes.count ?? 0,
        conquistados: conquistadosRes.count ?? 0,
      }
    },
  })
}

function InicioPage() {
  const { perfil } = useAuth()
  const { data: counters, isLoading } = useCounters()
  const { data: eleitores } = useEleitores()
  const { data: demandas } = useDemandas()
  const { data: eleitoradoAtualSP } = useEleitoradoAtual()
  const { data: config } = useConfig()
  const candFixadoNum = config?.candidato_fixado_numero?.trim() ?? ''
  const candFixadoNome = config?.candidato_fixado_nome?.trim() ?? ''
  const [periodo, setPeriodo] = useState<string>('30')
  const [historicoCand, setHistoricoCand] = useState<Array<{ ano: number; cargo: string; votos: number; nome: string }>>([])

  useEffect(() => {
    if (!candFixadoNum) { setHistoricoCand([]); return }
    ;(supabase.from('votos_tse') as any)
      .select('ano, cargo, votos, nome_candidato')
      .eq('numero_candidato', candFixadoNum)
      .limit(50000)
      .then(({ data }: { data: Array<{ ano: number; cargo: string; votos: number; nome_candidato: string }> | null }) => {
        const agreg: Record<string, { ano: number; cargo: string; votos: number; nome: string }> = {}
        for (const r of data ?? []) {
          const k = `${r.ano}-${r.cargo}`
          if (!agreg[k]) agreg[k] = { ano: r.ano, cargo: r.cargo, votos: 0, nome: r.nome_candidato }
          agreg[k].votos += r.votos
        }
        setHistoricoCand(Object.values(agreg).sort((a, b) => b.ano - a.ano))
      })
  }, [candFixadoNum])

  // Eleitorado de SP — somar Capital + Interior do ano vigente
  const eleitoradoSP = useMemo(() => {
    if (!eleitoradoAtualSP) return null
    const ano = Math.max(...eleitoradoAtualSP.map(e => e.ano), 0)
    const linhas = eleitoradoAtualSP.filter(e => e.ano === ano)
    if (linhas.length === 0) return null
    return {
      ano,
      aptos: linhas.reduce((s, e) => s + e.aptos, 0),
      locais: linhas.reduce((s, e) => s + e.locaisVotacao, 0),
      secoes: linhas.reduce((s, e) => s + e.secoes, 0),
      zonas: linhas.reduce((s, e) => s + e.zonas, 0),
    }
  }, [eleitoradoAtualSP])

  const primeiroNome = (perfil?.nome ?? 'MARCO').split(' ')[0].toUpperCase()

  const dadosPeriodo = useMemo(() => {
    const dias = PERIODOS.find(p => p.id === periodo)?.dias ?? 0
    const corte = dias > 0 ? new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10) : ''
    const dems = (demandas ?? []).filter(d => !corte || (d.data ?? '') >= corte)
    return dems
  }, [demandas, periodo])

  const porBairro = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const d of dadosPeriodo) {
      const e = eleitores?.find(x => x.id === d.eleitor_id)
      const b = e?.bairro ?? 'Sem bairro'
      mapa[b] = (mapa[b] ?? 0) + 1
    }
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [dadosPeriodo, eleitores])

  const porTipo = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const d of dadosPeriodo) {
      mapa[d.tipo] = (mapa[d.tipo] ?? 0) + 1
    }
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [dadosPeriodo])

  const porStatus = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const d of dadosPeriodo) {
      mapa[d.status] = (mapa[d.status] ?? 0) + 1
    }
    const lab: Record<string, string> = {
      'Aberta': 'Não iniciado',
      'Em andamento': 'Pendência',
      'Resolvida': 'Concluída',
      'Cancelada': 'Cancelada',
    }
    return Object.entries(mapa).map(([k, v]) => ({ label: lab[k] ?? k, valor: v, status: k }))
  }, [dadosPeriodo])

  const porEnvolvimento = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const e of eleitores ?? []) {
      const env = e.envolvimento ?? 'Não trabalhado'
      mapa[env] = (mapa[env] ?? 0) + 1
    }
    return ['Não trabalhado', 'Em prospecção', 'Conquistado', 'Incerto', 'Perdido'].map(env => ({
      label: env,
      valor: mapa[env] ?? 0,
    }))
  }, [eleitores])

  const porMes = useMemo(() => {
    const mapa: Record<string, number> = {}
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const ano = new Date().getFullYear()
    for (let i = 0; i < 12; i++) mapa[`${ano}-${String(i + 1).padStart(2, '0')}`] = 0
    for (const e of eleitores ?? []) {
      const m = (e.criado_em ?? '').slice(0, 7)
      if (m in mapa) mapa[m] = (mapa[m] ?? 0) + 1
    }
    return Object.entries(mapa).map(([k, v]) => ({
      mes: meses[Number(k.split('-')[1]) - 1],
      valor: v,
    }))
  }, [eleitores])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <div className="text-sm text-slate-500">
            {saudacao()}, <span className="font-bold text-marco-azul uppercase">{primeiroNome}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 mt-1">Dashboard</h1>
        </div>
        <select
          value={periodo}
          onChange={e => setPeriodo(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold self-start"
        >
          {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <CounterCard label="Eleitores" valor={counters?.eleitores} loading={isLoading} cor="emerald" />
        <CounterCard label="Conquistados" valor={counters?.conquistados} loading={isLoading} cor="purple" />
        <CounterCard label="Atendimentos hoje" valor={counters?.atendHoje} loading={isLoading} cor="sky" />
        <CounterCard label="Em aberto" valor={counters?.abertas} loading={isLoading} cor="amber" />
        <CounterCard label="Resolvidos (30d)" valor={counters?.resolvidasMes} loading={isLoading} cor="rose" />
      </div>

      {/* Widget: eleitorado SP (dados ao vivo do TRE-SP) */}
      {eleitoradoSP && (
        <div className="bg-white rounded-2xl ring-soft p-5 mb-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <MapPin className="w-5 h-5 text-marco-azul" />
            <h3 className="font-bold text-slate-800">Eleitorado de São Paulo · {eleitoradoSP.ano}</h3>
            <span className="text-[10px] text-slate-400 font-mono">fonte: TRE-SP</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniMetric label="Eleitores aptos" valor={eleitoradoSP.aptos} cor="text-emerald-600" />
            <MiniMetric label="Locais de votação" valor={eleitoradoSP.locais} cor="text-sky-600" />
            <MiniMetric label="Seções eleitorais" valor={eleitoradoSP.secoes} cor="text-purple-600" />
            <MiniMetric label="Zonas eleitorais" valor={eleitoradoSP.zonas} cor="text-amber-600" />
          </div>
          <div className="text-[11px] text-slate-500 mt-3">
            💡 Limeira é <strong>zona eleitoral 066</strong>. Use no /raio-x-votos pra filtrar.
          </div>
        </div>
      )}

      {/* Destaque: Raio-X Votos */}
      <Link
        to="/raio-x-votos"
        className="block bg-gradient-to-br from-marco-azul via-marco-azul-esc to-purple-700 text-white rounded-3xl p-5 sm:p-6 mb-6 hover:shadow-xl transition group"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
            <Vote className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-block bg-marco-amarelo text-marco-azul-esc text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full mb-1">
              NOVO
            </div>
            <h2 className="text-lg sm:text-2xl font-black leading-tight">Raio-X Votos</h2>
            <p className="text-white/90 text-xs sm:text-sm mt-1">
              Votos detalhados por seção, local e candidato · Eleições 2012 até 2024
            </p>
          </div>
          <div className="hidden sm:flex w-10 h-10 rounded-full bg-white/10 group-hover:bg-white/20 items-center justify-center flex-shrink-0">
            <span className="text-xl">→</span>
          </div>
        </div>
      </Link>

      {/* Widget: votação histórica do candidato fixado */}
      {candFixadoNum && historicoCand.length > 0 && (
        <div className="bg-white rounded-2xl ring-soft p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-marco-amarelo fill-marco-amarelo" />
            <h3 className="font-bold text-slate-800">
              Sua votação · {candFixadoNome || historicoCand[0]?.nome} ({candFixadoNum})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-2 sm:gap-4 min-w-min h-32 sm:h-40 pb-2">
              {(() => {
                const max = Math.max(...historicoCand.map(h => h.votos), 1)
                return historicoCand.map(h => (
                  <div key={`${h.ano}-${h.cargo}`} className="flex-1 min-w-[60px] sm:min-w-[80px] flex flex-col items-center gap-1">
                    <div className="text-xs font-black text-slate-700">{h.votos.toLocaleString('pt-BR')}</div>
                    <div
                      className="w-full bg-gradient-to-t from-marco-azul to-marco-azul-esc rounded-t transition-all hover:from-marco-azul-esc"
                      style={{ height: `${(h.votos / max) * 100}%`, minHeight: 6 }}
                      title={`${h.cargo} ${h.ano}: ${h.votos.toLocaleString('pt-BR')} votos`}
                    />
                    <div className="text-[10px] text-slate-500 font-semibold">{h.ano}</div>
                    <div className="text-[9px] text-slate-400 truncate w-full text-center" title={h.cargo}>{h.cargo.split(' ')[0]}</div>
                  </div>
                ))
              })()}
            </div>
          </div>
          <Link to="/raio-x-votos" className="text-xs text-marco-azul font-bold hover:underline mt-3 inline-block">
            Ver análise completa no Raio-X →
          </Link>
        </div>
      )}

      {candFixadoNum && historicoCand.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-sm text-slate-600 flex items-center gap-2">
          <Star className="w-4 h-4 text-slate-400" />
          <div>
            Candidato <strong>{candFixadoNum}</strong> configurado, mas sem dados no banco.
            Importe os votos via <code>scripts/votos-limeira/</code>.
          </div>
        </div>
      )}

      {/* Atalhos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <AtalhoCard to="/eleitores" icon={Users} cor="emerald" label="Eleitores" desc="Cadastros e fichas" />
        <AtalhoCard to="/atendimentos" icon={MessageSquare} cor="sky" label="Atendimentos" desc="Demandas e status" />
        <AtalhoCard to="/envolvimento" icon={TrendingUp} cor="purple" label="Envolvimento" desc="Termômetro do mandato" />
        <AtalhoCard to="/parlamentar/proposituras" icon={FileText} cor="amber" label="Parlamentar" desc="Projetos e ofícios" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard titulo="Atendimentos por bairro" icon={Map} dados={porBairro.map(([k, v]) => ({ label: k, valor: v }))} cor="bg-sky-500" />
        <ChartCard titulo="Atendimentos por tipo" icon={BarChart3} dados={porTipo.map(([k, v]) => ({ label: k, valor: v }))} cor="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard
          titulo="Andamento dos atendimentos"
          icon={BarChart3}
          dados={porStatus.map(s => ({ label: s.label, valor: s.valor }))}
          cor="bg-amber-500"
        />
        <ChartCard
          titulo="Envolvimento dos eleitores"
          icon={Users}
          dados={porEnvolvimento}
          cor="bg-purple-500"
        />
      </div>

      <div className="bg-white rounded-2xl ring-soft p-5 mb-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-marco-azul" /> Cadastros por mês ({new Date().getFullYear()})
        </h3>
        <div className="flex items-end gap-1 sm:gap-2 h-32">
          {(() => {
            const max = Math.max(...porMes.map(m => m.valor), 1)
            return porMes.map(m => (
              <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-marco-azul rounded-t transition-all hover:bg-marco-azul-esc"
                  style={{ height: `${(m.valor / max) * 100}%`, minHeight: m.valor > 0 ? 4 : 0 }}
                  title={`${m.mes}: ${m.valor}`}
                />
                <div className="text-[10px] text-slate-500">{m.mes}</div>
                <div className="text-[10px] font-bold text-slate-700">{m.valor}</div>
              </div>
            ))
          })()}
        </div>
      </div>

      <div className="bg-white rounded-2xl ring-soft p-6 text-sm text-slate-500 text-center">
        ✨ Painel do gabinete Marco Xavier.
        <div className="text-xs text-slate-400 mt-1">Desenvolvido por Saulo Xavier</div>
      </div>
    </div>
  )
}

// ============================================================
// Componentes
// ============================================================
function AtalhoCard({
  to, icon: Icon, label, desc, cor,
}: { to: string; icon: typeof Users; label: string; desc: string; cor: string }) {
  const corClasses: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-600',
    sky: 'bg-sky-100 text-sky-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
  }
  return (
    <Link
      to={to}
      className="group bg-white hover:bg-marco-azul hover:text-white transition rounded-2xl ring-soft p-4 flex flex-col gap-3"
    >
      <div className={`${corClasses[cor]} w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-white/20 group-hover:text-white transition`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="font-black text-base leading-tight">{label}</div>
        <div className="text-xs text-slate-500 group-hover:text-white/80 mt-0.5">{desc}</div>
      </div>
    </Link>
  )
}

function MiniMetric({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{label}</div>
      <div className={`text-2xl font-black ${cor} mt-0.5`}>
        {valor.toLocaleString('pt-BR')}
      </div>
    </div>
  )
}

function CounterCard({
  label, valor, loading, cor,
}: { label: string; valor?: number; loading?: boolean; cor: string }) {
  const corClasses: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-600',
    sky: 'bg-sky-100 text-sky-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
    rose: 'bg-rose-100 text-rose-600',
  }
  return (
    <div className="bg-white rounded-2xl p-4 ring-soft flex items-center gap-3">
      <div className={`${corClasses[cor]} w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0`}>
        <TrendingUp className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] text-slate-500 font-medium truncate uppercase tracking-wider">{label}</div>
        <div className="text-xl sm:text-2xl font-black text-slate-800">
          {loading ? '…' : valor ?? 0}
        </div>
      </div>
    </div>
  )
}

function ChartCard({
  titulo, icon: Icon, dados, cor,
}: { titulo: string; icon: typeof Users; dados: Array<{ label: string; valor: number }>; cor: string }) {
  const max = Math.max(...dados.map(d => d.valor), 1)
  return (
    <div className="bg-white rounded-2xl ring-soft p-5">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5 text-marco-azul" /> {titulo}
      </h3>
      {dados.length === 0 ? (
        <div className="text-sm text-slate-400 text-center py-8">Sem dados no período</div>
      ) : (
        <div className="space-y-2">
          {dados.map(d => (
            <div key={d.label} className="flex items-center gap-3 text-sm">
              <div className="w-32 sm:w-40 truncate text-slate-700">{d.label}</div>
              <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                <div
                  className={`${cor} h-full transition-all flex items-center justify-end pr-2 text-white text-xs font-bold`}
                  style={{ width: `${(d.valor / max) * 100}%`, minWidth: 30 }}
                >
                  {d.valor}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
