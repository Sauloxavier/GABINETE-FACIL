import { Outlet, createFileRoute, redirect, useLocation } from '@tanstack/react-router'
import { Sidebar } from '@/features/auth/components/Sidebar'
import { Topbar } from '@/features/auth/components/Topbar'
import { useSessionTimeout } from '@/features/auth/hooks/useSessionTimeout'
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useAuth, type AuthState } from '@/store/auth'

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context, location }) => {
    const auth = (context as { auth: AuthState }).auth
    if (!auth.user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    // Root só pode acessar /usuarios — redireciona qualquer outra rota
    if (auth.perfil?.papel === 'root' && !location.pathname.startsWith('/usuarios')) {
      throw redirect({ to: '/usuarios' })
    }
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  useSessionTimeout()
  const { perfil } = useAuth()
  const location = useLocation()

  const isRoot = perfil?.papel === 'root'

  // Modo ROOT — só a tela de usuários, sem sidebar/topbar do mandato
  if (isRoot) {
    return (
      <div className="min-h-screen bg-slate-50">
        <RootHeader />
        <Outlet key={location.pathname} />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setMenuOpen(v => !v)} />
        {perfil?.aviso && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-amber-900">
              <div className="font-bold mb-0.5">Aviso do administrador</div>
              <div>{perfil.aviso}</div>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function RootHeader() {
  const { perfil, signOut } = useAuth()
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <img src="/governato-horizontal.png" alt="governato" className="h-8 w-auto" />
        <span className="text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-800 px-2 py-1 rounded">
          👑 ROOT
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-bold text-slate-700">{perfil?.nome ?? perfil?.email}</div>
          <div className="text-[10px] text-slate-400 uppercase">Super-admin</div>
        </div>
        <button
          onClick={() => signOut()}
          className="text-sm font-bold text-slate-600 hover:text-rose-500 px-3 py-1.5 rounded-lg hover:bg-slate-100"
        >
          Sair
        </button>
      </div>
    </header>
  )
}
