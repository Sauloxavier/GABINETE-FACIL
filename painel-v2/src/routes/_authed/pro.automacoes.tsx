import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Workflow, Loader2, Power, Pencil, Plus, Trash2, History, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { useConfig } from '@/features/config/hooks'

export const Route = createFileRoute('/_authed/pro/automacoes')({
  component: AutomacoesPage,
})

interface Gatilho { quando?: string; esperar_minutos?: number; dias_sem_movimento?: number; status_demanda?: string; dias_sem_contato?: number; envolvimento?: string; dias_antes?: number; keywords?: string[] }
interface Acao    { tipo: string; template_id?: string; conteudo_custom?: string; titulo?: string; dias_depois?: number; para?: string; so_horario?: { de: number; ate: number } }

interface Automacao {
  id: string
  nome: string
  descricao: string | null
  tipo: string
  ativo: boolean
  gatilho: Gatilho
  acao: Acao
  ultima_execucao: string | null
  total_execucoes: number
  total_falhas: number
}

const TIPOS = [
  { id: 'boas_vindas',      label: 'Boas-vindas a novo eleitor',  emoji: '👋', desc: 'Dispara mensagem quando eleitor é cadastrado.' },
  { id: 'fup',              label: 'FUP de atendimento parado',    emoji: '🔁', desc: 'Manda mensagem se atendimento ficou X dias sem update.' },
  { id: 'reativacao',       label: 'Reativar eleitor frio',        emoji: '❄️', desc: 'Reativa eleitor sem contato há X dias.' },
  { id: 'aniversario',      label: 'Aniversário do eleitor',       emoji: '🎂', desc: 'Manda mensagem no dia do aniversário.' },
  { id: 'resposta_keyword', label: 'Auto-resposta por palavra',    emoji: '🔑', desc: 'Responde automaticamente se mensagem contiver palavras.' },
]

const ACOES = [
  { id: 'enviar_whatsapp',     label: 'Enviar WhatsApp' },
  { id: 'criar_compromisso',   label: 'Criar compromisso/lembrete' },
  { id: 'mudar_envolvimento',  label: 'Mudar envolvimento do eleitor' },
]

const ENVOLVIMENTOS = ['Não trabalhado', 'Em prospecção', 'Conquistado', 'Incerto', 'Perdido']
const STATUS_DEMANDA_VALS = ['Aberta', 'Em andamento', 'Resolvida', 'Cancelada']

function defaultGatilho(tipo: string): Gatilho {
  if (tipo === 'boas_vindas')      return { quando: 'novo_eleitor', esperar_minutos: 60 }
  if (tipo === 'fup')              return { dias_sem_movimento: 3, status_demanda: 'Em andamento' }
  if (tipo === 'reativacao')       return { dias_sem_contato: 30, envolvimento: 'Conquistado' }
  if (tipo === 'aniversario')      return { dias_antes: 0 }
  if (tipo === 'resposta_keyword') return { keywords: [] }
  return {}
}

function AutomacoesPage() {
  const [automacoes, setAutomacoes] = useState<Automacao[]>([])
  const [loading, setLoading] = useState(true)
  const [erroSchema, setErroSchema] = useState(false)
  const [editando, setEditando] = useState<Automacao | null>(null)
  const [criando, setCriando] = useState(false)
  const [historico, setHistorico] = useState<Automacao | null>(null)

  async function carregar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('automacoes')
      .select('*')
      .order('criado_em', { ascending: false })
    if (error) {
      console.error('[automacoes]', error)
      if (error.code === 'PGRST205' || error.message.includes('automacoes')) {
        setErroSchema(true)
      }
    } else {
      setAutomacoes((data as Automacao[]) ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function toggle(a: Automacao) {
    const { error } = await (supabase.from('automacoes') as any)
      .update({ ativo: !a.ativo })
      .eq('id', a.id)
    if (error) {
      toast.error('Erro: ' + error.message)
    } else {
      toast.success(a.ativo ? 'Pausada' : 'Ativada')
      carregar()
    }
  }

  async function deletar(a: Automacao) {
    if (!confirm(`Excluir "${a.nome}"? O histórico também será apagado.`)) return
    const { error } = await supabase.from('automacoes').delete().eq('id', a.id)
    if (error) toast.error('Erro: ' + error.message)
    else { toast.success('Excluída'); carregar() }
  }

  function nova() {
    setEditando({
      id: '', nome: '', descricao: '', tipo: 'boas_vindas', ativo: true,
      gatilho: defaultGatilho('boas_vindas'),
      acao: { tipo: 'enviar_whatsapp', so_horario: { de: 9, ate: 18 } },
      ultima_execucao: null, total_execucoes: 0, total_falhas: 0,
    } as Automacao)
    setCriando(true)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 flex items-center gap-2">
          <Workflow className="w-8 h-8 text-marco-azul" /> Automações
        </h1>
        <button onClick={nova} className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Nova automação
        </button>
      </div>

      {erroSchema && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4 text-sm text-rose-800">
          ⚠️ A tabela <code>automacoes</code> não existe no banco. Rode <code>painel/supabase/09-automacoes.sql</code> ou <code>10-ajustes-v2.sql</code> no Supabase Studio.
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-sm text-amber-900">
        ⚙️ Pra rodar 24/7, o worker <code>scripts/automacoes/</code> precisa estar ativo na VM.
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
      ) : automacoes.length === 0 ? (
        <div className="bg-white rounded-2xl ring-soft p-12 text-center text-slate-500">
          Sem automações ainda. Clica em "Nova automação" pra criar.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {automacoes.map(a => {
            const meta = TIPOS.find(t => t.id === a.tipo) ?? { label: a.tipo, emoji: '⚙️', desc: '' }
            return (
              <div key={a.id} className="bg-white rounded-2xl ring-soft p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="text-3xl">{meta.emoji}</div>
                  <button
                    onClick={() => toggle(a)}
                    className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
                      a.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Power className="w-3 h-3" /> {a.ativo ? 'ATIVA' : 'PAUSADA'}
                  </button>
                </div>
                <h3 className="font-black text-slate-800 mb-1">{a.nome}</h3>
                <p className="text-xs text-slate-500 mb-3">{meta.label}</p>
                {a.descricao && <p className="text-xs text-slate-600 mb-3">{a.descricao}</p>}

                <div className="flex items-center gap-3 text-xs border-t border-slate-100 pt-3">
                  <span className="text-emerald-600 font-bold">✓ {a.total_execucoes ?? 0}</span>
                  <span className="text-rose-600 font-bold">✗ {a.total_falhas ?? 0}</span>
                  <span className="text-slate-400 ml-auto truncate">
                    {a.ultima_execucao
                      ? new Date(a.ultima_execucao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : 'nunca'}
                  </span>
                </div>

                <div className="flex gap-1 mt-3">
                  <button onClick={() => setEditando(a)} className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg flex items-center justify-center gap-1">
                    <Pencil className="w-3 h-3" /> Editar
                  </button>
                  <button onClick={() => setHistorico(a)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-lg" title="Histórico">
                    <History className="w-3 h-3" />
                  </button>
                  <button onClick={() => deletar(a)} className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold px-3 py-2 rounded-lg" title="Excluir">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editando && (
        <AutomacaoModal
          automacao={editando}
          criando={criando}
          onClose={() => { setEditando(null); setCriando(false) }}
          onSalvo={() => { setEditando(null); setCriando(false); carregar() }}
        />
      )}

      {historico && (
        <HistoricoModal automacao={historico} onClose={() => setHistorico(null)} />
      )}
    </div>
  )
}

// ============================================================
// Modal de edição/criação
// ============================================================
function AutomacaoModal({ automacao, criando, onClose, onSalvo }: {
  automacao: Automacao
  criando: boolean
  onClose: () => void
  onSalvo: () => void
}) {
  const { data: config } = useConfig()
  const [form, setForm] = useState<Automacao>(automacao)
  const [salvando, setSalvando] = useState(false)

  function patch(field: keyof Automacao, valor: unknown) {
    setForm(f => ({ ...f, [field]: valor }))
  }
  function patchGatilho(field: keyof Gatilho, valor: unknown) {
    setForm(f => ({ ...f, gatilho: { ...f.gatilho, [field]: valor } }))
  }
  function patchAcao(field: keyof Acao, valor: unknown) {
    setForm(f => ({ ...f, acao: { ...f.acao, [field]: valor } }))
  }

  async function salvar() {
    if (!form.nome.trim()) { toast.error('Informe o nome'); return }
    setSalvando(true)
    const payload = {
      nome: form.nome,
      descricao: form.descricao,
      tipo: form.tipo,
      ativo: form.ativo,
      gatilho: form.gatilho,
      acao: form.acao,
    }
    let error: { message?: string } | null = null
    if (criando) {
      const r = await (supabase.from('automacoes') as any).insert(payload)
      error = r.error
    } else {
      const r = await (supabase.from('automacoes') as any).update(payload).eq('id', form.id)
      error = r.error
    }
    setSalvando(false)
    if (error) {
      toast.error('Erro: ' + (error.message ?? 'desconhecido'))
    } else {
      toast.success(criando ? 'Criada' : 'Salva')
      onSalvo()
    }
  }

  return (
    <Modal open onClose={onClose} title={criando ? 'Nova automação' : 'Editar automação'} size="lg">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Tipo</label>
          <select
            value={form.tipo}
            onChange={e => {
              const t = e.target.value
              setForm(f => ({ ...f, tipo: t, gatilho: defaultGatilho(t) }))
            }}
            className="input"
          >
            {TIPOS.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
          </select>
          <p className="text-xs text-slate-500 mt-1">{TIPOS.find(t => t.id === form.tipo)?.desc}</p>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Nome</label>
          <input value={form.nome} onChange={e => patch('nome', e.target.value)} className="input" />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Descrição (opcional)</label>
          <textarea value={form.descricao ?? ''} onChange={e => patch('descricao', e.target.value)} rows={2} className="input" />
        </div>

        {/* Gatilho */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
          <div className="text-xs font-bold text-blue-700">🎯 GATILHO (quando dispara)</div>

          {form.tipo === 'boas_vindas' && (
            <label className="text-sm flex items-center gap-2 flex-wrap">
              Esperar
              <input type="number" min={0} value={form.gatilho.esperar_minutos ?? 0} onChange={e => patchGatilho('esperar_minutos', Number(e.target.value))} className="w-20 px-2 py-1 border border-slate-200 rounded text-sm" />
              minutos após cadastrar o eleitor.
            </label>
          )}

          {form.tipo === 'fup' && (
            <>
              <label className="text-sm flex items-center gap-2">
                Status do atendimento:
                <select value={form.gatilho.status_demanda ?? 'Em andamento'} onChange={e => patchGatilho('status_demanda', e.target.value)} className="px-2 py-1 border border-slate-200 rounded text-sm">
                  {STATUS_DEMANDA_VALS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="text-sm flex items-center gap-2 flex-wrap">
                Há
                <input type="number" min={1} value={form.gatilho.dias_sem_movimento ?? 1} onChange={e => patchGatilho('dias_sem_movimento', Number(e.target.value))} className="w-20 px-2 py-1 border border-slate-200 rounded text-sm" />
                dia(s) sem atualização.
              </label>
            </>
          )}

          {form.tipo === 'reativacao' && (
            <>
              <label className="text-sm flex items-center gap-2">
                Envolvimento:
                <select value={form.gatilho.envolvimento ?? ''} onChange={e => patchGatilho('envolvimento', e.target.value)} className="px-2 py-1 border border-slate-200 rounded text-sm">
                  <option value="">Qualquer</option>
                  {ENVOLVIMENTOS.map(en => <option key={en} value={en}>{en}</option>)}
                </select>
              </label>
              <label className="text-sm flex items-center gap-2 flex-wrap">
                Sem contato há
                <input type="number" min={1} value={form.gatilho.dias_sem_contato ?? 30} onChange={e => patchGatilho('dias_sem_contato', Number(e.target.value))} className="w-20 px-2 py-1 border border-slate-200 rounded text-sm" />
                dia(s).
              </label>
            </>
          )}

          {form.tipo === 'aniversario' && (
            <label className="text-sm flex items-center gap-2 flex-wrap">
              <input type="number" min={0} value={form.gatilho.dias_antes ?? 0} onChange={e => patchGatilho('dias_antes', Number(e.target.value))} className="w-20 px-2 py-1 border border-slate-200 rounded text-sm" />
              dia(s) antes do aniversário (0 = no dia).
            </label>
          )}

          {form.tipo === 'resposta_keyword' && (
            <div>
              <label className="text-sm block mb-1">Palavras-chave (vírgula):</label>
              <input
                value={(form.gatilho.keywords ?? []).join(', ')}
                onChange={e => patchGatilho('keywords', e.target.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean))}
                placeholder="horário, endereço, atendimento"
                className="input"
              />
            </div>
          )}
        </div>

        {/* Ação */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-2">
          <div className="text-xs font-bold text-emerald-700">📤 AÇÃO (o que faz)</div>

          <select value={form.acao.tipo} onChange={e => patchAcao('tipo', e.target.value)} className="input">
            {ACOES.map(ac => <option key={ac.id} value={ac.id}>{ac.label}</option>)}
          </select>

          {form.acao.tipo === 'enviar_whatsapp' && (
            <>
              <label className="text-sm flex items-center gap-2">
                Template:
                <select value={form.acao.template_id ?? ''} onChange={e => patchAcao('template_id', e.target.value)} className="px-2 py-1 border border-slate-200 rounded text-sm flex-1">
                  <option value="">— escrever custom abaixo —</option>
                  {(config?.mensagens_padrao ?? []).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </label>
              {!form.acao.template_id && (
                <textarea
                  value={form.acao.conteudo_custom ?? ''}
                  onChange={e => patchAcao('conteudo_custom', e.target.value)}
                  rows={3}
                  placeholder="Olá {{nome}}, ..."
                  className="input"
                />
              )}
              <label className="text-sm flex items-center gap-2 flex-wrap">
                Só enviar entre
                <input type="number" min={0} max={23} value={form.acao.so_horario?.de ?? 9} onChange={e => patchAcao('so_horario', { ...(form.acao.so_horario ?? { de: 9, ate: 18 }), de: Number(e.target.value) })} className="w-16 px-2 py-1 border border-slate-200 rounded text-sm" />h
                e
                <input type="number" min={0} max={23} value={form.acao.so_horario?.ate ?? 18} onChange={e => patchAcao('so_horario', { ...(form.acao.so_horario ?? { de: 9, ate: 18 }), ate: Number(e.target.value) })} className="w-16 px-2 py-1 border border-slate-200 rounded text-sm" />h
              </label>
            </>
          )}

          {form.acao.tipo === 'criar_compromisso' && (
            <>
              <input
                value={form.acao.titulo ?? ''}
                onChange={e => patchAcao('titulo', e.target.value)}
                placeholder="Título (use {{nome}})"
                className="input"
              />
              <label className="text-sm flex items-center gap-2 flex-wrap">
                Agendar pra
                <input type="number" min={0} value={form.acao.dias_depois ?? 1} onChange={e => patchAcao('dias_depois', Number(e.target.value))} className="w-20 px-2 py-1 border border-slate-200 rounded text-sm" />
                dia(s) depois.
              </label>
            </>
          )}

          {form.acao.tipo === 'mudar_envolvimento' && (
            <label className="text-sm flex items-center gap-2">
              Mudar pra:
              <select value={form.acao.para ?? ''} onChange={e => patchAcao('para', e.target.value)} className="px-2 py-1 border border-slate-200 rounded text-sm">
                <option value="">—</option>
                {ENVOLVIMENTOS.map(en => <option key={en} value={en}>{en}</option>)}
              </select>
            </label>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.ativo} onChange={e => patch('ativo', e.target.checked)} />
            <span className={`font-semibold ${form.ativo ? 'text-emerald-600' : 'text-slate-500'}`}>
              {form.ativo ? 'ATIVA' : 'PAUSADA'}
            </span>
          </label>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
            <button onClick={salvar} disabled={salvando} className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ============================================================
// Modal de histórico de execução
// ============================================================
interface LogRow {
  id: string
  status: string
  detalhe: string | null
  executado_em: string
  eleitor_id: string | null
}

function HistoricoModal({ automacao, onClose }: { automacao: Automacao; onClose: () => void }) {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('automacao_log')
      .select('*')
      .eq('automacao_id', automacao.id)
      .order('executado_em', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setLogs((data as LogRow[]) ?? [])
        setLoading(false)
      })
  }, [automacao.id])

  return (
    <Modal open onClose={onClose} title={`Histórico: ${automacao.nome}`} size="lg">
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-slate-400">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">Sem execuções ainda</div>
        ) : (
          logs.map(log => (
            <div key={log.id} className={`rounded-lg p-3 text-sm ${
              log.status === 'sucesso' ? 'bg-emerald-50' :
              log.status === 'falha' ? 'bg-rose-50' : 'bg-slate-50'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">
                  {log.status === 'sucesso' ? '✓' : log.status === 'falha' ? '✗' : '⏸'} {log.status}
                </span>
                <span className="text-xs text-slate-500">{new Date(log.executado_em).toLocaleString('pt-BR')}</span>
              </div>
              {log.detalhe && <div className="text-xs text-slate-700">{log.detalhe}</div>}
            </div>
          ))
        )}
        <button onClick={onClose} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg flex items-center justify-center gap-2 mt-3">
          <X className="w-4 h-4" /> Fechar
        </button>
      </div>
    </Modal>
  )
}
