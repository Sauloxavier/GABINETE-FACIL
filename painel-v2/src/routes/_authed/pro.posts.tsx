import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Sparkles, Loader2, Copy, Download, Trash2, Plus, FileText } from 'lucide-react'
import { useConfig } from '@/features/config/hooks'
import { OpenAIClient, extrairJson } from '@/lib/openai'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/Toast'

export const Route = createFileRoute('/_authed/pro/posts')({
  component: PostsPage,
})

interface Slide { titulo: string; subtitulo: string; corpo: string }
interface Post {
  id: string
  criado_em: string
  tema: string
  formato: string
  legenda: string
  hashtags: string
  slides: Slide[]
  status: string
}

const FORMATOS = [
  { id: 'feed',      label: 'Feed (1080×1080)' },
  { id: 'carrossel', label: 'Carrossel (1080×1350)' },
  { id: 'story',     label: 'Story (1080×1920)' },
  { id: 'reels',     label: 'Reels (1080×1920)' },
]
const PUBLICOS = ['geral', 'Católico Sta Luzia', 'Tiro de Guerra 94', 'Vista Alegre', 'Novo Horizonte', 'Nova Suíça', 'Romeiros', 'Família']

function PostsPage() {
  const { data: config } = useConfig()
  const [posts, setPosts] = useState<Post[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erroSchema, setErroSchema] = useState(false)
  const [form, setForm] = useState<{
    id: string | null
    tema: string
    formato: string
    publico: string
    legenda: string
    hashtags: string
    slides: Slide[]
    status: string
  }>({
    id: null, tema: '', formato: 'carrossel', publico: 'geral',
    legenda: '', hashtags: '', slides: [], status: 'rascunho',
  })
  const [gerando, setGerando] = useState(false)

  async function carregar() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(50)
    if (error) {
      console.error('[posts]', error)
      if (error.code === 'PGRST205' || error.message.includes('posts')) setErroSchema(true)
    } else {
      setPosts((data as Post[]) ?? [])
    }
    setCarregando(false)
  }
  useEffect(() => { carregar() }, [])

  function novoPost() {
    setForm({
      id: null, tema: '', formato: 'carrossel', publico: 'geral',
      legenda: '', hashtags: '',
      slides: [
        { titulo: '', subtitulo: '', corpo: '' },
        { titulo: '', subtitulo: '', corpo: '' },
        { titulo: '', subtitulo: '', corpo: '' },
      ],
      status: 'rascunho',
    })
  }

  function carregarPost(p: Post) {
    setForm({
      id: p.id,
      tema: p.tema,
      formato: p.formato,
      publico: 'geral',
      legenda: p.legenda,
      hashtags: p.hashtags,
      slides: p.slides ?? [],
      status: p.status,
    })
  }

  async function gerarComIA() {
    if (!form.tema.trim()) { toast.error('Informe o tema'); return }
    if (!config?.openai_api_key) { toast.error('Configure a chave OpenAI'); return }
    setGerando(true)
    try {
      const ai = new OpenAIClient(config)
      const formatoLabel = FORMATOS.find(f => f.id === form.formato)?.label ?? form.formato
      const nSlides = form.formato === 'carrossel' ? 5 : 1
      const system = `Você é redator do gabinete do vereador Marco Xavier (Limeira-SP). Tom: próximo, popular, direto. Usa "comigo", "com você", "juntos". Fé, família, união. SEM jargão político. Frases curtas. NUNCA usar o número eleitoral 11200 (mandato, não campanha). Não invente dados. Responda em JSON.`
      const prompt = `Crie um post de ${formatoLabel} sobre: "${form.tema}".
Público-alvo: ${form.publico}.

Devolva JSON com:
{
  "slides": [${Array.from({ length: nSlides }).map(() => '{"titulo":"...","subtitulo":"...","corpo":"..."}').join(',')}],
  "legenda": "texto pra Instagram (3-6 linhas)",
  "hashtags": "#tag1 #tag2 ... (8-12 hashtags relevantes pra Limeira-SP)"
}

Slides: título curto (max 6 palavras), subtítulo até 12 palavras, corpo 1-2 frases.`
      const out = await ai.chamar({ system, prompt, maxTokens: 1500, json: true })
      const json = extrairJson<{ slides: Slide[]; legenda: string; hashtags: string }>(out)
      if (!json) throw new Error('IA devolveu resposta inválida')
      setForm(f => ({ ...f, slides: json.slides ?? f.slides, legenda: json.legenda ?? '', hashtags: json.hashtags ?? '' }))
      toast.success('Post gerado com IA')
    } catch (err) {
      toast.error('Falhou: ' + (err as Error).message)
    } finally {
      setGerando(false)
    }
  }

  async function salvar() {
    if (!form.tema.trim()) { toast.error('Informe o tema'); return }
    const payload = {
      tema: form.tema,
      formato: form.formato,
      legenda: form.legenda,
      hashtags: form.hashtags,
      slides: form.slides,
      status: form.status,
    }
    if (form.id) {
      const { error } = await (supabase.from('posts') as any).update(payload).eq('id', form.id)
      if (error) { toast.error('Erro: ' + error.message); return }
    } else {
      const { data, error } = await (supabase.from('posts') as any).insert(payload).select().single()
      if (error) { toast.error('Erro: ' + error.message); return }
      setForm(f => ({ ...f, id: (data as Post)?.id ?? null }))
    }
    toast.success('Post salvo')
    carregar()
  }

  async function deletar(p: Post) {
    if (!confirm('Excluir esse post?')) return
    const { error } = await supabase.from('posts').delete().eq('id', p.id)
    if (error) toast.error('Erro: ' + error.message)
    else {
      toast.success('Excluído')
      if (form.id === p.id) novoPost()
      carregar()
    }
  }

  function copiarLegenda() {
    const t = `${form.legenda || ''}\n\n${form.hashtags || ''}`.trim()
    navigator.clipboard.writeText(t).then(() => toast.success('Legenda copiada'))
  }

  function exportarParaCanva() {
    const linhas = form.slides.map((s, i) =>
      `=== SLIDE ${i + 1} ===\nTÍTULO: ${s.titulo}\nSUBTÍTULO: ${s.subtitulo}\nCORPO: ${s.corpo}\n`
    ).join('\n')
    const txt = `${linhas}\n\nLEGENDA:\n${form.legenda}\n\nHASHTAGS:\n${form.hashtags}`
    const blob = new Blob([txt], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `post-${(form.tema || 'sem-tema').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`
    a.click()
  }

  function addSlide() {
    setForm(f => ({ ...f, slides: [...f.slides, { titulo: '', subtitulo: '', corpo: '' }] }))
  }
  function removeSlide(i: number) {
    setForm(f => ({ ...f, slides: f.slides.filter((_, idx) => idx !== i) }))
  }
  function patchSlide(i: number, field: keyof Slide, valor: string) {
    setForm(f => ({ ...f, slides: f.slides.map((s, idx) => idx === i ? { ...s, [field]: valor } : s) }))
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 flex items-center gap-2">
          <FileText className="w-8 h-8 text-marco-azul" /> Posts automáticos
        </h1>
        <button onClick={novoPost} className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Novo post
        </button>
      </div>

      {erroSchema && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4 text-sm text-rose-800">
          ⚠️ A tabela <code>posts</code> não existe. Rode <code>painel/supabase/08-recursos-pro.sql</code>.
        </div>
      )}

      {!config?.openai_api_key && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-sm text-amber-800">
          ⚠️ Sem chave OpenAI configurada. Vá em <a href="/config" className="underline font-bold">Configurações → IA</a>.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lista */}
        <div className="bg-white rounded-2xl ring-soft p-5">
          <h3 className="font-bold text-slate-800 mb-3">Meus posts</h3>
          {carregando ? (
            <div className="text-center py-6 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
          ) : posts.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-6">Sem posts ainda</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
              {posts.map(p => (
                <div
                  key={p.id}
                  onClick={() => carregarPost(p)}
                  className={`border rounded-lg p-3 cursor-pointer hover:bg-slate-50 ${form.id === p.id ? 'border-marco-azul bg-blue-50' : 'border-slate-100'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.status === 'publicado' ? 'bg-emerald-100 text-emerald-700' :
                      p.status === 'aprovado' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>{p.status?.toUpperCase()}</span>
                    <span className="text-xs text-slate-400">{p.formato}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-700 line-clamp-2">{p.tema || 'Sem tema'}</div>
                  <div className="text-xs text-slate-400 mt-1">{p.criado_em ? new Date(p.criado_em).toLocaleDateString('pt-BR') : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="lg:col-span-2 bg-white rounded-2xl ring-soft p-5 space-y-4">
          <h3 className="font-bold text-slate-800">Editor</h3>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">Tema</label>
              <input value={form.tema} onChange={e => setForm(f => ({ ...f, tema: e.target.value }))} placeholder="Ex: Reforma da UBS Vista Alegre" className="input" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Formato</label>
              <select value={form.formato} onChange={e => setForm(f => ({ ...f, formato: e.target.value }))} className="input">
                {FORMATOS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Público</label>
              <select value={form.publico} onChange={e => setForm(f => ({ ...f, publico: e.target.value }))} className="input">
                {PUBLICOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
                <option value="rascunho">Rascunho</option>
                <option value="aprovado">Aprovado</option>
                <option value="publicado">Publicado</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={gerarComIA} disabled={gerando || !form.tema} className="flex-1 min-w-[180px] bg-marco-azul hover:bg-marco-azul-esc text-white font-bold py-2.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {gerando ? 'Gerando...' : 'Gerar com IA'}
            </button>
            <button onClick={salvar} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-lg">Salvar</button>
            {form.id && (
              <button onClick={() => deletar(posts.find(p => p.id === form.id)!)} className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-2.5 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-700">Slides</h4>
              <button onClick={addSlide} className="text-xs text-marco-azul font-bold hover:underline">+ Adicionar slide</button>
            </div>
            <div className="space-y-2">
              {form.slides.map((s, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500">Slide {i + 1}</span>
                    <button onClick={() => removeSlide(i)} className="text-rose-500 text-xs hover:underline">remover</button>
                  </div>
                  <input value={s.titulo} onChange={e => patchSlide(i, 'titulo', e.target.value)} placeholder="Título" className="w-full mb-2 px-3 py-1.5 bg-white border border-slate-200 rounded text-sm font-semibold" />
                  <input value={s.subtitulo} onChange={e => patchSlide(i, 'subtitulo', e.target.value)} placeholder="Subtítulo" className="w-full mb-2 px-3 py-1.5 bg-white border border-slate-200 rounded text-sm" />
                  <textarea value={s.corpo} onChange={e => patchSlide(i, 'corpo', e.target.value)} placeholder="Corpo" rows={2} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500">Legenda</label>
            <textarea value={form.legenda} onChange={e => setForm(f => ({ ...f, legenda: e.target.value }))} rows={5} className="input" />
          </div>

          <div>
            <label className="text-xs text-slate-500">Hashtags</label>
            <input value={form.hashtags} onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))} placeholder="#Limeira #MarcoXavier ..." className="input" />
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            <button onClick={copiarLegenda} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1">
              <Copy className="w-3 h-3" /> Copiar legenda
            </button>
            <button onClick={exportarParaCanva} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1">
              <Download className="w-3 h-3" /> Exportar pro Canva
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
