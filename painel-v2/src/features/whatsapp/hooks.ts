import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { WahaClient } from '@/lib/waha'
import { useConfig } from '@/features/config/hooks'

export function useWaha() {
  const { data: config } = useConfig()
  return useMemo(() => {
    if (!config) return null
    return new WahaClient(config)
  }, [config])
}

export function useWahaStatus() {
  const waha = useWaha()
  return useQuery({
    queryKey: ['waha', 'status'],
    queryFn: () => waha!.status(),
    enabled: !!waha?.isConfigured,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  })
}

export function useChats() {
  const waha = useWaha()
  return useQuery({
    queryKey: ['waha', 'chats'],
    queryFn: () => waha!.listarChats(50),
    enabled: !!waha?.isConfigured,
    staleTime: 30_000,
  })
}

export function useMensagens(chatId: string | null) {
  const waha = useWaha()
  return useQuery({
    queryKey: ['waha', 'msgs', chatId],
    queryFn: () => waha!.mensagens(chatId!, 50),
    enabled: !!waha?.isConfigured && !!chatId,
    refetchInterval: chatId ? 5_000 : false,
  })
}

/** Foto de perfil do contato — cacheada 24h */
export function useFotoPerfil(chatId: string | null) {
  const waha = useWaha()
  return useQuery({
    queryKey: ['waha', 'foto', chatId],
    queryFn: () => waha!.fotoPerfil(chatId!),
    enabled: !!waha?.isConfigured && !!chatId && !chatId.endsWith('@lid'),
    staleTime: 24 * 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    retry: false,
  })
}

export function useEnviarMensagem() {
  const waha = useWaha()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ chatId, texto }: { chatId: string; texto: string }) => {
      if (!waha) throw new Error('WAHA não configurado')
      await waha.enviarTexto(chatId, texto)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['waha', 'msgs', vars.chatId] })
    },
  })
}
