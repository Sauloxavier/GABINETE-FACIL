import { createFileRoute } from '@tanstack/react-router'
import { Sparkles, Activity, Save } from 'lucide-react'
import { useConfig, useSalvarConfig } from '@/features/config/hooks'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_authed/pro/ia')({
  component: IAPage,
})

interface IAStatus {
  ativo?: boolean
  ultimaAtividade?: string
  msgsRespondidas?: number
}

function IAPage() {
  const { data: config } = useConfig()
  const salvar = useSalvarConfig()
  const [ativo, setAtivo] = useState(config?.atendimento_ia_ativo ?? false)
  const [modo, setModo] = useState<'auto' | 'sugere'>('auto')
  const [prompt, setPrompt] = useState(config?.atendimento_ia_prompt ?? '')
  const [statusAoVivo, setStatusAoVivo] = useState<IAStatus | null>(null)

  const checkarStatus = useCallback(async () => {
    const { data } = await (supabase.from('config') as any).select('valor').eq('chave', 'atendimento_ia_status').maybeSingle()
    setStatusAoVivo((data?.valor as IAStatus) ?? null)
  }, [])

  useEffect(() => {
    setAtivo(config?.atendimento_ia_ativo ?? false)
    setPrompt(config?.atendimento_ia_prompt ?? '')
    // carrega modo do config (custom key)
    ;(supabase.from('config') as any).select('valor').eq('chave', 'atendimento_ia_modo').maybeSingle().then(({ data }: { data: { valor?: string } | null }) => {
      if (data?.valor === 'sugere') setModo('sugere')
    })
  }, [config])

  useEffect(() => {
    checkarStatus()
    const iv = setInterval(checkarStatus, 10_000)
    return () => clearInterval(iv)
  }, [checkarStatus])

  async function salvarTudo() {
    await salvar.mutateAsync({
      atendimento_ia_ativo: ativo,
      atendimento_ia_prompt: prompt,
    })
    // salva modo separado (não está no AppConfig)
    await (supabase.from('config') as any).upsert({ chave: 'atendimento_ia_modo', valor: modo }, { onConflict: 'chave' })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 mb-6 flex items-center gap-2">
        <Sparkles className="w-8 h-8 text-marco-azul" /> Atendimento por IA
      </h1>

      <div className="bg-gradient-to-br from-purple-500 to-marco-azul text-white rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="text-5xl">🤖</div>
          <div>
            <h2 className="text-xl font-black">IA responde mensagens no WhatsApp</h2>
            <p className="text-white/90 mt-1 text-sm">
              O script <code>scripts/atendimento-ia</code> roda na VM, faz polling no WAHA,
              chama o ChatGPT com o prompt configurado, e responde via WAHA.
            </p>
          </div>
        </div>
      </div>

      {/* Status ao vivo */}
      <div className="bg-white rounded-2xl ring-soft p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Status ao vivo (atualiza a cada 10s)
            </h3>
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded-full ${statusAoVivo?.ativo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="font-bold">{statusAoVivo?.ativo ? 'RODANDO' : 'PARADO'}</span>
              </span>
              <span className="text-slate-600">
                · <strong>{statusAoVivo?.msgsRespondidas ?? 0}</strong> respondidas
              </span>
              {statusAoVivo?.ultimaAtividade && (
                <span className="text-slate-400 text-xs">
                  · última: {new Date(statusAoVivo.ultimaAtividade).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toggle ativo + modo */}
      <div className="bg-white rounded-2xl ring-soft p-5 mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">Ligar atendimento automático</h3>
            <p className="text-sm text-slate-500">
              {ativo ? '✅ Ativo — o script vai responder' : '⚪ Pausado'}
            </p>
          </div>
          <button
            onClick={() => setAtivo(v => !v)}
            className={`relative w-14 h-7 rounded-full transition ${ativo ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition ${ativo ? 'left-7' : 'left-0.5'}`} />
          </button>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="text-xs font-bold text-slate-600 uppercase mb-2">Modo de atendimento</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className={`border-2 rounded-xl p-3 cursor-pointer flex items-start gap-2 ${modo === 'auto' ? 'border-marco-azul bg-marco-azul/5' : 'border-slate-200'}`}>
              <input type="radio" checked={modo === 'auto'} onChange={() => setModo('auto')} className="mt-1" />
              <div>
                <div className="font-bold text-sm">🤖 Automático</div>
                <div className="text-xs text-slate-500">IA responde sozinha. Mais ágil, menos controle.</div>
              </div>
            </label>
            <label className={`border-2 rounded-xl p-3 cursor-pointer flex items-start gap-2 ${modo === 'sugere' ? 'border-marco-azul bg-marco-azul/5' : 'border-slate-200'}`}>
              <input type="radio" checked={modo === 'sugere'} onChange={() => setModo('sugere')} className="mt-1" />
              <div>
                <div className="font-bold text-sm">👀 Só sugere</div>
                <div className="text-xs text-slate-500">IA gera resposta como rascunho — assessor aprova antes de enviar.</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Prompt */}
      <div className="bg-white rounded-2xl ring-soft p-5 mb-4">
        <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Prompt do sistema</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={10}
          placeholder="Você é Marco Xavier, vereador de Limeira-SP..."
          className="input font-mono text-xs"
        />
        <p className="text-xs text-slate-500 mt-1">
          Define o tom, persona e regras. O ChatGPT recebe esse prompt + a mensagem do eleitor.
        </p>
      </div>

      <button
        onClick={salvarTudo}
        disabled={salvar.isPending}
        className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-6 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
      >
        <Save className="w-4 h-4" />
        {salvar.isPending ? 'Salvando...' : 'Salvar configuração'}
      </button>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mt-6 text-sm text-amber-900">
        ⚙️ <strong>Setup (uma vez):</strong>
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>Configurar OpenAI API key em <a href="/config" className="underline font-bold">Configurações › IA</a></li>
          <li>Configurar WAHA em <a href="/config" className="underline font-bold">Configurações › WhatsApp</a></li>
          <li>Rodar o script <code>scripts/atendimento-ia</code> na VM com <code>pm2 start index.js --name atendimento-ia</code></li>
        </ol>
        <p className="mt-3 text-xs">
          💡 <strong>Modo "só sugere"</strong>: o script grava a resposta proposta na <code>config.atendimento_ia_sugestoes</code> em vez de enviar.
          Implementação no worker fica pra próxima rodada.
        </p>
      </div>
    </div>
  )
}
