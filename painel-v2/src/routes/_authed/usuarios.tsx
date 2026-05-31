import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { UserCog, Crown, Shield, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth, type AuthState } from '@/store/auth'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { iniciais } from '@/lib/utils'

export const Route = createFileRoute('/_authed/usuarios')({
  beforeLoad: ({ context }) => {
    const auth = (context as { auth: AuthState }).auth
    if (auth.perfil?.papel !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  component: UsuariosPage,
})

interface PerfilRow {
  id: string  // = auth.users.id (compat v1)
  nome: string | null
  email: string | null
  papel: 'admin' | 'assessor'
  avatar_url: string | null
  criado_em: string
}

function usePerfis() {
  return useQuery({
    queryKey: ['perfis'],
    queryFn: async (): Promise<PerfilRow[]> => {
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .order('nome', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as PerfilRow[]
    },
  })
}

function UsuariosPage() {
  const { data: perfis, isLoading } = usePerfis()
  const auth = useAuth()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)

  const mudarPapel = useMutation({
    mutationFn: async ({ id, papel }: { id: string; papel: 'admin' | 'assessor' }) => {
      const { error } = await (supabase.from('perfis') as any).update({ papel }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perfis'] })
      toast.success('Papel atualizado')
    },
    onError: (err) => toast.error((err as Error).message),
  })

  async function alterarPapel(p: PerfilRow) {
    if (p.id === auth.user?.id) {
      toast.warn('Você não pode mudar seu próprio papel')
      return
    }
    const novo = p.papel === 'admin' ? 'assessor' : 'admin'
    if (!confirm(`Tornar ${p.nome ?? p.email} como ${novo}?`)) return
    mudarPapel.mutate({ id: p.id, papel: novo })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-6 gap-3">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 flex items-center gap-2">
          <UserCog className="w-8 h-8 text-marco-azul" /> Usuários
        </h1>
        <button onClick={() => setModalOpen(true)} className="bg-marco-azul text-white font-bold px-5 py-2.5 rounded-lg hover:bg-marco-azul-esc text-sm flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Convidar usuário
        </button>
      </div>

      <ConvidarModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Carregando equipe...</div>
      ) : !perfis || perfis.length === 0 ? (
        <div className="bg-white rounded-2xl ring-soft p-12 text-center text-slate-400">
          <UserCog className="w-16 h-16 mx-auto mb-3" />
          <div className="font-medium">Nenhum usuário cadastrado</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-soft overflow-hidden">
          <div className="divide-y divide-slate-100">
            {perfis.map(p => (
              <div key={p.id} className="p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-marco-azul text-white font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{iniciais(p.nome ?? p.email)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 truncate flex items-center gap-2">
                    {p.nome ?? p.email}
                    {p.id === auth.user?.id && (
                      <span className="text-[10px] font-bold bg-marco-amarelo/20 text-marco-amarelo-esc px-1.5 py-0.5 rounded">VOCÊ</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{p.email}</div>
                </div>
                <button
                  onClick={() => alterarPapel(p)}
                  className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 transition ${
                    p.papel === 'admin'
                      ? 'bg-marco-azul/10 text-marco-azul hover:bg-marco-azul hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.papel === 'admin' ? <Crown className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                  {p.papel === 'admin' ? 'Admin' : 'Assessor'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-marco-azul/5 border border-marco-azul/20 rounded-2xl p-5 mt-6 text-sm text-slate-700">
        💡 <strong>Como funciona:</strong>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>Admin</strong> — pode configurar WAHA/IA, gerenciar equipe, ver tudo</li>
          <li><strong>Assessor</strong> — usa o painel sem mexer em configurações</li>
          <li>Convidar: cria conta nova no Supabase Auth → vincula perfil ao gabinete</li>
        </ul>
      </div>
    </div>
  )
}

function ConvidarModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [papel, setPapel] = useState<'admin' | 'assessor'>('assessor')
  const [salvando, setSalvando] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !senha || senha.length < 8) {
      toast.error('Senha precisa de no mínimo 8 caracteres')
      return
    }
    setSalvando(true)
    try {
      // Cria conta via signup (Supabase pode exigir email confirmation, mas é o caminho mais simples sem Edge Function)
      const { data, error } = await supabase.auth.signUp({ email, password: senha })
      if (error) throw error
      const userId = data.user?.id
      if (!userId) throw new Error('Falha ao criar usuário')

      // Cria perfil vinculado (compat v1: id = user_id)
      const { error: errPerfil } = await (supabase.from('perfis') as any).insert({
        id: userId, email, nome, papel,
      })
      if (errPerfil) throw errPerfil

      qc.invalidateQueries({ queryKey: ['perfis'] })
      toast.success(`${nome ?? email} convidado(a)!`)
      setNome(''); setEmail(''); setSenha(''); setPapel('assessor')
      onClose()
    } catch (err) {
      toast.error('Erro: ' + (err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Convidar novo usuário" size="md">
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
          <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">Senha temporária *</span>
          <input type="text" value={senha} onChange={e => setSenha(e.target.value)} required minLength={8} className="input font-mono" placeholder="mín 8 chars" />
          <span className="text-xs text-slate-500 mt-1 block">A pessoa pode trocar depois</span>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">Papel</span>
          <select value={papel} onChange={e => setPapel(e.target.value as 'admin' | 'assessor')} className="input">
            <option value="assessor">Assessor (uso comum)</option>
            <option value="admin">Admin (configura tudo)</option>
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button type="submit" disabled={salvando} className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50">
            {salvando ? 'Criando...' : 'Convidar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
