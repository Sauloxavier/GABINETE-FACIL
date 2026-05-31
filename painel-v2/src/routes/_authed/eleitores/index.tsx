import { createFileRoute } from '@tanstack/react-router'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef, useState } from 'react'
import { Plus, Search, Phone } from 'lucide-react'
import { useEleitores } from '@/features/eleitores/hooks'
import { EleitorModal } from '@/features/eleitores/components/EleitorModal'
import type { Eleitor } from '@/lib/database.types'
import { cn, iniciais, chatIdDe, formatTelefone } from '@/lib/utils'

export const Route = createFileRoute('/_authed/eleitores/')({
  component: EleitoresPage,
})

function EleitoresPage() {
  const { data: eleitores, isLoading } = useEleitores()
  const [busca, setBusca] = useState('')
  const [filtroEnvolvimento, setFiltroEnvolvimento] = useState('')
  const [filtroBairro, setFiltroBairro] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [eleitorEditando, setEleitorEditando] = useState<Eleitor | null>(null)

  function novoEleitor() {
    setEleitorEditando(null)
    setModalOpen(true)
  }
  function editarEleitor(e: Eleitor) {
    setEleitorEditando(e)
    setModalOpen(true)
  }

  const bairros = useMemo(() => {
    if (!eleitores) return []
    return [...new Set(eleitores.map(e => e.bairro).filter(Boolean) as string[])].sort()
  }, [eleitores])

  const filtrados = useMemo(() => {
    if (!eleitores) return []
    const q = busca.toLowerCase().trim()
    return eleitores.filter(e => {
      if (q) {
        const t = e.telefone ?? ''
        const ok = e.nome.toLowerCase().includes(q) || t.includes(q) || (e.cpf ?? '').includes(q)
        if (!ok) return false
      }
      if (filtroEnvolvimento && e.envolvimento !== filtroEnvolvimento) return false
      if (filtroBairro && e.bairro !== filtroBairro) return false
      return true
    })
  }, [eleitores, busca, filtroEnvolvimento, filtroBairro])

  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: filtrados.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
    overscan: 10,
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-4 gap-3">
        <div>
          <div className="text-sm text-slate-500">Cadastro › Contatos</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 mt-1">Eleitores</h1>
        </div>
        <button onClick={novoEleitor} className="bg-marco-azul text-white font-bold px-5 py-2.5 rounded-lg hover:bg-marco-azul-esc text-sm flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" /> Novo eleitor
        </button>
      </div>

      <EleitorModal open={modalOpen} onClose={() => setModalOpen(false)} eleitor={eleitorEditando} />

      {/* Filtros */}
      <div className="bg-white rounded-2xl ring-soft p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Nome, telefone ou CPF..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-marco-azul/30"
          />
        </div>
        <select
          value={filtroBairro}
          onChange={e => setFiltroBairro(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">Todos os bairros</option>
          {bairros.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select
          value={filtroEnvolvimento}
          onChange={e => setFiltroEnvolvimento(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">Todos envolvimentos</option>
          <option value="Não trabalhado">Não trabalhado</option>
          <option value="Em prospecção">Em prospecção</option>
          <option value="Conquistado">Conquistado</option>
          <option value="Incerto">Incerto</option>
          <option value="Perdido">Perdido</option>
        </select>
      </div>

      {/* Header da lista */}
      <div className="bg-white rounded-t-2xl ring-soft px-5 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase flex justify-between border-b border-slate-200">
        <span>{filtrados.length} eleitor(es) {isLoading && '· carregando...'}</span>
        <span>Total: {eleitores?.length ?? 0}</span>
      </div>

      {/* Lista virtualizada */}
      <div
        ref={parentRef}
        className="bg-white rounded-b-2xl ring-soft flex-1 overflow-y-auto scrollbar-thin"
        style={{ minHeight: 400 }}
      >
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Carregando eleitores...</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-5xl mb-2">📋</div>
            <div>Nenhum eleitor encontrado</div>
          </div>
        ) : (
          <div
            style={{ height: rowVirtualizer.getTotalSize(), width: '100%', position: 'relative' }}
          >
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const e = filtrados[virtualRow.index]
              return (
                <div
                  key={e.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    height: virtualRow.size,
                  }}
                >
                  <EleitorRow eleitor={e} onEdit={editarEleitor} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function EleitorRow({ eleitor: e, onEdit }: { eleitor: Eleitor; onEdit: (e: Eleitor) => void }) {
  const chatId = chatIdDe(e.telefone)

  function abrirWhatsApp() {
    if (!chatId) return
    window.open(`https://wa.me/${chatId.replace('@c.us', '')}`, '_blank')
  }

  return (
    <div onClick={() => onEdit(e)} className="px-3 sm:px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 border-b border-slate-100">
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-marco-azul text-white font-bold flex items-center justify-center flex-shrink-0">
        {iniciais(e.nome)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-800 truncate flex items-center gap-2">
          {e.codigo && <span className="text-[10px] font-mono font-bold text-marco-azul bg-marco-azul/10 px-1.5 py-0.5 rounded">{e.codigo}</span>}
          {e.nome}
        </div>
        <div className="text-xs text-slate-500 truncate mt-0.5">
          {formatTelefone(e.telefone) || 'sem telefone'}
          {e.bairro && <> · {e.bairro}</>}
        </div>
      </div>
      <span
        className={cn(
          'hidden sm:inline text-xs font-bold px-2 py-1 rounded-full flex-shrink-0',
          e.envolvimento === 'Conquistado' && 'bg-purple-100 text-purple-700',
          e.envolvimento === 'Em prospecção' && 'bg-emerald-100 text-emerald-700',
          e.envolvimento === 'Incerto' && 'bg-amber-100 text-amber-700',
          e.envolvimento === 'Perdido' && 'bg-rose-100 text-rose-700',
          (!e.envolvimento || e.envolvimento === 'Não trabalhado') && 'bg-blue-100 text-blue-700',
        )}
      >
        {e.envolvimento ?? 'Não trabalhado'}
      </span>
      {e.telefone && (
        <button
          onClick={ev => { ev.stopPropagation(); abrirWhatsApp() }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          title="Abrir WhatsApp"
        >
          <Phone className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
