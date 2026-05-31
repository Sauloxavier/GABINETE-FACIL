import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth, type AuthState } from '@/store/auth'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    const auth = (context as { auth: AuthState }).auth
    if (auth.user) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const signIn = useAuth(s => s.signIn)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setErro(error)
      return
    }
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-marco-azul to-marco-azul-esc p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <img
            src="/governato-vertical.png"
            alt="governato"
            className="mx-auto h-32 sm:h-40 w-auto"
          />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-marco-azul/30"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-marco-azul/30"
            />
          </div>

          {erro && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-marco-azul hover:bg-marco-azul-esc text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 transition"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 mt-6">
          Gabinete Marco Xavier
          <div className="text-[10px] text-slate-300 mt-1">Desenvolvido por Saulo Xavier</div>
        </div>
      </div>
    </div>
  )
}
