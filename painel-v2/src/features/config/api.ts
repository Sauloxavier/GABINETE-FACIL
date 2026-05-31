import { supabase } from '@/lib/supabase'

// Map de todas as chaves de config conhecidas e seus tipos
export interface AppConfig {
  nome_vereador: string
  proxima_eleicao: string
  // WAHA
  waha_url: string
  waha_api_key: string
  waha_session: string
  // OpenAI
  openai_api_key: string
  openai_model: string
  atendimento_ia_prompt: string
  atendimento_ia_ativo: boolean
  // Marcadores e nichos compartilhados
  marcadores: string[]
  nichos: string[]
  // Templates de mensagem
  mensagens_padrao: Array<{ id: string; nome: string; categoria: string; conteudo: string }>
  dias_sem_contato: number
  cartas_texto_base: string
}

const defaults: AppConfig = {
  nome_vereador: 'Marco Xavier',
  proxima_eleicao: '2028-10-01',
  waha_url: '',
  waha_api_key: '',
  waha_session: 'default',
  openai_api_key: '',
  openai_model: 'gpt-4o-mini',
  atendimento_ia_prompt: '',
  atendimento_ia_ativo: false,
  marcadores: [],
  nichos: [],
  mensagens_padrao: [],
  dias_sem_contato: 60,
  cartas_texto_base: '',
}

export async function lerConfig(): Promise<AppConfig> {
  const { data, error } = await supabase.from('config').select('*')
  if (error) throw error
  const result = { ...defaults }
  for (const row of (data ?? []) as Array<{ chave: string; valor: unknown }>) {
    if (row.chave in result) {
      (result as Record<string, unknown>)[row.chave] = row.valor
    }
  }
  return result
}

export async function salvarConfig(chave: keyof AppConfig, valor: unknown): Promise<void> {
  const { error } = await (supabase.from('config') as any).upsert(
    { chave, valor },
    { onConflict: 'chave' }
  )
  if (error) throw error
}

export async function salvarConfigBatch(updates: Partial<AppConfig>): Promise<void> {
  const rows = Object.entries(updates).map(([chave, valor]) => ({ chave, valor }))
  if (rows.length === 0) return
  const { error } = await (supabase.from('config') as any).upsert(rows, { onConflict: 'chave' })
  if (error) throw error
}
