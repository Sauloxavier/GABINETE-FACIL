import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Perfil } from '@/lib/database.types'

export interface AuthState {
  session: Session | null
  user: User | null
  perfil: Perfil | null
  loading: boolean
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshPerfil: () => Promise<void>
  isAdmin: () => boolean
  isRoot: () => boolean
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  perfil: null,
  loading: true,

  async init() {
    const { data } = await supabase.auth.getSession()
    set({ session: data.session, user: data.session?.user ?? null })
    await get().refreshPerfil()

    // Se já está logado e o perfil aparece pausado, força logout
    const perfilAtual = get().perfil
    if (perfilAtual?.pausado) {
      await supabase.auth.signOut()
      set({ session: null, user: null, perfil: null })
    }
    set({ loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null })
      await get().refreshPerfil()
    })
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }

    // Após login, verifica se o perfil está pausado
    const userId = data.user?.id
    if (userId) {
      const { data: perfil } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (perfil && (perfil as any).pausado) {
        await supabase.auth.signOut()
        const msg = (perfil as any).aviso
          ? `Acesso pausado: ${(perfil as any).aviso}`
          : 'Sua conta está pausada. Contate o administrador.'
        return { error: msg }
      }
    }
    return { error: null }
  },

  async signOut() {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('[signOut]', err)
    }
    set({ session: null, user: null, perfil: null })
    try {
      localStorage.removeItem('mx_supabase_auth')
      localStorage.removeItem('mazyos-rq-cache')
    } catch {}
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  },

  async refreshPerfil() {
    const userId = get().user?.id
    if (!userId) { set({ perfil: null }); return }
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.warn('[refreshPerfil]', error)
      set({ perfil: null })
      return
    }
    set({ perfil: (data ?? null) as any })
  },

  isAdmin() {
    const p = get().perfil
    return !!p && (p.papel === 'admin' || p.papel === 'root')
  },

  isRoot() {
    return get().perfil?.papel === 'root'
  },
}))
