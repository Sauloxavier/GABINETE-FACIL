import { createFileRoute } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { useConfig, useSalvarConfig } from '@/features/config/hooks'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/_authed/pro/ia')({
  component: IAPage,
})

function IAPage() {
  const { data: config } = useConfig()
  const salvar = useSalvarConfig()
  const [ativo, setAtivo] = useState(config?.atendimento_ia_ativo ?? false)
  const [prompt, setPrompt] = useState(config?.atendimento_ia_prompt ?? '')

  useEffect(() => {
    setAtivo(config?.atendimento_ia_ativo ?? false)
    setPrompt(config?.atendimento_ia_prompt ?? '')
  }, [config])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 mb-6 flex items-center gap-2">
        <Sparkles className="w-8 h-8 text-marco-azul" /> Atendimento por IA
      </h1>

      <div className="bg-gradient-to-br from-purple-500 to-marco-azul text-white rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="text-5xl">🤖</div>
          <div>
            <h2 className="text-xl font-black">IA responde mensagens recebidas no WhatsApp</h2>
            <p className="text-white/90 mt-1 text-sm">
              Eleitor manda WhatsApp pro gabinete → o script de atendimento IA roda na VM,
              chama o ChatGPT e responde via WAHA. Tudo automático, com o tom do mandato.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl ring-soft p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">Status do atendimento IA</h3>
            <p className="text-sm text-slate-500">
              {ativo ? '✅ Ativo — respondendo automaticamente' : '⚪ Pausado — mensagens não são respondidas'}
            </p>
          </div>
          <button
            onClick={() => setAtivo(v => !v)}
            className={`relative w-14 h-7 rounded-full transition ${ativo ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition ${ativo ? 'left-7' : 'left-0.5'}`} />
          </button>
        </div>

        <div>
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
          onClick={() => salvar.mutate({ atendimento_ia_ativo: ativo, atendimento_ia_prompt: prompt })}
          disabled={salvar.isPending}
          className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-6 py-2 rounded-lg disabled:opacity-50"
        >
          {salvar.isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mt-6 text-sm text-amber-900">
        ⚙️ <strong>Setup necessário (uma vez):</strong>
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>Configurar OpenAI API key em <a href="/config" className="underline font-bold">Configurações › IA</a></li>
          <li>Configurar WAHA em <a href="/config" className="underline font-bold">Configurações › WhatsApp</a></li>
          <li>Rodar o script <code>scripts/atendimento-ia</code> na VM com <code>pm2 start index.js --name atendimento-ia</code></li>
        </ol>
      </div>
    </div>
  )
}
