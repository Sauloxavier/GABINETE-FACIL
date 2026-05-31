import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Megaphone, Sparkles, Loader2 } from 'lucide-react'
import { useConfig } from '@/features/config/hooks'
import { OpenAIClient, extrairJson } from '@/lib/openai'

export const Route = createFileRoute('/_authed/pro/trafego')({
  component: TrafegoPage,
})

function TrafegoPage() {
  const { data: config } = useConfig()
  const [briefing, setBriefing] = useState({
    objetivo: 'engajamento',
    publico: 'geral',
    bairros: 'Vista Alegre, Novo Horizonte, Nova Suíça',
    idadeMin: 30,
    idadeMax: 65,
    genero: 'todos',
    budgetDiario: 30,
    duracaoDias: 7,
    formato: 'carrossel',
    tema: '',
  })
  const [criativo, setCriativo] = useState<{ titulo?: string; texto_principal?: string; cta?: string; prompt_imagem?: string; hashtags?: string[] } | null>(null)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function gerar() {
    if (!config) return
    setGerando(true)
    setErro(null)
    setCriativo(null)
    try {
      const ai = new OpenAIClient(config)
      const system = `Você é estrategista de tráfego pago do gabinete do vereador Marco Xavier (Limeira-SP). Cria criativos pra Meta Ads (Instagram/Facebook). Tom popular, fé/família/união. NUNCA usar o número eleitoral 11200 em material de mandato. Responda em JSON.`
      const prompt = `Briefing:\n${JSON.stringify({
        ...briefing,
        bairros: briefing.bairros.split(',').map(s => s.trim()).filter(Boolean),
      }, null, 2)}\n\nDevolva JSON com:\n{\n  "titulo": "...",\n  "texto_principal": "texto pra Instagram (3-6 linhas)",\n  "cta": "...",\n  "prompt_imagem": "descrição do visual sugerido pra carrossel/imagem",\n  "hashtags": ["#tag1", "#tag2", ...] (8-12 hashtags relevantes pra Limeira-SP)\n}`
      const out = await ai.chamar({ system, prompt, maxTokens: 1500, json: true })
      const json = extrairJson<typeof criativo>(out)
      if (!json) throw new Error('IA devolveu resposta inválida')
      setCriativo(json)
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 mb-6 flex items-center gap-2">
        <Megaphone className="w-8 h-8 text-marco-azul" /> Tráfego pago
      </h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Briefing */}
        <div className="bg-white rounded-2xl ring-soft p-5 space-y-3">
          <h3 className="font-bold text-slate-800 mb-2">Briefing do anúncio</h3>
          <Field label="Objetivo">
            <select value={briefing.objetivo} onChange={e => setBriefing(b => ({ ...b, objetivo: e.target.value }))} className="input">
              <option value="engajamento">Engajamento</option>
              <option value="seguidores">Mais seguidores</option>
              <option value="mensagens">Receber mensagens</option>
              <option value="conversao">Conversão (clique no site)</option>
            </select>
          </Field>
          <Field label="Público-alvo">
            <input value={briefing.publico} onChange={e => setBriefing(b => ({ ...b, publico: e.target.value }))} className="input" />
          </Field>
          <Field label="Bairros (separe por vírgula)">
            <input value={briefing.bairros} onChange={e => setBriefing(b => ({ ...b, bairros: e.target.value }))} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Idade min">
              <input type="number" value={briefing.idadeMin} onChange={e => setBriefing(b => ({ ...b, idadeMin: Number(e.target.value) }))} className="input" />
            </Field>
            <Field label="Idade max">
              <input type="number" value={briefing.idadeMax} onChange={e => setBriefing(b => ({ ...b, idadeMax: Number(e.target.value) }))} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Gênero">
              <select value={briefing.genero} onChange={e => setBriefing(b => ({ ...b, genero: e.target.value }))} className="input">
                <option value="todos">Todos</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </Field>
            <Field label="Orçamento/dia">
              <input type="number" value={briefing.budgetDiario} onChange={e => setBriefing(b => ({ ...b, budgetDiario: Number(e.target.value) }))} className="input" />
            </Field>
            <Field label="Duração (dias)">
              <input type="number" value={briefing.duracaoDias} onChange={e => setBriefing(b => ({ ...b, duracaoDias: Number(e.target.value) }))} className="input" />
            </Field>
          </div>
          <Field label="Formato">
            <select value={briefing.formato} onChange={e => setBriefing(b => ({ ...b, formato: e.target.value }))} className="input">
              <option value="carrossel">Carrossel</option>
              <option value="feed">Feed (imagem única)</option>
              <option value="reels">Reels</option>
              <option value="story">Story</option>
            </select>
          </Field>
          <Field label="Tema / mensagem">
            <textarea value={briefing.tema} onChange={e => setBriefing(b => ({ ...b, tema: e.target.value }))} rows={3} placeholder="Ex: prestação de contas das primeiras 100 obras do mandato" className="input" />
          </Field>
          <button onClick={gerar} disabled={gerando || !briefing.tema.trim()} className="w-full bg-marco-azul hover:bg-marco-azul-esc text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {gerando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {gerando ? 'Gerando criativo...' : 'Gerar criativo com IA'}
          </button>
          {erro && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">{erro}</div>}
        </div>

        {/* Criativo gerado */}
        <div className="bg-white rounded-2xl ring-soft p-5">
          <h3 className="font-bold text-slate-800 mb-3">Criativo sugerido</h3>
          {!criativo ? (
            <div className="text-center py-12 text-slate-400">
              <Sparkles className="w-12 h-12 mx-auto mb-2" />
              <div className="text-sm">Preencha o briefing e clique em "Gerar"</div>
            </div>
          ) : (
            <div className="space-y-3">
              {criativo.titulo && (
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Título</div>
                  <div className="bg-slate-50 rounded-lg p-3 text-lg font-bold text-slate-800">{criativo.titulo}</div>
                </div>
              )}
              {criativo.texto_principal && (
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Texto principal</div>
                  <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-line">{criativo.texto_principal}</div>
                </div>
              )}
              {criativo.cta && (
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">CTA</div>
                  <div className="bg-marco-azul text-white rounded-lg px-3 py-2 text-sm font-bold inline-block">{criativo.cta}</div>
                </div>
              )}
              {criativo.prompt_imagem && (
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Visual sugerido</div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">{criativo.prompt_imagem}</div>
                </div>
              )}
              {criativo.hashtags && criativo.hashtags.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Hashtags</div>
                  <div className="flex flex-wrap gap-1">
                    {criativo.hashtags.map(h => (
                      <span key={h} className="bg-marco-azul/10 text-marco-azul text-xs font-semibold px-2 py-1 rounded-full">{h}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                📋 Copie esse criativo e cole no Gerenciador de Anúncios da Meta (Facebook/Instagram).
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">{label}</span>
      {children}
    </label>
  )
}
