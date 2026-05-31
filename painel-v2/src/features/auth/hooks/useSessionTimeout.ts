import { useEffect, useRef } from 'react'
import { useAuth } from '@/store/auth'

const TIMEOUT_MS = 20 * 60 * 1000           // 20 minutos
const AVISO_ANTES_MS = 60 * 1000            // avisa 1 min antes
const STORAGE_KEY = 'mx_ultima_atividade'

const EVENTOS_ATIVIDADE = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const

/**
 * Desloga o usuário após 20 min de inatividade.
 *
 * Detecta atividade via mouse/teclado/touch/scroll. Cada interação atualiza
 * o timestamp em localStorage (compartilhado entre abas — se você usa o
 * painel em duas abas, atividade numa conta pra outra).
 *
 * Mostra um confirm 1 min antes do logout pra dar chance de continuar.
 */
export function useSessionTimeout() {
  const signOut = useAuth(s => s.signOut)
  const user = useAuth(s => s.user)
  const avisoMostrado = useRef(false)

  useEffect(() => {
    if (!user) return

    function marcarAtividade() {
      try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch {}
      avisoMostrado.current = false
    }

    // Marca início e escuta interações
    marcarAtividade()
    EVENTOS_ATIVIDADE.forEach(ev => window.addEventListener(ev, marcarAtividade, { passive: true }))

    const intervalo = setInterval(() => {
      const ultima = Number(localStorage.getItem(STORAGE_KEY) || 0)
      if (!ultima) return
      const parado = Date.now() - ultima

      if (parado >= TIMEOUT_MS) {
        clearInterval(intervalo)
        EVENTOS_ATIVIDADE.forEach(ev => window.removeEventListener(ev, marcarAtividade))
        signOut().then(() => {
          // Recarrega pra forçar o roteamento pra /login
          alert('Sessão encerrada por inatividade (20 min). Faça login novamente.')
          window.location.href = '/login'
        })
        return
      }

      if (parado >= TIMEOUT_MS - AVISO_ANTES_MS && !avisoMostrado.current) {
        avisoMostrado.current = true
        const continuar = confirm('Sua sessão vai expirar em 1 minuto por inatividade. Continuar logado?')
        if (continuar) marcarAtividade()
      }
    }, 10_000) // checa a cada 10s

    return () => {
      clearInterval(intervalo)
      EVENTOS_ATIVIDADE.forEach(ev => window.removeEventListener(ev, marcarAtividade))
    }
  }, [user, signOut])
}
