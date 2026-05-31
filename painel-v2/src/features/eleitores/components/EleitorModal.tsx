import { useState, useEffect, useMemo } from 'react'
import { Save, Trash2, Plus, MessageCircle, AlertTriangle, Pencil, X as XIcon, ChevronDown, Eye } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { useSalvarEleitor, useDeletarEleitor } from '@/features/eleitores/hooks'
import { useDemandas } from '@/features/demandas/hooks'
import { useConfig, useSalvarConfig } from '@/features/config/hooks'
import type { Eleitor, EleitorInsert, Envolvimento, Demanda } from '@/lib/database.types'
import { labelStatusDemanda } from '@/lib/status-demanda'

interface Props {
  open: boolean
  onClose: () => void
  eleitor?: Eleitor | null
  modoInicial?: 'ver' | 'editar'
  onAbrirDemanda?: (d: Demanda) => void
}

const ENVOLVIMENTOS: Envolvimento[] = ['Não trabalhado', 'Em prospecção', 'Conquistado', 'Incerto', 'Perdido']

// Campos considerados importantes pro cadastro estar "completo"
const CAMPOS_IMPORTANTES: Array<{ campo: keyof EleitorInsert; label: string }> = [
  { campo: 'telefone', label: 'Telefone' },
  { campo: 'cpf', label: 'CPF' },
  { campo: 'nascimento', label: 'Nascimento' },
  { campo: 'bairro', label: 'Bairro' },
  { campo: 'endereco', label: 'Endereço' },
]

export function EleitorModal({ open, onClose, eleitor, modoInicial = 'editar', onAbrirDemanda }: Props) {
  const { data: config } = useConfig()
  const { data: demandas } = useDemandas()
  const salvar = useSalvarEleitor()
  const deletar = useDeletarEleitor()
  const salvarConfig = useSalvarConfig()
  const [modo, setModo] = useState<'ver' | 'editar'>(modoInicial)
  const [novoMarcador, setNovoMarcador] = useState('')
  const [novoNicho, setNovoNicho] = useState('')
  const [marcDropdown, setMarcDropdown] = useState(false)
  const [nichoDropdown, setNichoDropdown] = useState(false)

  const [form, setForm] = useState<EleitorInsert>({
    nome: '',
    telefone: null,
    cpf: null,
    sexo: null,
    nascimento: null,
    bairro: null,
    endereco: null,
    cidade: 'Limeira',
    uf: 'SP',
    email: null,
    rede_social: null,
    envolvimento: 'Não trabalhado',
    marcadores: [],
    nichos: [],
    obs: null,
  })

  useEffect(() => {
    if (eleitor) {
      setForm({
        nome: eleitor.nome,
        telefone: eleitor.telefone,
        cpf: eleitor.cpf,
        sexo: eleitor.sexo,
        nascimento: eleitor.nascimento,
        bairro: eleitor.bairro,
        endereco: eleitor.endereco,
        cidade: eleitor.cidade,
        uf: eleitor.uf,
        email: eleitor.email,
        rede_social: eleitor.rede_social,
        envolvimento: eleitor.envolvimento,
        marcadores: eleitor.marcadores ?? [],
        nichos: eleitor.nichos ?? [],
        obs: eleitor.obs,
      })
      setModo(modoInicial)
    } else if (open) {
      setForm({
        nome: '', telefone: null, cpf: null, sexo: null, nascimento: null,
        bairro: null, endereco: null, cidade: 'Limeira', uf: 'SP',
        email: null, rede_social: null, envolvimento: 'Não trabalhado',
        marcadores: [], nichos: [], obs: null,
      })
      setModo('editar')
    }
  }, [eleitor, open, modoInicial])

  // Atendimentos do eleitor
  const atendimentosEleitor = useMemo<Demanda[]>(() => {
    if (!eleitor || !demandas) return []
    return demandas
      .filter(d => d.eleitor_id === eleitor.id)
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
  }, [eleitor, demandas])

  // Campos faltando
  const camposFaltando = useMemo(() => {
    return CAMPOS_IMPORTANTES.filter(c => !form[c.campo])
  }, [form])

  async function adicionarMarcador() {
    const m = novoMarcador.trim()
    if (!m) return
    const atuais = config?.marcadores ?? []
    if (atuais.includes(m)) { toast.error('Marcador já existe'); return }
    await salvarConfig.mutateAsync({ marcadores: [...atuais, m] })
    setForm(f => ({ ...f, marcadores: [...(f.marcadores ?? []), m] }))
    setNovoMarcador('')
  }
  async function adicionarNicho() {
    const n = novoNicho.trim()
    if (!n) return
    const atuais = config?.nichos ?? []
    if (atuais.includes(n)) { toast.error('Nicho já existe'); return }
    await salvarConfig.mutateAsync({ nichos: [...atuais, n] })
    setForm(f => ({ ...f, nichos: [...(f.nichos ?? []), n] }))
    setNovoNicho('')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    try {
      await salvar.mutateAsync({ id: eleitor?.id, ...form })
      toast.success(eleitor ? 'Eleitor atualizado' : 'Eleitor cadastrado')
      onClose()
    } catch (err) {
      toast.error('Erro ao salvar: ' + (err as Error).message)
    }
  }

  async function onDelete() {
    if (!eleitor) return
    if (!confirm(`Excluir ${eleitor.nome}? Os atendimentos vinculados continuam.`)) return
    try {
      await deletar.mutateAsync(eleitor.id)
      toast.success('Eleitor excluído')
      onClose()
    } catch (err) {
      toast.error('Erro ao excluir: ' + (err as Error).message)
    }
  }

  function toggleArr(field: 'marcadores' | 'nichos', valor: string) {
    setForm(f => {
      const arr = f[field] ?? []
      return { ...f, [field]: arr.includes(valor) ? arr.filter(x => x !== valor) : [...arr, valor] }
    })
  }

  function abrirWhatsApp() {
    if (!form.telefone) return
    const num = form.telefone.replace(/\D/g, '')
    const numFinal = num.startsWith('55') ? num : '55' + num
    window.open(`https://wa.me/${numFinal}`, '_blank')
  }

  const readOnly = modo === 'ver'
  const titulo = !eleitor ? 'Novo eleitor' : modo === 'ver' ? 'Ver eleitor' : 'Editar eleitor'

  return (
    <Modal open={open} onClose={onClose} title={titulo} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Toggle ver/editar (só pra eleitor existente) */}
        {eleitor && (
          <div className="flex items-center gap-2 -mt-2">
            <button
              type="button"
              onClick={() => setModo('ver')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 ${modo === 'ver' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              <Eye className="w-3 h-3" /> Ver
            </button>
            <button
              type="button"
              onClick={() => setModo('editar')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 ${modo === 'editar' ? 'bg-marco-azul text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              <Pencil className="w-3 h-3" /> Editar
            </button>
            {form.telefone && (
              <button
                type="button"
                onClick={abrirWhatsApp}
                className="ml-auto bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
              >
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </button>
            )}
          </div>
        )}

        {/* Código eleitor */}
        {eleitor?.codigo && (
          <div className="bg-marco-azul/5 border border-marco-azul/20 rounded-lg px-3 py-2 text-sm">
            <span className="text-xs text-slate-500">Código: </span>
            <span className="font-mono font-bold text-marco-azul">{eleitor.codigo}</span>
          </div>
        )}

        {/* Alerta cadastro incompleto */}
        {eleitor && camposFaltando.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Cadastro incompleto.</strong> Faltam: {camposFaltando.map(c => c.label).join(', ')}.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nome *" obrigatorio>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required disabled={readOnly} className="input disabled:bg-slate-50" />
          </Field>
          <Field label="Telefone" faltando={!form.telefone}>
            <input value={form.telefone ?? ''} onChange={e => setForm(f => ({ ...f, telefone: e.target.value || null }))} placeholder="19 99999-8888" disabled={readOnly} className="input disabled:bg-slate-50" />
          </Field>
          <Field label="CPF" faltando={!form.cpf}>
            <input value={form.cpf ?? ''} onChange={e => setForm(f => ({ ...f, cpf: e.target.value || null }))} disabled={readOnly} className="input disabled:bg-slate-50" />
          </Field>
          <Field label="Nascimento" faltando={!form.nascimento}>
            <input type="date" value={form.nascimento ?? ''} onChange={e => setForm(f => ({ ...f, nascimento: e.target.value || null }))} disabled={readOnly} className="input disabled:bg-slate-50" />
          </Field>
          <Field label="Sexo">
            <select value={form.sexo ?? ''} onChange={e => setForm(f => ({ ...f, sexo: e.target.value || null }))} disabled={readOnly} className="input disabled:bg-slate-50">
              <option value="">—</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </Field>
          <Field label="E-mail">
            <input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value || null }))} disabled={readOnly} className="input disabled:bg-slate-50" />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Field label="Bairro" faltando={!form.bairro}>
              <input value={form.bairro ?? ''} onChange={e => setForm(f => ({ ...f, bairro: e.target.value || null }))} disabled={readOnly} className="input disabled:bg-slate-50" />
            </Field>
          </div>
          <Field label="Cidade / UF">
            <div className="flex gap-2">
              <input value={form.cidade ?? ''} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} disabled={readOnly} className="input flex-1 disabled:bg-slate-50" />
              <input value={form.uf ?? ''} maxLength={2} onChange={e => setForm(f => ({ ...f, uf: e.target.value.toUpperCase() }))} disabled={readOnly} className="input w-16 disabled:bg-slate-50" />
            </div>
          </Field>
        </div>

        <Field label="Endereço" faltando={!form.endereco}>
          <input value={form.endereco ?? ''} onChange={e => setForm(f => ({ ...f, endereco: e.target.value || null }))} disabled={readOnly} className="input disabled:bg-slate-50" />
        </Field>

        <Field label="Envolvimento">
          <select value={form.envolvimento ?? 'Não trabalhado'} onChange={e => setForm(f => ({ ...f, envolvimento: e.target.value as Envolvimento }))} disabled={readOnly} className="input disabled:bg-slate-50">
            {ENVOLVIMENTOS.map(env => <option key={env} value={env}>{env}</option>)}
          </select>
        </Field>

        {/* MARCADORES — dropdown com seleção */}
        <div>
          <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">Marcadores</span>
          {/* Selecionados */}
          {(form.marcadores ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(form.marcadores ?? []).map(m => (
                <span key={m} className="bg-marco-azul/10 text-marco-azul text-xs font-semibold pl-2.5 pr-1 py-1 rounded-full flex items-center gap-1">
                  {m}
                  {!readOnly && (
                    <button type="button" onClick={() => toggleArr('marcadores', m)} className="hover:bg-rose-100 rounded-full p-0.5">
                      <XIcon className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          {!readOnly && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMarcDropdown(v => !v)}
                className="w-full text-left input flex items-center justify-between"
              >
                <span className="text-slate-500 text-sm">+ Adicionar marcadores</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {marcDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {(config?.marcadores ?? []).map(m => (
                    <label key={m} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(form.marcadores ?? []).includes(m)}
                        onChange={() => toggleArr('marcadores', m)}
                      />
                      <span>{m}</span>
                    </label>
                  ))}
                  <div className="border-t border-slate-100 p-2 flex gap-1">
                    <input
                      value={novoMarcador}
                      onChange={e => setNovoMarcador(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarMarcador() } }}
                      placeholder="Criar marcador..."
                      className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
                    />
                    <button type="button" onClick={adicionarMarcador} disabled={!novoMarcador.trim()} className="bg-marco-azul text-white text-xs font-bold px-2 rounded disabled:opacity-50">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* NICHOS — dropdown com seleção */}
        <div>
          <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">Nichos</span>
          {(form.nichos ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(form.nichos ?? []).map(n => (
                <span key={n} className="bg-marco-amarelo/30 text-marco-azul-esc text-xs font-semibold pl-2.5 pr-1 py-1 rounded-full flex items-center gap-1">
                  {n}
                  {!readOnly && (
                    <button type="button" onClick={() => toggleArr('nichos', n)} className="hover:bg-rose-100 rounded-full p-0.5">
                      <XIcon className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          {!readOnly && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setNichoDropdown(v => !v)}
                className="w-full text-left input flex items-center justify-between"
              >
                <span className="text-slate-500 text-sm">+ Adicionar nichos</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {nichoDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {(config?.nichos ?? []).map(n => (
                    <label key={n} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(form.nichos ?? []).includes(n)}
                        onChange={() => toggleArr('nichos', n)}
                      />
                      <span>{n}</span>
                    </label>
                  ))}
                  <div className="border-t border-slate-100 p-2 flex gap-1">
                    <input
                      value={novoNicho}
                      onChange={e => setNovoNicho(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarNicho() } }}
                      placeholder="Criar nicho..."
                      className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
                    />
                    <button type="button" onClick={adicionarNicho} disabled={!novoNicho.trim()} className="bg-marco-azul text-white text-xs font-bold px-2 rounded disabled:opacity-50">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Field label="Observações">
          <textarea value={form.obs ?? ''} onChange={e => setForm(f => ({ ...f, obs: e.target.value || null }))} rows={3} disabled={readOnly} className="input disabled:bg-slate-50" />
        </Field>

        {/* ATENDIMENTOS DO ELEITOR */}
        {eleitor && atendimentosEleitor.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold text-slate-600 uppercase mb-2 flex items-center justify-between">
              <span>Atendimentos ({atendimentosEleitor.length})</span>
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {atendimentosEleitor.slice(0, 20).map(d => (
                <div
                  key={d.id}
                  onClick={() => onAbrirDemanda?.(d)}
                  className="border border-slate-100 rounded-lg p-2.5 hover:bg-slate-50 cursor-pointer flex items-center gap-2 text-sm"
                >
                  <span className="text-[10px] font-bold text-marco-azul bg-marco-azul/10 px-2 py-0.5 rounded uppercase">
                    {d.tipo}
                  </span>
                  <span className="flex-1 truncate text-slate-700">{d.descricao}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase whitespace-nowrap bg-slate-100 text-slate-600">
                    {labelStatusDemanda(d.status)}
                  </span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{d.data}</span>
                </div>
              ))}
              {atendimentosEleitor.length > 20 && (
                <div className="text-xs text-slate-400 text-center">+ {atendimentosEleitor.length - 20}</div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {eleitor && !readOnly ? (
            <button type="button" onClick={onDelete} className="text-rose-500 hover:bg-rose-50 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
              <Trash2 className="w-4 h-4" /> Excluir
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">
              {readOnly ? 'Fechar' : 'Cancelar'}
            </button>
            {!readOnly && (
              <button type="submit" disabled={salvar.isPending} className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-5 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" /> {salvar.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, children, obrigatorio, faltando }: { label: string; children: React.ReactNode; obrigatorio?: boolean; faltando?: boolean }) {
  return (
    <label className="block">
      <span className={`text-xs font-bold uppercase mb-1 block flex items-center gap-1 ${faltando && !obrigatorio ? 'text-amber-700' : 'text-slate-600'}`}>
        {label}
        {faltando && !obrigatorio && <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded">!</span>}
      </span>
      {children}
    </label>
  )
}
