import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Settings, Phone, Sparkles, Users, Save, CheckCircle2, Tag, Plus, X } from 'lucide-react'
import { useConfig, useSalvarConfig } from '@/features/config/hooks'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/config')({
  component: ConfigPage,
})

type Aba = 'geral' | 'whatsapp' | 'ia' | 'tags' | 'equipe'

function ConfigPage() {
  const { data: config, isLoading } = useConfig()
  const [aba, setAba] = useState<Aba>('geral')

  if (isLoading || !config) {
    return <div className="p-8 text-slate-400">Carregando configurações...</div>
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 mb-6 flex items-center gap-2">
        <Settings className="w-8 h-8 text-marco-azul" /> Configurações
      </h1>

      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 ring-soft overflow-x-auto">
        <TabButton ativa={aba === 'geral'} onClick={() => setAba('geral')} icon={Settings} label="Geral" />
        <TabButton ativa={aba === 'whatsapp'} onClick={() => setAba('whatsapp')} icon={Phone} label="WhatsApp" />
        <TabButton ativa={aba === 'ia'} onClick={() => setAba('ia')} icon={Sparkles} label="IA" />
        <TabButton ativa={aba === 'tags'} onClick={() => setAba('tags')} icon={Tag} label="Tags & Nichos" />
        <TabButton ativa={aba === 'equipe'} onClick={() => setAba('equipe')} icon={Users} label="Equipe" />
      </div>

      {aba === 'geral' && <AbaGeral />}
      {aba === 'whatsapp' && <AbaWhatsApp />}
      {aba === 'ia' && <AbaIA />}
      {aba === 'tags' && <AbaTags />}
      {aba === 'equipe' && <AbaEquipe />}
    </div>
  )
}

function TabButton({
  ativa, onClick, icon: Icon, label,
}: { ativa: boolean; onClick: () => void; icon: typeof Settings; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition',
        ativa ? 'bg-marco-azul text-white' : 'text-slate-600 hover:bg-slate-50'
      )}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  )
}

function AbaGeral() {
  const { data: config } = useConfig()
  const salvar = useSalvarConfig()
  const [nomeVereador, setNomeVereador] = useState(config?.nome_vereador ?? '')
  const [proxEleicao, setProxEleicao] = useState(config?.proxima_eleicao ?? '')

  return (
    <Card titulo="Identidade do gabinete">
      <Field label="Nome do vereador">
        <input
          value={nomeVereador}
          onChange={e => setNomeVereador(e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Próxima eleição">
        <input
          type="date"
          value={proxEleicao}
          onChange={e => setProxEleicao(e.target.value)}
          className="input"
        />
      </Field>
      <BotaoSalvar
        onClick={() => salvar.mutate({ nome_vereador: nomeVereador, proxima_eleicao: proxEleicao })}
        salvando={salvar.isPending}
        sucesso={salvar.isSuccess}
      />
    </Card>
  )
}

function AbaWhatsApp() {
  const { data: config } = useConfig()
  const salvar = useSalvarConfig()
  const [url, setUrl] = useState(config?.waha_url ?? '')
  const [apiKey, setApiKey] = useState(config?.waha_api_key ?? '')
  const [session, setSession] = useState(config?.waha_session ?? 'default')

  return (
    <Card titulo="WhatsApp (WAHA)" desc="Conexão única do gabinete — admin configura, todos os assessores usam.">
      <Field label="URL do servidor WAHA">
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://waha.seudominio.com" className="input font-mono" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sessão">
          <input value={session} onChange={e => setSession(e.target.value)} className="input font-mono" />
        </Field>
        <Field label="API Key">
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="input font-mono" />
        </Field>
      </div>
      <BotaoSalvar
        onClick={() => salvar.mutate({ waha_url: url, waha_api_key: apiKey, waha_session: session })}
        salvando={salvar.isPending}
        sucesso={salvar.isSuccess}
      />
    </Card>
  )
}

function AbaIA() {
  const { data: config } = useConfig()
  const salvar = useSalvarConfig()
  const [apiKey, setApiKey] = useState(config?.openai_api_key ?? '')
  const [model, setModel] = useState(config?.openai_model ?? 'gpt-4o-mini')
  const [prompt, setPrompt] = useState(config?.atendimento_ia_prompt ?? '')
  const [ativo, setAtivo] = useState(config?.atendimento_ia_ativo ?? false)

  return (
    <Card titulo="Inteligência Artificial (OpenAI)" desc="Chave usada por atendimento IA, geração de copy de anúncios, análise do mandato.">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Field label="API Key">
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-proj-..." className="input font-mono" />
          </Field>
        </div>
        <Field label="Modelo">
          <select value={model} onChange={e => setModel(e.target.value)} className="input">
            <option value="gpt-4o-mini">GPT-4o mini (rápido/barato)</option>
            <option value="gpt-4o">GPT-4o (equilibrado)</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="o3-mini">o3-mini (raciocínio)</option>
          </select>
        </Field>
      </div>
      <Field label="Prompt do atendimento IA">
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={6} className="input" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} />
        Atendimento IA ativo (responde mensagens recebidas automaticamente)
      </label>
      <BotaoSalvar
        onClick={() => salvar.mutate({
          openai_api_key: apiKey, openai_model: model,
          atendimento_ia_prompt: prompt, atendimento_ia_ativo: ativo,
        })}
        salvando={salvar.isPending}
        sucesso={salvar.isSuccess}
      />
    </Card>
  )
}

function AbaTags() {
  const { data: config } = useConfig()
  const salvar = useSalvarConfig()
  const [marcadores, setMarcadores] = useState<string[]>(config?.marcadores ?? [])
  const [nichos, setNichos] = useState<string[]>(config?.nichos ?? [])
  const [novoMarc, setNovoMarc] = useState('')
  const [novoNicho, setNovoNicho] = useState('')

  function addMarc() {
    const v = novoMarc.trim()
    if (!v || marcadores.includes(v)) { setNovoMarc(''); return }
    setMarcadores(m => [...m, v])
    setNovoMarc('')
  }
  function removeMarc(v: string) { setMarcadores(m => m.filter(x => x !== v)) }
  function addNicho() {
    const v = novoNicho.trim()
    if (!v || nichos.includes(v)) { setNovoNicho(''); return }
    setNichos(n => [...n, v])
    setNovoNicho('')
  }
  function removeNicho(v: string) { setNichos(n => n.filter(x => x !== v)) }

  return (
    <div className="space-y-4">
      <Card titulo="Marcadores" desc='Etiquetas tipo "Liderança", "Doador", "Voluntário". Aparecem como botões no cadastro do eleitor.'>
        <div className="flex flex-wrap gap-2 mb-3">
          {marcadores.map(m => (
            <span key={m} className="bg-marco-azul/10 text-marco-azul text-sm font-semibold pl-3 pr-1 py-1 rounded-full flex items-center gap-1">
              {m}
              <button onClick={() => removeMarc(m)} className="hover:bg-rose-100 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {marcadores.length === 0 && <span className="text-sm text-slate-400">Nenhum marcador ainda</span>}
        </div>
        <div className="flex gap-2">
          <input
            value={novoMarc}
            onChange={e => setNovoMarc(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMarc() } }}
            placeholder="Novo marcador..."
            className="input flex-1"
          />
          <button onClick={addMarc} disabled={!novoMarc.trim()} className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-4 rounded-lg flex items-center gap-1 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </Card>

      <Card titulo="Nichos" desc='Categorização do eleitor (ex: "Católico Sta Luzia", "Tiro de Guerra 94", "Romeiros"). Usado em segmentação de disparo.'>
        <div className="flex flex-wrap gap-2 mb-3">
          {nichos.map(n => (
            <span key={n} className="bg-marco-amarelo/30 text-marco-azul-esc text-sm font-semibold pl-3 pr-1 py-1 rounded-full flex items-center gap-1">
              {n}
              <button onClick={() => removeNicho(n)} className="hover:bg-rose-100 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {nichos.length === 0 && <span className="text-sm text-slate-400">Nenhum nicho ainda</span>}
        </div>
        <div className="flex gap-2">
          <input
            value={novoNicho}
            onChange={e => setNovoNicho(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNicho() } }}
            placeholder="Novo nicho (ex: Bairro Centro)..."
            className="input flex-1"
          />
          <button onClick={addNicho} disabled={!novoNicho.trim()} className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-4 rounded-lg flex items-center gap-1 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </Card>

      <BotaoSalvar
        onClick={() => salvar.mutate({ marcadores, nichos })}
        salvando={salvar.isPending}
        sucesso={salvar.isSuccess}
      />
    </div>
  )
}

function AbaEquipe() {
  return (
    <Card titulo="Equipe" desc="Gerenciamento de usuários e perfis — em construção.">
      <div className="text-sm text-slate-500 py-8 text-center">
        Em breve: convidar assessor, alterar papel (admin/assessor), redefinir senha.
      </div>
    </Card>
  )
}

// Componentes auxiliares
function Card({ titulo, desc, children }: { titulo: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl ring-soft p-6 space-y-4">
      <div>
        <h2 className="font-black text-lg text-slate-800">{titulo}</h2>
        {desc && <p className="text-sm text-slate-500 mt-1">{desc}</p>}
      </div>
      {children}
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

function BotaoSalvar({ onClick, salvando, sucesso }: { onClick: () => void; salvando: boolean; sucesso: boolean }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        onClick={onClick}
        disabled={salvando}
        className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
      >
        <Save className="w-4 h-4" /> {salvando ? 'Salvando...' : 'Salvar'}
      </button>
      {sucesso && !salvando && (
        <span className="text-emerald-600 text-sm flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4" /> Salvo
        </span>
      )}
    </div>
  )
}
