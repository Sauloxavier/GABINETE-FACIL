import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { LayoutGrid, List, Plus } from 'lucide-react'
import { useDemandas, useMoverDemanda } from '@/features/demandas/hooks'
import { useEleitores } from '@/features/eleitores/hooks'
import { DemandaModal } from '@/features/demandas/components/DemandaModal'
import { cn } from '@/lib/utils'
import type { Demanda } from '@/lib/database.types'
import { STATUS_DEMANDA, labelStatusDemanda } from '@/lib/status-demanda'

export const Route = createFileRoute('/_authed/atendimentos/')({
  component: AtendimentosPage,
})

const STATUS_COLS = STATUS_DEMANDA.map(s => s.valor)
const STATUS_CORES: Record<string, { bg: string; border: string; dot: string }> = {
  'Aberta':       { bg: 'bg-amber-50',   border: 'border-amber-300',   dot: 'bg-amber-500' },
  'Em andamento': { bg: 'bg-blue-50',    border: 'border-blue-300',    dot: 'bg-blue-500' },
  'Resolvida':    { bg: 'bg-emerald-50', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  'Cancelada':    { bg: 'bg-slate-100',  border: 'border-slate-300',   dot: 'bg-slate-400' },
}

type Modo = 'lista' | 'kanban'

const PERIODOS = [
  { id: '7',    label: 'Últimos 7 dias',  dias: 7 },
  { id: '15',   label: 'Últimos 15 dias', dias: 15 },
  { id: '30',   label: 'Últimos 30 dias', dias: 30 },
  { id: '60',   label: 'Últimos 60 dias', dias: 60 },
  { id: 'tudo', label: 'Tudo',            dias: 0 },
] as const

function AtendimentosPage() {
  const { data: demandas, isLoading } = useDemandas()
  const { data: eleitores } = useEleitores()
  const [modo, setModo] = useState<Modo>('lista')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [periodo, setPeriodo] = useState<string>('30')
  const [modalOpen, setModalOpen] = useState(false)
  const [demandaEditando, setDemandaEditando] = useState<Demanda | null>(null)

  function nova() { setDemandaEditando(null); setModalOpen(true) }
  function editar(d: Demanda) { setDemandaEditando(d); setModalOpen(true) }

  const mapEleitores = useMemo(() => {
    if (!eleitores) return new Map<string, string>()
    return new Map(eleitores.map(e => [e.id, e.nome]))
  }, [eleitores])

  const filtradas = useMemo(() => {
    if (!demandas) return []
    const q = busca.toLowerCase().trim()
    const diasPeriodo = PERIODOS.find(p => p.id === periodo)?.dias ?? 0
    const corte = diasPeriodo > 0
      ? new Date(Date.now() - diasPeriodo * 86400000).toISOString().slice(0, 10)
      : ''
    return demandas.filter(d => {
      if (q) {
        const nomeEleitor = (mapEleitores.get(d.eleitor_id) ?? '').toLowerCase()
        if (!d.descricao.toLowerCase().includes(q) && !nomeEleitor.includes(q)) return false
      }
      if (filtroStatus && d.status !== filtroStatus) return false
      if (corte) {
        const dt = (d.data || '').slice(0, 10)
        if (dt < corte) return false
      }
      return true
    })
  }, [demandas, busca, filtroStatus, periodo, mapEleitores])

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-4 gap-3">
        <div>
          <div className="text-sm text-slate-500">Cadastro › Atendimentos</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 mt-1">Atendimentos</h1>
        </div>
        <div className="flex gap-2 items-center">
          <div className="bg-slate-100 rounded-lg p-1 flex">
            <button
              onClick={() => setModo('lista')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1.5 transition',
                modo === 'lista' ? 'bg-white text-marco-azul shadow-sm' : 'text-slate-500'
              )}
            >
              <List className="w-4 h-4" /> Lista
            </button>
            <button
              onClick={() => setModo('kanban')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1.5 transition',
                modo === 'kanban' ? 'bg-white text-marco-azul shadow-sm' : 'text-slate-500'
              )}
            >
              <LayoutGrid className="w-4 h-4" /> Kanban
            </button>
          </div>
          <button onClick={nova} className="bg-marco-azul text-white font-bold px-5 py-2.5 rounded-lg hover:bg-marco-azul-esc text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      <DemandaModal open={modalOpen} onClose={() => setModalOpen(false)} demanda={demandaEditando} />

      <div className="bg-white rounded-2xl ring-soft p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar..."
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
        />
        {modo === 'lista' && (
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">Todos andamentos</option>
            {STATUS_DEMANDA.map(s => <option key={s.valor} value={s.valor}>{s.label}</option>)}
          </select>
        )}
        <select
          value={periodo}
          onChange={e => setPeriodo(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
        >
          {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : modo === 'lista' ? (
        <ListaView demandas={filtradas} mapEleitores={mapEleitores} onEdit={editar} />
      ) : (
        <KanbanView demandas={filtradas} mapEleitores={mapEleitores} onEdit={editar} />
      )}
    </div>
  )
}

function ListaView({ demandas, mapEleitores, onEdit }: { demandas: Demanda[]; mapEleitores: Map<string, string>; onEdit: (d: Demanda) => void }) {
  const [limite, setLimite] = useState(50)

  return (
    <div className="bg-white rounded-2xl ring-soft overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
        {demandas.length} atendimento(s)
      </div>
      {demandas.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-5xl mb-2">📨</div>
          <div>Nenhum atendimento</div>
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-100">
            {demandas.slice(0, limite).map(d => (
              <div key={d.id} onClick={() => onEdit(d)} className="p-4 hover:bg-slate-50 cursor-pointer">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-bold text-marco-azul uppercase bg-marco-azul/10 px-2 py-0.5 rounded">
                    {d.tipo}
                  </span>
                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded uppercase',
                    d.status === 'Resolvida' && 'bg-emerald-100 text-emerald-700',
                    d.status === 'Em andamento' && 'bg-blue-100 text-blue-700',
                    d.status === 'Aberta' && 'bg-amber-100 text-amber-700',
                    d.status === 'Cancelada' && 'bg-slate-200 text-slate-600',
                  )}>{labelStatusDemanda(d.status)}</span>
                </div>
                <div className="font-semibold text-slate-800">{d.descricao}</div>
                <div className="text-sm text-slate-500 mt-1">
                  {mapEleitores.get(d.eleitor_id) ?? '(eleitor removido)'} · {d.data}
                </div>
              </div>
            ))}
          </div>
          {demandas.length > limite && (
            <div className="p-4 border-t border-slate-100 text-center bg-slate-50">
              <button
                onClick={() => setLimite(l => l + 50)}
                className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-5 py-2 rounded-lg text-sm"
              >
                Carregar mais ({limite} de {demandas.length})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function KanbanView({ demandas, mapEleitores, onEdit }: { demandas: Demanda[]; mapEleitores: Map<string, string>; onEdit: (d: Demanda) => void }) {
  const mover = useMoverDemanda()
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const porStatus = useMemo(() => {
    const map: Record<string, Demanda[]> = {}
    for (const s of STATUS_COLS) map[s] = []
    for (const d of demandas) {
      const s = d.status || 'Aberta'
      if (!map[s]) map[s] = []
      map[s].push(d)
    }
    return map
  }, [demandas])

  function onDrop(status: string) {
    if (!draggingId) return
    mover.mutate({ id: draggingId, status })
    setDraggingId(null)
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-4 min-w-min">
        {STATUS_COLS.map(status => {
          const cor = STATUS_CORES[status]
          const cards = porStatus[status] ?? []
          return (
            <div
              key={status}
              className={cn(cor.bg, 'border-t-4', cor.border, 'rounded-2xl flex flex-col min-h-[400px] w-72 sm:w-80 flex-shrink-0')}
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDrop(status)}
            >
              <div className="px-4 py-3 flex items-center gap-2 border-b border-white/50">
                <span className={cn(cor.dot, 'w-2.5 h-2.5 rounded-full')} />
                <span className="font-bold text-slate-700 text-sm">{labelStatusDemanda(status)}</span>
                <span className="text-xs font-bold bg-white text-slate-500 rounded-full px-2 py-0.5">{cards.length}</span>
              </div>
              <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)] scrollbar-thin">
                {cards.slice(0, 30).map(d => (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={() => setDraggingId(d.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => onEdit(d)}
                    className={cn(
                      'bg-white rounded-xl p-3 shadow-sm hover:shadow-md cursor-pointer transition border border-slate-200',
                      draggingId === d.id && 'opacity-40'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-marco-azul uppercase bg-marco-azul/10 px-2 py-0.5 rounded">{d.tipo}</span>
                      <span className="text-[10px] text-slate-400">{d.data}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 mb-2 line-clamp-2">{d.descricao}</div>
                    <div className="text-xs text-slate-500 truncate">{mapEleitores.get(d.eleitor_id) ?? '(removido)'}</div>
                  </div>
                ))}
                {cards.length > 30 && (
                  <div className="text-xs text-center text-slate-400 py-2">
                    +{cards.length - 30} cards
                  </div>
                )}
                {cards.length === 0 && (
                  <div className="text-center py-8 text-slate-300 text-xs">Arraste cards aqui</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
