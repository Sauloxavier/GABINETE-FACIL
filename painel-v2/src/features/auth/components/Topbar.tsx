import { Menu, Search, Bell, MessageSquare, Check, CheckCheck } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { iniciais } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useNotificacoes } from '@/features/notificacoes/hook'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, perfil } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 lg:px-8 h-16 flex items-center gap-2 lg:gap-4">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 text-slate-500"
        aria-label="Abrir menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      <Link to="/" className="flex items-center gap-2 flex-shrink-0">
        <img src="/logo-azul.png" alt="Marco Xavier" className="h-9 w-auto" />
        <div className="hidden lg:block leading-tight">
          <div className="text-sm font-black text-marco-azul">Marco Xavier</div>
          <div className="text-[10px] text-slate-500 -mt-0.5">Gabinete · Limeira-SP</div>
        </div>
      </Link>

      <div className="flex-1 max-w-lg flex items-center bg-slate-100 rounded-xl min-w-0">
        <input
          placeholder="Pesquisar eleitor, atendimento, número..."
          className="flex-1 min-w-0 bg-transparent px-4 py-2 text-sm focus:outline-none"
        />
        <Search className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" />
      </div>

      {/* Botão WhatsApp — abre conversas */}
      <button
        onClick={() => navigate({ to: '/conversas' })}
        className="hidden sm:flex w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white items-center justify-center transition flex-shrink-0"
        title="Conversas WhatsApp"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      {/* Sino de notificações */}
      <DropdownNotificacoes />

      <div className="hidden lg:block text-right">
        <div className="text-xs font-semibold text-slate-700 leading-tight">
          {perfil?.nome ?? user?.email?.split('@')[0]}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
          ● Logado
        </div>
      </div>

      <div className="w-10 h-10 rounded-full bg-marco-azul text-white font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
        {perfil?.avatar_url ? (
          <img src={perfil.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span>{iniciais(perfil?.nome ?? user?.email ?? 'M')}</span>
        )}
      </div>
    </header>
  )
}

function DropdownNotificacoes() {
  const { naoLidas, todas, contagem, marcarLida, marcarTodasLidas, foiLida } = useNotificacoes()
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // suprime warning de unused naoLidas (precisamos só pra count, mas mantém na exportação caso queira filtrar depois)
  void naoLidas

  useEffect(() => {
    function clickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    if (aberto) document.addEventListener('mousedown', clickFora)
    return () => document.removeEventListener('mousedown', clickFora)
  }, [aberto])

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setAberto(v => !v)}
        className="relative w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
        title="Notificações"
      >
        <Bell className={`w-5 h-5 ${contagem > 0 ? 'text-rose-500' : ''}`} />
        {contagem > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white">
            {contagem > 9 ? '9+' : contagem}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-h-[70vh] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notificações
              {contagem > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{contagem}</span>
              )}
            </div>
            {contagem > 0 && (
              <button
                onClick={marcarTodasLidas}
                className="text-xs text-marco-azul font-bold hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" /> Marcar todas
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {todas.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <div className="text-4xl mb-2">🎉</div>
                <div className="text-sm font-medium">Tudo em dia!</div>
              </div>
            ) : (
              todas.map(n => {
                const Icon = n.icon
                const lida = foiLida(n.id)
                return (
                  <div
                    key={n.id}
                    className={`p-3 border-b border-slate-100 flex items-start gap-3 hover:bg-slate-50 ${lida ? 'opacity-60' : 'bg-blue-50/30'}`}
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${n.cor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        if (n.link) {
                          marcarLida(n.id)
                          setAberto(false)
                          navigate({ to: n.link as never })
                        }
                      }}
                    >
                      <div className={`text-sm font-bold text-slate-800 ${lida ? 'line-through opacity-60' : ''}`}>{n.titulo}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{n.desc}</div>
                    </div>
                    {!lida && (
                      <button
                        onClick={() => marcarLida(n.id)}
                        className="text-slate-400 hover:text-emerald-600 p-1"
                        title="Marcar como lida"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <button
            onClick={() => { setAberto(false); navigate({ to: '/notificacoes' }) }}
            className="px-4 py-3 text-sm font-bold text-marco-azul border-t border-slate-100 hover:bg-slate-50"
          >
            Ver tudo →
          </button>
        </div>
      )}
    </div>
  )
}
