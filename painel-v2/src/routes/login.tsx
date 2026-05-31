import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Mail, Lock, Eye, EyeOff,
  Vote, Landmark, Megaphone, Users, Flag, Scale, Newspaper, Award,
} from 'lucide-react'
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

const ORBITA_ICONS = [
  { Icon: Vote, label: 'Voto' },
  { Icon: Landmark, label: 'Câmara' },
  { Icon: Megaphone, label: 'Comunicação' },
  { Icon: Users, label: 'Povo' },
  { Icon: Flag, label: 'Bandeira' },
  { Icon: Scale, label: 'Justiça' },
  { Icon: Newspaper, label: 'Imprensa' },
  { Icon: Award, label: 'Mandato' },
]

function LoginPage() {
  const navigate = useNavigate()
  const signIn = useAuth(s => s.signIn)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [remember, setRemember] = useState(false)
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
    <div className="relative min-h-screen p-4 sm:p-6 lg:p-10 flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-slate-100 to-slate-200">
      <style>{`
        @keyframes orbita-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orbita-spin-rev { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
      `}</style>

      {/* Textura/grid no fundo geral */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(30,64,175,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(30,64,175,0.15) 1px, transparent 1px)",
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 75%)',
        }}
      />
      {/* Blobs decorativos sutis no fundo branco */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-marco-azul/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 w-[380px] h-[380px] rounded-full bg-slate-200/60 blur-3xl" />

      <div className="relative w-full max-w-6xl rounded-3xl shadow-2xl ring-1 ring-slate-200 overflow-hidden grid lg:grid-cols-2 min-h-[640px]">
        {/* ─── COLUNA ESQUERDA — FORM ─────────────────────────── */}
        <div className="relative p-8 sm:p-12 flex flex-col bg-white">
          <div className="relative z-10 flex-1 flex items-center justify-center">
            <div className="w-full max-w-sm">
              <div className="text-center mb-8">
                <div className="relative inline-flex">
                  <div className="absolute inset-0 -m-6 grid grid-cols-6 gap-1 opacity-30 pointer-events-none">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="aspect-square border border-slate-200 rounded-sm" />
                    ))}
                  </div>
                  <img
                    src="/governato-horizontal.png"
                    alt="governato"
                    className="relative h-24 sm:h-28 lg:h-32 w-auto"
                  />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-5">
                  Entre na sua conta
                </h1>
                <p className="text-sm text-slate-500 mt-2">
                  Informe seu e-mail e senha para acessar o painel.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4" method="post" action="#login">
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seunome@dominio.com"
                      autoComplete="username"
                      required
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-marco-azul/30 focus:border-marco-azul/40"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-slate-700 mb-1.5">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="password"
                      name="password"
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      required
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-marco-azul/30 focus:border-marco-azul/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={e => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-marco-azul focus:ring-marco-azul/30"
                    />
                    <span className="text-slate-600">Lembrar de mim</span>
                  </label>
                  <a href="#" className="text-marco-azul font-semibold hover:underline">
                    Esqueci a senha?
                  </a>
                </div>

                {erro && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">
                    {erro}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-marco-azul hover:bg-marco-azul-esc text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 transition shadow-lg shadow-marco-azul/20"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            </div>
          </div>

          <div className="relative z-10 text-center text-[11px] text-slate-400 tracking-widest uppercase mt-6">
            powered by <span className="font-black text-marco-azul">GOVERNATO</span>
          </div>
        </div>

        {/* ─── COLUNA DIREITA — BANNER SP + ÓRBITA ───────────── */}
        <div className="relative hidden lg:flex items-center justify-center overflow-hidden">
          {/* Background São Paulo */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1543059080-f9b1272213d5?auto=format&fit=crop&w=1600&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-marco-azul/85 via-marco-azul/80 to-marco-azul-esc/90" />

          {/* Conteúdo */}
          <div className="relative z-10 w-full px-10 py-12 text-white flex flex-col h-full">
            <h2 className="text-3xl sm:text-4xl font-black leading-tight">
              Governe <span className="text-sky-200">com inteligência</span>
            </h2>
            <p className="text-base sm:text-lg font-semibold text-white/90 mt-1 tracking-wide">
              Gabinete inteligente
            </p>

            {/* Sistema solar */}
            <div className="flex-1 flex items-center justify-center">
              <div className="relative w-[420px] h-[420px] max-w-full">
                {/* Anéis orbitais */}
                <div className="absolute inset-0 rounded-full border border-white/25" />
                <div className="absolute inset-[60px] rounded-full border border-white/20" />
                <div className="absolute inset-[120px] rounded-full border border-white/15" />

                {/* Logo central */}
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="w-24 h-24 rounded-full bg-white shadow-2xl flex items-center justify-center">
                    <img src="/governato-icon.png" alt="" className="w-14 h-14 object-contain" />
                  </div>
                </div>

                {/* Órbita externa — 5 ícones, sentido horário, lenta */}
                <div
                  className="absolute inset-0"
                  style={{ animation: 'orbita-spin 40s linear infinite' }}
                >
                  {ORBITA_ICONS.slice(0, 5).map((item, i) => {
                    const angle = (i / 5) * 360
                    const radius = 200
                    const { Icon, label } = item
                    return (
                      <div
                        key={label}
                        className="absolute top-1/2 left-1/2 w-14 h-14 -ml-7 -mt-7"
                        style={{
                          transform: `rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg)`,
                        }}
                      >
                        <div
                          className="w-full h-full rounded-full bg-white shadow-xl flex items-center justify-center ring-4 ring-white/30"
                          style={{ animation: 'orbita-spin-rev 40s linear infinite' }}
                          title={label}
                        >
                          <Icon className="w-6 h-6 text-marco-azul" strokeWidth={2.4} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Órbita interna — 3 ícones, sentido contrário, mais rápida */}
                <div
                  className="absolute inset-[60px]"
                  style={{ animation: 'orbita-spin-rev 28s linear infinite' }}
                >
                  {ORBITA_ICONS.slice(5).map((item, i) => {
                    const angle = (i / 3) * 360
                    const radius = 130
                    const { Icon, label } = item
                    return (
                      <div
                        key={label}
                        className="absolute top-1/2 left-1/2 w-12 h-12 -ml-6 -mt-6"
                        style={{
                          transform: `rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg)`,
                        }}
                      >
                        <div
                          className="w-full h-full rounded-full bg-white shadow-xl flex items-center justify-center ring-4 ring-white/30"
                          style={{ animation: 'orbita-spin 28s linear infinite' }}
                          title={label}
                        >
                          <Icon className="w-5 h-5 text-marco-azul" strokeWidth={2.4} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <span className="w-8 h-1 rounded-full bg-white" />
              <span className="w-2 h-1 rounded-full bg-white/50" />
              <span className="w-2 h-1 rounded-full bg-white/50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
