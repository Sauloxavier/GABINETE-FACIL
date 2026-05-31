// Status de demanda/atendimento.
// O valor armazenado no banco é o mesmo da v1 ("Aberta" etc) pra manter
// compatibilidade, mas o LABEL exibido na UI usa a nomenclatura nova.

export const STATUS_DEMANDA = [
  { valor: 'Aberta',       label: 'Não iniciado', cor: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
  { valor: 'Em andamento', label: 'Pendência',    cor: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  { valor: 'Resolvida',    label: 'Concluída',    cor: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  { valor: 'Cancelada',    label: 'Cancelada',    cor: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400' },
] as const

export type StatusValor = (typeof STATUS_DEMANDA)[number]['valor']

export function labelStatusDemanda(valor: string | null | undefined): string {
  return STATUS_DEMANDA.find(s => s.valor === valor)?.label ?? (valor ?? '—')
}

export function corStatusDemanda(valor: string | null | undefined) {
  return STATUS_DEMANDA.find(s => s.valor === valor) ?? STATUS_DEMANDA[0]
}

// Pra UIs que mostram colunas/categorias (kanban)
export const STATUS_DEMANDA_COLS = STATUS_DEMANDA.filter(s => s.valor !== 'Cancelada')
