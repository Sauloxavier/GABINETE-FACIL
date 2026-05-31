import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Users, MessageSquare, TrendingUp, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/auth'

export const Route = createFileRoute('/_authed/')({
  component: InicioPage,
})

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
      const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)

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

  const primeiroNome = (perfil?.nome ?? perfil?.email ?? 'MARCO').split(' ')[0].toUpperCase()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="text-sm text-slate-500">
        {saudacao()}, <span className="font-bold text-marco-azul uppercase">{primeiroNome}</span>
      </div>
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 mt-1 mb-6">Início</h1>

      {/* Atalhos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <AtalhoCard to="/eleitores" icon={Users} cor="emerald" label="Eleitores" desc="Cadastros e fichas" />
        <AtalhoCard to="/atendimentos" icon={MessageSquare} cor="sky" label="Atendimentos" desc="Demandas e status" />
        <AtalhoCard to="/envolvimento" icon={TrendingUp} cor="purple" label="Envolvimento" desc="Termômetro do mandato" />
        <AtalhoCard to="/parlamentar/proposituras" icon={FileText} cor="amber" label="Parlamentar" desc="Projetos e ofícios" />
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <CounterCard label="Contatos" valor={counters?.eleitores} loading={isLoading} cor="emerald" />
        <CounterCard label="Atendimentos hoje" valor={counters?.atendHoje} loading={isLoading} cor="sky" />
        <CounterCard label="Abertos" valor={counters?.abertas} loading={isLoading} cor="amber" />
        <CounterCard label="Resolvidos (30d)" valor={counters?.resolvidasMes} loading={isLoading} cor="purple" />
      </div>

      <div className="bg-white rounded-2xl ring-soft p-6 text-sm text-slate-500">
        ✨ Bem-vindo ao painel do gabinete Marco Xavier.
        <br />
        <span className="text-xs text-slate-400">Desenvolvido por Saulo Xavier</span>
      </div>
    </div>
  )
}

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
      className="group bg-white hover:bg-marco-azul hover:text-white transition rounded-2xl ring-soft p-4 sm:p-5 flex flex-col gap-3"
    >
      <div className={`${corClasses[cor]} w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-white/20 group-hover:text-white transition`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="font-black text-base sm:text-lg leading-tight">{label}</div>
        <div className="text-xs text-slate-500 group-hover:text-white/80 mt-0.5">{desc}</div>
      </div>
    </Link>
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
  }
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 ring-soft flex items-center gap-3">
      <div className={`${corClasses[cor]} w-12 h-12 rounded-2xl flex items-center justify-center`}>
        <TrendingUp className="w-6 h-6" />
      </div>
      <div>
        <div className="text-xs text-slate-500 font-medium truncate">{label}</div>
        <div className="text-2xl sm:text-3xl font-black text-slate-800">
          {loading ? '…' : valor ?? 0}
        </div>
      </div>
    </div>
  )
}
