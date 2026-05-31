import { Link, useLocation } from '@tanstack/react-router'
import {
  Home, Users, MessageSquare, FileText, Settings,
  TrendingUp, BarChart3, Inbox, Bell, Calendar, Lock,
  LogOut, ChevronDown, UserCog,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/store/auth'
import { cn, iniciais } from '@/lib/utils'

interface NavItem {
  id: string
  label: string
  icon: typeof Home
  to?: string
  group?: { id: string; items: { id: string; label: string; to: string }[] }
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { id: 'inicio', label: 'Início', icon: Home, to: '/' },
  {
    id: 'cadastro', label: 'Cadastro', icon: Users,
    group: {
      id: 'cadastro', items: [
        { id: 'eleitores', label: 'Eleitores', to: '/eleitores' },
        { id: 'atendimentos', label: 'Atendimentos', to: '/atendimentos' },
        { id: 'importar', label: 'Importar CSV', to: '/importar' },
      ]
    }
  },
  {
    id: 'pro', label: 'Recursos Pro', icon: Lock,
    group: {
      id: 'pro', items: [
        { id: 'disparo', label: 'Disparo em massa', to: '/pro/disparo' },
        { id: 'automacoes', label: 'Automações', to: '/pro/automacoes' },
        { id: 'posts', label: 'Posts automáticos', to: '/pro/posts' },
        { id: 'trafego', label: 'Tráfego pago', to: '/pro/trafego' },
        { id: 'ia', label: 'Atendimento por IA', to: '/pro/ia' },
        { id: 'analise', label: 'IA analisa mandato', to: '/pro/analise' },
      ]
    }
  },
  {
    id: 'comunicacao', label: 'Comunicação', icon: MessageSquare,
    group: {
      id: 'comunicacao', items: [
        { id: 'conversas', label: 'Conversas', to: '/conversas' },
        { id: 'whatsapp', label: 'WhatsApp', to: '/whatsapp' },
        { id: 'aniversariantes', label: 'Aniversariantes', to: '/aniversariantes' },
      ]
    }
  },
  { id: 'envolvimento', label: 'Envolvimento', icon: TrendingUp, to: '/envolvimento' },
  { id: 'ranking', label: 'Ranking de lideranças', icon: TrendingUp, to: '/ranking' },
  { id: 'painel', label: 'Painel Geral', icon: BarChart3, to: '/painel-geral' },
  { id: 'inbox', label: 'Caixa de Entrada', icon: Inbox, to: '/inbox' },
  { id: 'notificacoes', label: 'Notificações', icon: Bell, to: '/notificacoes' },
  { id: 'agenda', label: 'Agenda', icon: Calendar, to: '/agenda' },
  {
    id: 'parlamentar', label: 'Parlamentar', icon: FileText,
    group: {
      id: 'parlamentar', items: [
        { id: 'proposituras', label: 'Processos', to: '/parlamentar/proposituras' },
        { id: 'emendas', label: 'Emendas', to: '/parlamentar/emendas' },
      ]
    }
  },
  { id: 'usuarios', label: 'Usuários', icon: UserCog, to: '/usuarios', adminOnly: true },
  { id: 'config', label: 'Configurações', icon: Settings, to: '/config' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { perfil, isAdmin, signOut } = useAuth()
  const location = useLocation()
  const [openGroup, setOpenGroup] = useState<string | null>('cadastro')

  return (
    <aside
      className={cn(
        'fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 transition-transform duration-200 flex flex-col',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className="px-4 py-6 border-b border-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-black text-marco-azul">Marco Xavier</div>
          <div className="text-[10px] uppercase tracking-widest text-marco-amarelo-esc font-bold">Vereador</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map(item => {
          if (item.adminOnly && !isAdmin()) return null

          if (item.to) {
            return (
              <Link
                key={item.id}
                to={item.to}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition',
                  location.pathname === item.to && 'bg-blue-50 text-marco-azul font-semibold border-l-4 border-marco-azul'
                )}
              >
                <item.icon className="w-4 h-4 text-slate-400" />
                <span className="flex-1">{item.label}</span>
              </Link>
            )
          }

          if (item.group) {
            const isOpen = openGroup === item.group.id
            return (
              <div key={item.id}>
                <button
                  onClick={() => setOpenGroup(isOpen ? null : item.group!.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  <item.icon className="w-4 h-4 text-slate-400" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <div className="ml-7 mt-1 mb-2 space-y-0.5">
                    {item.group.items.map(sub => (
                      <Link
                        key={sub.id}
                        to={sub.to}
                        onClick={onClose}
                        className={cn(
                          'block px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition',
                          location.pathname.startsWith(sub.to) && 'bg-blue-50 text-marco-azul font-semibold'
                        )}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return null
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-marco-azul text-white text-xs font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
          {perfil?.avatar_url ? (
            <img src={perfil.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span>{iniciais(perfil?.nome ?? perfil?.email ?? 'M')}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-700 truncate text-xs">{perfil?.nome ?? perfil?.email}</div>
          <div className="text-[10px] text-slate-400 uppercase font-bold">{perfil?.papel ?? '—'}</div>
        </div>
        <button onClick={() => signOut()} className="text-slate-400 hover:text-rose-500 p-1 rounded" title="Sair">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  )
}
