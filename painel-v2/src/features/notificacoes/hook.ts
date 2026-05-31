import { useMemo, useState, useEffect, useCallback } from 'react'
import { Bell, AlertTriangle, MessageSquare, Cake, Calendar, type LucideIcon } from 'lucide-react'
import { useEleitores } from '@/features/eleitores/hooks'
import { useDemandas } from '@/features/demandas/hooks'
import { useCompromissos } from '@/features/compromissos/hooks'

export interface Notificacao {
  id: string
  titulo: string
  desc: string
  icon: LucideIcon
  cor: string
  link?: string
}

const STORAGE_KEY = 'mx_notif_lidas'

function lerLidas(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch { return new Set() }
}
function salvarLidas(lidas: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...lidas])) } catch {}
}

export function useNotificacoes() {
  const { data: eleitores } = useEleitores()
  const { data: demandas } = useDemandas()
  const { data: compromissos } = useCompromissos()
  const [lidas, setLidas] = useState<Set<string>>(() => lerLidas())

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLidas(lerLidas())
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const todas = useMemo<Notificacao[]>(() => {
    const items: Notificacao[] = []

    // Aniversariantes hoje
    const hoje = new Date()
    const mmddHoje = `${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    const aniversariantes = (eleitores ?? []).filter(e => e.nascimento?.slice(5) === mmddHoje)
    if (aniversariantes.length > 0) {
      items.push({
        id: `aniv-${hoje.toISOString().slice(0, 10)}`,
        titulo: `${aniversariantes.length} aniversariante(s) hoje! 🎂`,
        desc: aniversariantes.slice(0, 3).map(e => e.nome).join(', ') + (aniversariantes.length > 3 ? '...' : ''),
        icon: Cake,
        cor: 'bg-marco-amarelo/20 text-marco-amarelo-esc',
        link: '/aniversariantes',
      })
    }

    // Demandas paradas há +30 dias
    const trintaDiasAtras = Date.now() - 30 * 86400000
    const paradas = (demandas ?? []).filter(d =>
      (d.status === 'Aberta' || d.status === 'Em andamento') &&
      new Date(d.data || 0).getTime() < trintaDiasAtras
    )
    if (paradas.length > 0) {
      items.push({
        id: `paradas-30d-${paradas.length}`,
        titulo: `${paradas.length} atendimento(s) parado(s) há 30+ dias`,
        desc: 'Revise o status pra não deixar promessa esquecida.',
        icon: AlertTriangle,
        cor: 'bg-rose-100 text-rose-600',
        link: '/atendimentos',
      })
    }

    // Compromissos próximos 3 dias
    const tresDias = Date.now() + 3 * 86400000
    const hojeStr = hoje.toISOString().slice(0, 10)
    const proximos = (compromissos ?? []).filter(c => {
      if (!c.data) return false
      const d = new Date(c.data).getTime()
      return d >= Date.now() - 86400000 && d <= tresDias && c.data >= hojeStr
    })
    if (proximos.length > 0) {
      items.push({
        id: `compromissos-${hojeStr}-${proximos.length}`,
        titulo: `${proximos.length} compromisso(s) nos próximos 3 dias`,
        desc: proximos.slice(0, 2).map(c => `${c.titulo} (${c.data})`).join(' · '),
        icon: Calendar,
        cor: 'bg-blue-100 text-blue-600',
        link: '/agenda',
      })
    }

    // Eleitores sem telefone
    const semTel = (eleitores ?? []).filter(e => !(e.telefone ?? '').trim()).length
    if (semTel > 0) {
      items.push({
        id: `sem-tel-${semTel}`,
        titulo: `${semTel} eleitor(es) sem telefone`,
        desc: 'Sem telefone não dá pra disparar mensagens.',
        icon: MessageSquare,
        cor: 'bg-amber-100 text-amber-600',
        link: '/eleitores',
      })
    }

    return items
  }, [eleitores, demandas, compromissos])

  const naoLidas = useMemo(() => todas.filter(n => !lidas.has(n.id)), [todas, lidas])

  const marcarLida = useCallback((id: string) => {
    setLidas(prev => {
      const next = new Set(prev)
      next.add(id)
      salvarLidas(next)
      return next
    })
  }, [])

  const marcarTodasLidas = useCallback(() => {
    setLidas(prev => {
      const next = new Set(prev)
      todas.forEach(n => next.add(n.id))
      salvarLidas(next)
      return next
    })
  }, [todas])

  const limparLidas = useCallback(() => {
    setLidas(new Set())
    salvarLidas(new Set())
  }, [])

  return {
    todas,
    naoLidas,
    contagem: naoLidas.length,
    marcarLida,
    marcarTodasLidas,
    limparLidas,
    foiLida: (id: string) => lidas.has(id),
  }
}

// Sinaliza ao Bell que tem notificação (também usado pra título da aba)
export { Bell }
