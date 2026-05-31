// Cliente OpenAI (ChatGPT) — chamadas diretas do navegador.
// Em produção real, mover pra Edge Function pra não expor a chave.

import type { AppConfig } from '@/features/config/api'

type OpenAICfg = Pick<AppConfig, 'openai_api_key' | 'openai_model'>

interface ChamarOpts {
  system?: string
  prompt: string
  maxTokens?: number
  json?: boolean
}

export class OpenAIClient {
  private cfg: OpenAICfg
  constructor(cfg: OpenAICfg) {
    this.cfg = cfg
  }

  get isConfigured() {
    return !!(this.cfg.openai_api_key && this.cfg.openai_api_key.startsWith('sk-'))
  }

  async chamar({ system, prompt, maxTokens = 2000, json = false }: ChamarOpts): Promise<string> {
    if (!this.isConfigured) throw new Error('Chave da OpenAI não configurada (Configurações → IA)')
    const messages: Array<{ role: string; content: string }> = []
    if (system) messages.push({ role: 'system', content: system })
    messages.push({ role: 'user', content: prompt })

    const body: Record<string, unknown> = {
      model: this.cfg.openai_model || 'gpt-4o-mini',
      max_tokens: maxTokens,
      messages,
    }
    if (json) body.response_format = { type: 'json_object' }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.cfg.openai_api_key}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`OpenAI ${res.status}: ${txt.slice(0, 250)}`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() ?? ''
  }
}

export function extrairJson<T = unknown>(txt: string): T | null {
  const m = txt.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) as T } catch { return null }
}
