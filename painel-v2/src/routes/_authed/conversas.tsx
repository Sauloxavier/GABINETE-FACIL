import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useRef, useEffect } from 'react'
import { Send, Search, ChevronLeft, RefreshCw, MessageSquare } from 'lucide-react'
import { useChats, useMensagens, useEnviarMensagem, useWahaStatus } from '@/features/whatsapp/hooks'
import { useEleitores } from '@/features/eleitores/hooks'
import { AvatarChat } from '@/features/whatsapp/components/AvatarChat'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import type { WahaChat } from '@/lib/waha'

export const Route = createFileRoute('/_authed/conversas')({
  component: ConversasPage,
})

function ConversasPage() {
  const qc = useQueryClient()
  const { data: status } = useWahaStatus()
  const { data: chats, isLoading } = useChats()
  const { data: eleitores } = useEleitores()
  const [chatAtivo, setChatAtivo] = useState<WahaChat | null>(null)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'naolido' | 'cadastrados'>('todos')

  const mapEleitorPorChat = useMemo(() => {
    if (!eleitores) return new Map<string, string>()
    const m = new Map<string, string>()
    for (const e of eleitores) {
      const num = (e.telefone ?? '').replace(/\D/g, '')
      if (!num) continue
      const numComCodigo = num.startsWith('55') ? num : '55' + num
      m.set(numComCodigo + '@c.us', e.nome)
    }
    return m
  }, [eleitores])

  const chatsFiltrados = useMemo(() => {
    if (!chats) return []
    const q = busca.toLowerCase().trim()
    return chats.filter(c => {
      if (c.id.endsWith('@lid')) return false // esconder identidades técnicas
      if (q) {
        const nome = (c.name ?? mapEleitorPorChat.get(c.id) ?? c.id).toLowerCase()
        const last = (c.lastMessage?.body ?? '').toLowerCase()
        if (!nome.includes(q) && !last.includes(q)) return false
      }
      if (filtro === 'naolido' && !(c.unreadCount && c.unreadCount > 0)) return false
      if (filtro === 'cadastrados' && !mapEleitorPorChat.has(c.id)) return false
      return true
    })
  }, [chats, busca, filtro, mapEleitorPorChat])

  if (!status || status.status !== 'WORKING') {
    return <ConexaoNecessaria status={status?.status} />
  }

  return (
    <div className="flex h-full overflow-hidden bg-slate-100">
      {/* Coluna esquerda: lista de chats */}
      <div className={cn('w-full lg:w-96 bg-white border-r border-slate-200 flex flex-col', chatAtivo && 'hidden lg:flex')}>
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-slate-800 text-lg">Conversas</h2>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ['waha', 'chats'] })}
              className="text-marco-azul p-2 rounded-lg hover:bg-marco-azul/10"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-marco-azul/30"
            />
          </div>
          <div className="flex gap-1">
            <FiltroChip ativo={filtro === 'todos'} onClick={() => setFiltro('todos')} label="Todos" />
            <FiltroChip ativo={filtro === 'naolido'} onClick={() => setFiltro('naolido')} label="Não lidos" />
            <FiltroChip ativo={filtro === 'cadastrados'} onClick={() => setFiltro('cadastrados')} label="Cadastrados" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Carregando...</div>
          ) : chatsFiltrados.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Nenhuma conversa</div>
          ) : (
            chatsFiltrados.map(chat => {
              const nomeCadastrado = mapEleitorPorChat.get(chat.id)
              const ativo = chatAtivo?.id === chat.id
              return (
                <button
                  key={chat.id}
                  onClick={() => setChatAtivo(chat)}
                  className={cn(
                    'w-full text-left p-3 border-b border-slate-100 transition flex items-center gap-3',
                    ativo ? 'bg-marco-azul/5 border-l-4 border-l-marco-azul' : 'border-l-4 border-l-transparent hover:bg-slate-50'
                  )}
                >
                  <AvatarChat chatId={chat.id} nome={nomeCadastrado ?? chat.name ?? chat.id} className="w-12 h-12 text-sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-sm text-slate-800 truncate flex items-center gap-1.5">
                        {nomeCadastrado ?? chat.name ?? chat.id}
                        {nomeCadastrado && (
                          <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">✓</span>
                        )}
                      </div>
                      {chat.lastMessage?.timestamp && (
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {formatHora(chat.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <div className="text-xs text-slate-500 truncate">
                        {chat.lastMessage?.fromMe ? '✓ ' : ''}
                        {chat.lastMessage?.body ?? '—'}
                      </div>
                      {!!chat.unreadCount && chat.unreadCount > 0 && (
                        <span className="bg-emerald-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Coluna direita: thread */}
      <div className={cn('flex-1 min-w-0 flex flex-col', !chatAtivo && 'hidden lg:flex')}>
        {chatAtivo ? (
          <ChatThread chat={chatAtivo} mapEleitor={mapEleitorPorChat} onBack={() => setChatAtivo(null)} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-3" />
              <div className="text-lg">Selecione uma conversa</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ChatThread({
  chat, mapEleitor, onBack,
}: { chat: WahaChat; mapEleitor: Map<string, string>; onBack: () => void }) {
  const { data: mensagens, isLoading } = useMensagens(chat.id)
  const enviar = useEnviarMensagem()
  const [input, setInput] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)
  const nomeCadastrado = mapEleitor.get(chat.id)

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [mensagens])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || enviar.isPending) return
    const texto = input
    setInput('')
    try {
      await enviar.mutateAsync({ chatId: chat.id, texto })
    } catch (err) {
      console.error(err)
      setInput(texto) // restaura no campo
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-shrink-0 bg-white border-b border-slate-200 p-4 flex items-center gap-3">
        <button onClick={onBack} className="lg:hidden text-slate-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <AvatarChat chatId={chat.id} nome={nomeCadastrado ?? chat.name ?? chat.id} className="w-11 h-11 text-sm" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-800 truncate">{nomeCadastrado ?? chat.name ?? chat.id}</div>
          <div className="text-xs text-slate-500 font-mono">{chat.id.replace('@c.us', '').replace('@g.us', '')}</div>
        </div>
      </div>

      <div ref={threadRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3 bg-[#efeae2]">
        {isLoading ? (
          <div className="text-center text-slate-400 py-12">Carregando mensagens...</div>
        ) : !mensagens || mensagens.length === 0 ? (
          <div className="text-center text-slate-400 py-12">Sem mensagens ainda.</div>
        ) : (
          mensagens.map((m, i) => (
            <div key={(m.id?.id ?? '') + '-' + i} className={cn('flex', m.fromMe ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[75%] rounded-2xl shadow-sm px-3 py-2',
                m.fromMe ? 'bg-emerald-100' : 'bg-white'
              )}>
                <div className="text-sm text-slate-800 whitespace-pre-line break-words">
                  {m.body || <span className="italic text-slate-400">[mídia]</span>}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 text-right">
                  {formatHora(m.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={onSubmit} className="flex-shrink-0 bg-white border-t border-slate-200 p-3 flex items-end gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="flex-1 px-4 py-2.5 bg-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-marco-azul/30"
        />
        <button
          type="submit"
          disabled={!input.trim() || enviar.isPending}
          className="bg-marco-azul hover:bg-marco-azul-esc text-white w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40"
        >
          <Send className="w-5 h-5 -ml-0.5" />
        </button>
      </form>
    </div>
  )
}

function FiltroChip({ ativo, onClick, label }: { ativo: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-full text-xs font-semibold transition',
        ativo ? 'bg-marco-azul text-white' : 'bg-slate-100 text-slate-600'
      )}
    >
      {label}
    </button>
  )
}

function ConexaoNecessaria({ status }: { status?: string }) {
  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <MessageSquare className="w-16 h-16 text-marco-azul mx-auto mb-4" />
        <h1 className="text-2xl font-black text-slate-800 mb-2">WhatsApp não conectado</h1>
        <p className="text-slate-500 mb-4">
          Status atual: <strong>{status ?? 'desconhecido'}</strong>. Configure e conecte o WAHA primeiro.
        </p>
        <a href="/config" className="inline-block bg-marco-azul text-white font-bold px-6 py-2 rounded-lg">
          Ir para Configurações
        </a>
      </div>
    </div>
  )
}

function formatHora(ts: number | undefined) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
