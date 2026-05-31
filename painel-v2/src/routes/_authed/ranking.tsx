import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { Trophy, Crown, Medal, Award } from 'lucide-react'
import { useEleitores } from '@/features/eleitores/hooks'
import { useDemandas } from '@/features/demandas/hooks'

export const Route = createFileRoute('/_authed/ranking')({
  component: RankingPage,
})

interface Pontuado {
  id: string
  nome: string
  codigo: string | null
  bairro: string | null
  envolvimento: string | null
  marcadores: string[]
  score: number
  demandas: number
  diasSemContato: number
  motivos: string[]
}

function RankingPage() {
  const { data: eleitores } = useEleitores()
  const { data: demandas } = useDemandas()

  const ranking = useMemo<Pontuado[]>(() => {
    if (!eleitores) return []
    return eleitores.map(e => {
      let score = 0
      const motivos: string[] = []

      // Pontos por envolvimento
      if (e.envolvimento === 'Conquistado') { score += 50; motivos.push('Conquistado (+50)') }
      else if (e.envolvimento === 'Em prospecção') { score += 20; motivos.push('Em prospecção (+20)') }
      else if (e.envolvimento === 'Incerto') { score += 10; motivos.push('Incerto (+10)') }

      // Marcadores: Liderança vale muito
      if ((e.marcadores ?? []).includes('Liderança')) { score += 100; motivos.push('Liderança (+100)') }
      if ((e.marcadores ?? []).includes('Doador')) { score += 30; motivos.push('Doador (+30)') }
      if ((e.marcadores ?? []).includes('Voluntário')) { score += 20; motivos.push('Voluntário (+20)') }

      // Demandas atendidas no histórico
      const demandasDele = (demandas ?? []).filter(d => d.eleitor_id === e.id)
      score += demandasDele.length * 3
      if (demandasDele.length > 0) motivos.push(`${demandasDele.length} atendimento(s) (+${demandasDele.length * 3})`)

      // Atividade recente: sem contato penaliza
      const diasSemContato = e.ultimo_contato
        ? Math.floor((Date.now() - new Date(e.ultimo_contato).getTime()) / 86400000)
        : 999
      if (diasSemContato < 7) { score += 15; motivos.push('Contato recente (+15)') }
      else if (diasSemContato > 60) { score -= 10; motivos.push('60+ dias sem contato (-10)') }

      return {
        id: e.id,
        nome: e.nome,
        codigo: e.codigo,
        bairro: e.bairro,
        envolvimento: e.envolvimento,
        marcadores: e.marcadores ?? [],
        score: Math.max(0, score),
        demandas: demandasDele.length,
        diasSemContato,
        motivos,
      }
    }).sort((a, b) => b.score - a.score)
  }, [eleitores, demandas])

  const top = ranking.slice(0, 50)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 mb-6 flex items-center gap-2">
        <Trophy className="w-8 h-8 text-marco-amarelo" /> Ranking de lideranças
      </h1>

      <p className="text-sm text-slate-500 mb-6">
        Score calculado a partir de: envolvimento, marcadores (Liderança/Doador/Voluntário), histórico de atendimentos e atividade recente.
      </p>

      <div className="bg-white rounded-2xl ring-soft overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
          Top {top.length} de {ranking.length} eleitores
        </div>
        <div className="divide-y divide-slate-100">
          {top.map((p, i) => {
            const podium = i < 3
            const Icon = i === 0 ? Crown : i === 1 ? Medal : i === 2 ? Award : null
            const cor = i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
            return (
              <div key={p.id} className={`p-4 hover:bg-slate-50 flex items-center gap-4 ${podium ? 'bg-amber-50/30' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${cor}`}>
                  {Icon ? <Icon className="w-5 h-5" /> : (i + 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    {p.codigo && <span className="text-[10px] font-mono font-bold text-marco-azul bg-marco-azul/10 px-1.5 py-0.5 rounded">{p.codigo}</span>}
                    {p.nome}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                    {p.bairro && <span>{p.bairro}</span>}
                    {p.envolvimento && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        p.envolvimento === 'Conquistado' ? 'bg-purple-100 text-purple-700' :
                        p.envolvimento === 'Em prospecção' ? 'bg-emerald-100 text-emerald-700' :
                        p.envolvimento === 'Incerto' ? 'bg-amber-100 text-amber-700' :
                        p.envolvimento === 'Perdido' ? 'bg-rose-100 text-rose-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>{p.envolvimento}</span>
                    )}
                    <span>· {p.demandas} atendimento(s)</span>
                    <span className={p.diasSemContato > 30 ? 'text-rose-500' : ''}>
                      · {p.diasSemContato >= 999 ? 'nunca contatado' : `${p.diasSemContato}d sem contato`}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-black text-marco-azul">{p.score}</div>
                  <div className="text-[10px] text-slate-400 uppercase">pontos</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
