import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { Sidebar } from '@/features/auth/components/Sidebar'
import { Topbar } from '@/features/auth/components/Topbar'
import { useSessionTimeout } from '@/features/auth/hooks/useSessionTimeout'
import { useState } from 'react'
import type { AuthState } from '@/store/auth'

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context, location }) => {
    const auth = (context as { auth: AuthState }).auth
    if (!auth.user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  useSessionTimeout()

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
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
