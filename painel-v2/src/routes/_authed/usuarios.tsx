import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  UserCog, Crown, Shield, UserPlus, Pause, Play, KeyRound,
  AlertTriangle, Trash2, MoreVertical, Search, MessageSquareWarning,
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
  const qc = useQueryClient()

  const [busca, setBusca] = useState('')
  const [modalCriar, setModalCriar] = useState(false)
  const [editando, setEditando] = useState<PerfilRow | null>(null)
  const [resetSenha, setResetSenha] = useState<PerfilRow | null>(null)
  const [avisoEdit, setAvisoEdit] = useState<PerfilRow | null>(null)

  const mudarPapel = useMutation({
    mutationFn: async ({ id, papel }: { id: string; papel: 'root' | 'admin' | 'assessor' }) => {
      const { error } = await (supabase.from('perfis') as any).update({ papel }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perfis'] })
      toast.success('Papel atualizado')
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const togglePausar = useMutation({
    mutationFn: async (p: PerfilRow) => {
      const novo = !p.pausado
      const { error } = await (supabase.from('perfis') as any)
        .update({ pausado: novo, pausado_em: novo ? new Date().toISOString() : null })
        .eq('id', p.id)
      if (error) throw error
    },
    onSuccess: (_, p) => {
      qc.invalidateQueries({ queryKey: ['perfis'] })
      toast.success(p.pausado ? 'Usuário reativado' : 'Usuário pausado')
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const deletar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('perfis').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perfis'] })
      toast.success('Perfil removido')
    },
    onError: (err) => toast.error((err as Error).message),
  })

  function alterarPapel(p: PerfilRow) {
    if (p.id === auth.user?.id) {
      toast.warn('Você não pode mudar seu próprio papel')
      return
    }
    if (p.papel === 'root' && !isRoot) {
      toast.error('Só root pode mexer em root')
      return
    }
    const opcoes: Array<'root' | 'admin' | 'assessor'> = isRoot
      ? ['root', 'admin', 'assessor']
      : ['admin', 'assessor']
    const atual = p.papel
    const idx = opcoes.indexOf(atual)
    const novo = opcoes[(idx + 1) % opcoes.length]
    if (!confirm(`Mudar ${p.nome ?? p.email} de "${atual}" para "${novo}"?`)) return
    mudarPapel.mutate({ id: p.id, papel: novo })
  }

  function pausar(p: PerfilRow) {
    if (p.id === auth.user?.id) {
      toast.warn('Você não pode pausar a si mesmo')
      return
    }
    togglePausar.mutate(p)
  }

  function removerPerfil(p: PerfilRow) {
    if (p.id === auth.user?.id) {
      toast.warn('Você não pode deletar a si mesmo')
      return
    }
    if (!confirm(`Remover ${p.nome ?? p.email} do sistema? (apenas o perfil — a conta de login continua)`)) return
    deletar.mutate(p.id)
  }

  const filtrados = (perfis ?? []).filter(p => {
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
              ? 'Gestão completa de contas — criar, pausar, resetar senha, avisos.'
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
      <ResetSenhaModal perfil={resetSenha} onClose={() => setResetSenha(null)} />
      <AvisoModal perfil={avisoEdit} onClose={() => setAvisoEdit(null)} />
      <EditarPerfilModal perfil={editando} onClose={() => setEditando(null)} />

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
            {filtrados.map(p => {
              const podeMexer = p.id !== auth.user?.id && (isRoot || p.papel !== 'root')
              return (
                <div
                  key={p.id}
                  className={cn(
                    'p-4 flex items-center gap-3 border-l-4',
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

                  <button
                    onClick={() => alterarPapel(p)}
                    disabled={!podeMexer}
                    className={cn(
                      'text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed',
                      p.papel === 'root' && 'bg-amber-100 text-amber-700 hover:bg-amber-200',
                      p.papel === 'admin' && 'bg-marco-azul/10 text-marco-azul hover:bg-marco-azul hover:text-white',
                      p.papel === 'assessor' && 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    )}
                    title="Clique para alternar papel"
                  >
                    {p.papel === 'root' && <><Crown className="w-3 h-3" /> Root</>}
                    {p.papel === 'admin' && <><Crown className="w-3 h-3" /> Admin</>}
                    {p.papel === 'assessor' && <><Shield className="w-3 h-3" /> Assessor</>}
                  </button>

                  <AcoesMenu
                    perfil={p}
                    podeMexer={podeMexer}
                    onResetSenha={() => setResetSenha(p)}
                    onPausar={() => pausar(p)}
                    onAviso={() => setAvisoEdit(p)}
                    onDeletar={() => removerPerfil(p)}
                    onEditar={() => setEditando(p)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-marco-azul/5 border border-marco-azul/20 rounded-2xl p-5 mt-6 text-sm text-slate-700">
        💡 <strong>Resumo</strong>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>Root</strong> — super-admin (você). Só vê essa tela.</li>
          <li><strong>Admin</strong> — configura WAHA/IA, gerencia equipe do mandato.</li>
          <li><strong>Assessor</strong> — uso normal do painel.</li>
          <li><strong>Pausar</strong> bloqueia o login. O usuário recebe a mensagem do "Aviso" como motivo.</li>
          <li><strong>Aviso</strong> aparece como banner amarelo no topo do painel para o usuário (mesmo sem estar pausado).</li>
          <li><strong>Resetar senha</strong> envia link de recuperação pro e-mail.</li>
        </ul>
      </div>
    </div>
  )
}

function AcoesMenu({
  perfil, podeMexer, onResetSenha, onPausar, onAviso, onDeletar, onEditar,
}: {
  perfil: PerfilRow
  podeMexer: boolean
  onResetSenha: () => void
  onPausar: () => void
  onAviso: () => void
  onDeletar: () => void
  onEditar: () => void
}) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setAberto(v => !v)}
        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
        title="Ações"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setAberto(false)} />
          <div className="absolute right-0 top-10 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-40 overflow-hidden">
            <button
              onClick={() => { onEditar(); setAberto(false) }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2"
            >
              <UserCog className="w-4 h-4 text-slate-500" /> Editar nome/e-mail
            </button>
            <button
              onClick={() => { onResetSenha(); setAberto(false) }}
              disabled={!podeMexer}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 disabled:opacity-40 flex items-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-slate-500" /> Resetar senha
            </button>
            <button
              onClick={() => { onAviso(); setAberto(false) }}
              disabled={!podeMexer}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 disabled:opacity-40 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              {perfil.aviso ? 'Editar aviso' : 'Adicionar aviso'}
            </button>
            <button
              onClick={() => { onPausar(); setAberto(false) }}
              disabled={!podeMexer}
              className={cn(
                'w-full text-left px-4 py-2.5 text-sm disabled:opacity-40 flex items-center gap-2',
                perfil.pausado ? 'hover:bg-emerald-50 text-emerald-700' : 'hover:bg-rose-50 text-rose-700'
              )}
            >
              {perfil.pausado ? <><Play className="w-4 h-4" /> Reativar</> : <><Pause className="w-4 h-4" /> Pausar</>}
            </button>
            <div className="border-t border-slate-100" />
            <button
              onClick={() => { onDeletar(); setAberto(false) }}
              disabled={!podeMexer}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-rose-50 disabled:opacity-40 flex items-center gap-2 text-rose-700"
            >
              <Trash2 className="w-4 h-4" /> Remover perfil
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function CriarUsuarioModal({ open, onClose, isRoot }: { open: boolean; onClose: () => void; isRoot: boolean }) {
  const qc = useQueryClient()
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

      // upsert do perfil (caso o trigger não tenha rodado)
      await (supabase.from('perfis') as any).upsert({
        id: userId,
        email,
        nome: nome || email.split('@')[0],
        papel,
      })

      qc.invalidateQueries({ queryKey: ['perfis'] })
      toast.success(`${nome ?? email} criado(a)!`)
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
          <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">Nome</span>
          <input value={nome} onChange={e => setNome(e.target.value)} className="input" placeholder="Maria Silva" />
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

function ResetSenhaModal({ perfil, onClose }: { perfil: PerfilRow | null; onClose: () => void }) {
  const [enviando, setEnviando] = useState(false)
  if (!perfil) return null

  async function enviar() {
    if (!perfil?.email) {
      toast.error('Usuário sem e-mail cadastrado')
      return
    }
    setEnviando(true)
    try {
      const redirectTo = window.location.origin + '/login'
      const { error } = await supabase.auth.resetPasswordForEmail(perfil.email, { redirectTo })
      if (error) throw error
      toast.success('Link de reset enviado pro e-mail')
      onClose()
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal open={!!perfil} onClose={onClose} title="Resetar senha" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Vamos enviar um link de redefinição de senha pro e-mail:
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-sm">
          {perfil.email}
        </div>
        <p className="text-xs text-slate-500">
          O usuário recebe um e-mail com link pra escolher uma nova senha.
          Link válido por 1 hora.
        </p>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button onClick={enviar} disabled={enviando} className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50">
            {enviando ? 'Enviando...' : 'Enviar link'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function AvisoModal({ perfil, onClose }: { perfil: PerfilRow | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [texto, setTexto] = useState(perfil?.aviso ?? '')
  const [salvando, setSalvando] = useState(false)

  if (!perfil) return null

  // Sincroniza quando troca de perfil
  if (perfil && texto !== (perfil.aviso ?? '') && !salvando) {
    // best-effort init — só na primeira render
  }

  async function salvar(remover = false) {
    setSalvando(true)
    try {
      const { error } = await (supabase.from('perfis') as any)
        .update({ aviso: remover ? null : (texto.trim() || null) })
        .eq('id', perfil!.id)
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['perfis'] })
      toast.success(remover ? 'Aviso removido' : 'Aviso salvo')
      onClose()
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={!!perfil} onClose={onClose} title={`Aviso para ${perfil.nome ?? perfil.email}`} size="md">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Mensagem que aparece como banner amarelo no topo do painel desse usuário.
          Útil pra avisos de cobrança, mudança de plano, manutenção, etc.
        </p>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          rows={4}
          className="input w-full"
          placeholder="Ex: Mensalidade em atraso. Regularize até dia 15 para evitar a suspensão do acesso."
        />
        <div className="flex justify-between items-center gap-2 pt-3 border-t border-slate-100">
          {perfil.aviso ? (
            <button
              onClick={() => salvar(true)}
              disabled={salvando}
              className="text-sm font-semibold text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg disabled:opacity-50"
            >
              Remover aviso
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button
              onClick={() => salvar(false)}
              disabled={salvando || !texto.trim()}
              className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar aviso'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function EditarPerfilModal({ perfil, onClose }: { perfil: PerfilRow | null; onClose: () => void }) {
  const qc = useQueryClient()
  const auth = useAuth()
  const isRoot = auth.isRoot()
  const [nome, setNome] = useState(perfil?.nome ?? '')
  const [email, setEmail] = useState(perfil?.email ?? '')
  const [salvando, setSalvando] = useState(false)

  if (!perfil) return null

  async function salvar() {
    setSalvando(true)
    try {
      const novoEmail = email.trim().toLowerCase()
      const emailMudou = novoEmail !== (perfil!.email ?? '').toLowerCase() && novoEmail.length > 0

      // 1. Atualiza nome e email da tabela perfis
      const { error } = await (supabase.from('perfis') as any)
        .update({ nome: nome.trim() || null, email: novoEmail || null })
        .eq('id', perfil!.id)
      if (error) throw error

      // 2. Se mudou o e-mail E é root, troca o e-mail de login (auth.users) via RPC
      if (emailMudou && isRoot) {
        const { error: rpcErr } = await (supabase.rpc as any)('root_atualizar_email', {
          p_user_id: perfil!.id,
          p_novo_email: novoEmail,
        })
        if (rpcErr) throw rpcErr
      }

      qc.invalidateQueries({ queryKey: ['perfis'] })
      toast.success(
        emailMudou && isRoot ? 'Perfil + e-mail de login atualizados' : 'Perfil atualizado'
      )
      onClose()
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={!!perfil} onClose={onClose} title="Editar perfil" size="sm">
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">Nome</span>
          <input value={nome} onChange={e => setNome(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">
            E-mail {isRoot && <span className="text-marco-azul">(login)</span>}
          </span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" />
          {isRoot ? (
            <span className="text-xs text-amber-700 mt-1 block">
              ⚠ Mudar o e-mail aqui também troca o e-mail de login no Supabase Auth.
              O usuário precisará entrar com o novo e-mail.
            </span>
          ) : (
            <span className="text-xs text-slate-500 mt-1 block">
              Só altera o nome de exibição. Para mudar o login, peça pra um root.
            </span>
          )}
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50">
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
