import { useQuery } from '@tanstack/react-query'
import { eleitoradoAtual, eleitoradoHistorico, listarLocaisVotacao } from '@/lib/tre-sp'

export function useEleitoradoAtual() {
  return useQuery({
    queryKey: ['tre-sp', 'eleitorado-atual'],
    queryFn: eleitoradoAtual,
    staleTime: 60 * 60_000, // 1h
  })
}

export function useEleitoradoHistorico() {
  return useQuery({
    queryKey: ['tre-sp', 'eleitorado-historico'],
    queryFn: eleitoradoHistorico,
    staleTime: 24 * 60 * 60_000, // 1 dia
  })
}

export function useLocaisVotacao(zona = '066', ano = new Date().getFullYear(), mes = 10) {
  return useQuery({
    queryKey: ['tre-sp', 'locais', zona, ano, mes],
    queryFn: () => listarLocaisVotacao({ zona, ano, mes }),
    staleTime: 24 * 60 * 60_000,
  })
}
