import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  UserCog, Crown, Shield, UserPlus, Pause, Play, KeyRound,
  AlertTriangle, Trash2, Search, MessageSquareWarning, ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth, type AuthState } from '@/store/auth'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { iniciais, cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/usuarios')({
  beforeLoad: ({ context }) => {
    const auth = (context as { auth: AuthState }).auth
    const papel = auth.perfil?.papel
    if (papel !== 'admin' && papel !== 'root') {
      throw redirect({ to: '/' })
    }
  },
  component: UsuariosPage,
})

interface PerfilRow {
  id: string
  nome: string | null
  email: string | null
  papel: 'root' | 'admin' | 'assessor'
  avatar_url: string | null
  pausado: boolean | null
  pausado_em: string | null
  aviso: string | null
  criado_por: string | null
  criado_em: string
}

function usePerfis() {
  return useQuery({
    queryKey: ['perfis'],
    queryFn: async (): Promise<PerfilRow[]> => {
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .order('papel', { ascending: true })
        .order('nome', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as PerfilRow[]
    },
  })
}

function UsuariosPage() {
  const { data: perfis, isLoading } = usePerfis()
  const auth = useAuth()
  const isRoot = auth.isRoot()

  const [busca, setBusca] = useState('')
  const [modalCriar, setModalCriar] = useState(false)
  const [perfilSelecionado, setPerfilSelecionado] = useState<PerfilRow | null>(null)

  // Admin (não-root) vê só ele mesmo + assessores que ele criou
  const visiveis = (perfis ?? []).filter(p => {
    if (isRoot) return true
    if (p.id === auth.user?.id) return true
    return p.criado_por === auth.user?.id
  })

  const filtrados = visiveis.filter(p => {
    if (!busca) return true
    const q = busca.toLowerCase().trim()
    return (
      (p.nome ?? '').toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q) ||
      p.papel.includes(q)
    )
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 flex items-center gap-2">
            <UserCog className="w-8 h-8 text-marco-azul" /> Usuários
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRoot
              ? 'Clique em qualquer usuário pra gerenciar.'
              : 'Gerenciar a equipe do gabinete.'}
          </p>
        </div>
        <button
          onClick={() => setModalCriar(true)}
          className="bg-marco-azul text-white font-bold px-5 py-2.5 rounded-lg hover:bg-marco-azul-esc text-sm flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Criar usuário
        </button>
      </div>

      {/* Busca */}
      <div className="bg-white rounded-2xl ring-soft p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou papel..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-marco-azul/30"
          />
        </div>
      </div>

      <CriarUsuarioModal open={modalCriar} onClose={() => setModalCriar(false)} isRoot={isRoot} />
      <GerenciarUsuarioModal
        perfil={perfilSelecionado}
        onClose={() => setPerfilSelecionado(null)}
        isRoot={isRoot}
        meuId={auth.user?.id}
        todos={perfis ?? []}
        onAbrir={(p) => setPerfilSelecionado(p)}
      />

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl ring-soft p-12 text-center text-slate-400">
          <UserCog className="w-16 h-16 mx-auto mb-3" />
          <div className="font-medium">Nenhum usuário</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-soft overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtrados.map(p => (
              <button
                key={p.id}
                onClick={() => setPerfilSelecionado(p)}
                className={cn(
                  'w-full text-left p-4 flex items-center gap-3 border-l-4 hover:bg-slate-50 transition',
                  p.pausado ? 'border-l-rose-400 bg-rose-50/30' : 'border-l-transparent'
                )}
              >
                <div className="w-11 h-11 rounded-full bg-marco-azul text-white font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{iniciais(p.nome ?? p.email)}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 truncate flex items-center gap-2 flex-wrap">
                    {p.nome ?? p.email}
                    {p.id === auth.user?.id && (
                      <span className="text-[10px] font-bold bg-marco-amarelo/20 text-marco-amarelo-esc px-1.5 py-0.5 rounded">VOCÊ</span>
                    )}
                    {p.pausado && (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                        <Pause className="w-3 h-3" /> PAUSADO
                      </span>
                    )}
                    {p.aviso && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded inline-flex items-center gap-1" title={p.aviso}>
                        <MessageSquareWarning className="w-3 h-3" /> AVISO
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{p.email}</div>
                </div>

                <span
                  className={cn(
                    'text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 flex-shrink-0',
                    p.papel === 'root' && 'bg-amber-100 text-amber-700',
                    p.papel === 'admin' && 'bg-marco-azul/10 text-marco-azul',
                    p.papel === 'assessor' && 'bg-slate-100 text-slate-600',
                  )}
                >
                  {p.papel === 'root' && <><Crown className="w-3 h-3" /> Root</>}
                  {p.papel === 'admin' && <><Crown className="w-3 h-3" /> Admin</>}
                  {p.papel === 'assessor' && <><Shield className="w-3 h-3" /> Assessor</>}
                </span>

                <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-marco-azul/5 border border-marco-azul/20 rounded-2xl p-5 mt-6 text-sm text-slate-700">
        💡 <strong>Resumo</strong>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>Root</strong> — super-admin. Só vê essa tela.</li>
          <li><strong>Admin</strong> — configura WAHA/IA, gerencia equipe do mandato.</li>
          <li><strong>Assessor</strong> — uso normal do painel.</li>
          <li><strong>Pausar</strong> bloqueia o login. O usuário recebe o "Aviso" como motivo.</li>
          <li><strong>Aviso</strong> aparece como banner amarelo no topo do painel daquele usuário.</li>
          <li><strong>Resetar senha</strong> envia link de recuperação pro e-mail.</li>
        </ul>
      </div>
    </div>
  )
}

// ─── MODAL ÚNICO DE GERENCIAMENTO ────────────────────────────────────
function GerenciarUsuarioModal({
  perfil, onClose, isRoot, meuId, todos, onAbrir,
}: {
  perfil: PerfilRow | null
  onClose: () => void
  isRoot: boolean
  meuId: string | undefined
  todos: PerfilRow[]
  onAbrir: (p: PerfilRow) => void
}) {
  const qc = useQueryClient()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState<'root' | 'admin' | 'assessor'>('assessor')
  const [aviso, setAviso] = useState('')
  const [pausado, setPausado] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Sincroniza estado sempre que abrir um perfil diferente
  useEffect(() => {
    if (!perfil) return
    setNome(perfil.nome ?? '')
    setEmail(perfil.email ?? '')
    setPapel(perfil.papel)
    setAviso(perfil.aviso ?? '')
    setPausado(!!perfil.pausado)
  }, [perfil?.id])

  if (!perfil) return null

  const ehVoce = perfil.id === meuId
  const podeMexer = !ehVoce && (isRoot || perfil.papel !== 'root')

  async function salvar() {
    if (!perfil) return
    const nomeFinal = nome.trim() || perfil.nome || perfil.email?.split('@')[0] || 'Sem nome'
    if (!nomeFinal) {
      toast.error('Informe um nome')
      return
    }
    setSalvando(true)
    try {
      const novoEmail = email.trim().toLowerCase()
      const emailMudou = novoEmail !== (perfil.email ?? '').toLowerCase() && novoEmail.length > 0

      // 1. Atualiza perfis
      const updates: Record<string, unknown> = {
        nome: nomeFinal,
        email: novoEmail || perfil.email,
        aviso: aviso.trim() || null,
      }
      // Só root muda papel/pausado de outros
      if (isRoot && !ehVoce) {
        updates.papel = papel
        updates.pausado = pausado
        updates.pausado_em = pausado ? new Date().toISOString() : null
      }
      const { error } = await (supabase.from('perfis') as any)
        .update(updates)
        .eq('id', perfil.id)
      if (error) throw error

      // 2. Se root mudou e-mail, propaga pra auth.users
      if (emailMudou && isRoot) {
        const { error: rpcErr } = await (supabase.rpc as any)('root_atualizar_email', {
          p_user_id: perfil.id,
          p_novo_email: novoEmail,
        })
        if (rpcErr) throw rpcErr
      }

      qc.invalidateQueries({ queryKey: ['perfis'] })
      toast.success('Usuário atualizado')
      onClose()
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function resetSenha() {
    if (!perfil?.email) { toast.error('Sem e-mail cadastrado'); return }
    if (!confirm(`Enviar link de redefinição de senha pra ${perfil.email}?`)) return
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(perfil.email, {
        redirectTo: window.location.origin + '/login',
      })
      if (error) throw error
      toast.success('Link enviado pro e-mail')
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    }
  }

  async function removerPerfil() {
    if (!perfil) return
    if (!confirm(`Remover ${perfil.nome ?? perfil.email}? (apenas o perfil — a conta de login no Supabase Auth continua existindo)`)) return
    try {
      const { error } = await supabase.from('perfis').delete().eq('id', perfil.id)
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['perfis'] })
      toast.success('Perfil removido')
      onClose()
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    }
  }

  return (
    <Modal open={!!perfil} onClose={onClose} title={`Gerenciar ${perfil.nome ?? perfil.email}`} size="md">
      <div className="space-y-5">
        {/* Cabeçalho do perfil */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-marco-azul text-white font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
            {perfil.avatar_url ? (
              <img src={perfil.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{iniciais(perfil.nome ?? perfil.email)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-800 truncate">{perfil.nome ?? perfil.email}</div>
            <div className="text-xs text-slate-500 truncate">{perfil.email}</div>
          </div>
          {ehVoce && (
            <span className="text-[10px] font-bold bg-marco-amarelo/20 text-marco-amarelo-esc px-2 py-1 rounded">VOCÊ</span>
          )}
        </div>

        {/* Nome */}
        <label className="block">
          <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">Nome *</span>
          <input value={nome} onChange={e => setNome(e.target.value)} className="input" required />
        </label>

        {/* E-mail */}
        <label className="block">
          <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">
            E-mail {isRoot && <span className="text-marco-azul">(login)</span>}
          </span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" />
          {isRoot ? (
            <span className="text-xs text-amber-700 mt-1 block">
              ⚠ Trocar aqui também muda o e-mail de login no Supabase Auth.
            </span>
          ) : (
            <span className="text-xs text-slate-500 mt-1 block">
              Só altera a exibição. Pra mudar o login, peça pra um root.
            </span>
          )}
        </label>

        {/* Papel */}
        {isRoot && !ehVoce && (
          <label className="block">
            <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">Papel</span>
            <select value={papel} onChange={e => setPapel(e.target.value as any)} className="input">
              <option value="assessor">Assessor</option>
              <option value="admin">Admin</option>
              <option value="root">Root (super-admin)</option>
            </select>
          </label>
        )}

        {/* Pausa */}
        {isRoot && !ehVoce && (
          <label className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={pausado}
              onChange={e => setPausado(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-rose-500 focus:ring-rose-500/30"
            />
            <div className="flex-1">
              <div className="text-sm font-bold text-rose-800 flex items-center gap-2">
                <Pause className="w-4 h-4" /> Pausar acesso
              </div>
              <div className="text-xs text-rose-700 mt-0.5">
                Bloqueia o login. O usuário recebe o "Aviso" como motivo.
              </div>
            </div>
            {pausado && <Pause className="w-5 h-5 text-rose-500" />}
            {!pausado && <Play className="w-5 h-5 text-emerald-500" />}
          </label>
        )}

        {/* Aviso */}
        {(isRoot || ehVoce) && (
          <label className="block">
            <span className="text-xs font-bold text-slate-600 uppercase mb-1 block flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Aviso (banner amarelo no painel)
            </span>
            <textarea
              value={aviso}
              onChange={e => setAviso(e.target.value)}
              rows={3}
              className="input w-full"
              placeholder="Ex: Mensalidade em atraso. Regularize até dia 15."
            />
            <span className="text-xs text-slate-500 mt-1 block">
              Deixe em branco pra remover.
            </span>
          </label>
        )}

        {/* Assessores desta conta (se for admin) */}
        {perfil.papel === 'admin' && (() => {
          const assessores = todos.filter(t => t.criado_por === perfil.id)
          return (
            <div className="border-t border-slate-100 pt-4">
              <div className="text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-marco-azul" />
                Assessores desta conta ({assessores.length})
              </div>
              {assessores.length === 0 ? (
                <div className="text-sm text-slate-400 italic px-3 py-2">
                  Esta conta ainda não tem assessores cadastrados.
                </div>
              ) : (
                <div className="space-y-1">
                  {assessores.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onAbrir(a)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition text-left',
                        a.pausado && 'bg-rose-50/40'
                      )}
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                        {iniciais(a.nome ?? a.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-800 truncate flex items-center gap-1.5">
                          {a.nome ?? a.email}
                          {a.pausado && (
                            <Pause className="w-3 h-3 text-rose-500" />
                          )}
                          {a.aviso && (
                            <MessageSquareWarning className="w-3 h-3 text-amber-600" />
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{a.email}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* Ações secundárias */}
        {podeMexer && (
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <button
              type="button"
              onClick={resetSenha}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-sm"
            >
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                <KeyRound className="w-4 h-4" /> Resetar senha (envia link por e-mail)
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={removerPerfil}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 transition text-sm text-rose-700"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Trash2 className="w-4 h-4" /> Remover perfil
              </span>
              <ChevronRight className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-6 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── CRIAR USUÁRIO ──────────────────────────────────────────────────
function CriarUsuarioModal({ open, onClose, isRoot }: { open: boolean; onClose: () => void; isRoot: boolean }) {
  const qc = useQueryClient()
  const auth = useAuth()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [papel, setPapel] = useState<'root' | 'admin' | 'assessor'>('assessor')
  const [salvando, setSalvando] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !senha || senha.length < 8) {
      toast.error('Senha precisa de no mínimo 8 caracteres')
      return
    }
    if (!nome.trim()) {
      toast.error('Informe o nome')
      return
    }
    setSalvando(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome, papel } },
      })
      if (error) throw error
      const userId = data.user?.id
      if (!userId) throw new Error('Falha ao criar usuário')

      await (supabase.from('perfis') as any).upsert({
        id: userId,
        email,
        nome: nome.trim(),
        papel,
        criado_por: auth.user?.id ?? null,
      })

      qc.invalidateQueries({ queryKey: ['perfis'] })
      toast.success(`${nome} criado(a)!`)
      setNome(''); setEmail(''); setSenha(''); setPapel('assessor')
      onClose()
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Criar novo usuário" size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">Nome *</span>
          <input value={nome} onChange={e => setNome(e.target.value)} required className="input" placeholder="Maria Silva" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">E-mail *</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">Senha *</span>
          <input type="text" value={senha} onChange={e => setSenha(e.target.value)} required minLength={8} className="input font-mono" placeholder="mín 8 chars" />
          <span className="text-xs text-slate-500 mt-1 block">A pessoa pode trocar depois</span>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">Papel</span>
          <select value={papel} onChange={e => setPapel(e.target.value as any)} className="input">
            <option value="assessor">Assessor (uso comum)</option>
            <option value="admin">Admin (configura tudo)</option>
            {isRoot && <option value="root">Root (super-admin)</option>}
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button type="submit" disabled={salvando} className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50">
            {salvando ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
