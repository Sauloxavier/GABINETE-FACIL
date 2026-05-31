import { useState, useEffect, useMemo } from 'react'
import { Save, Trash2, MessageCircle, User } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { useSalvarDemanda, useDeletarDemanda } from '@/features/demandas/hooks'
import { useEleitores } from '@/features/eleitores/hooks'
import { useNavigate } from '@tanstack/react-router'
import type { Demanda, DemandaInsert } from '@/lib/database.types'
import { STATUS_DEMANDA } from '@/lib/status-demanda'
const TIPOS = [
  'Saúde', 'Educação', 'Infraestrutura', 'Iluminação', 'Asfalto / Buraco',
  'Limpeza pública', 'Transporte', 'Segurança', 'Esporte / Cultura',
  'Assistência social', 'Documentação', 'Doação', 'Habitação', 'Meio Ambiente',
  'Obras', 'Outros',
]
const ORGAOS = [
  'Secretaria de Saúde', 'Secretaria de Educação', 'Secretaria de Obras',
  'Secretaria de Meio Ambiente', 'Secretaria de Esporte/Cultura/Turismo',
  'Secretaria de Assistência Social', 'Secretaria de Trânsito',
  'Câmara Municipal de Limeira', 'Prefeitura — Gabinete',
  'Concessionária (água/luz)', 'Outro',
]
const ORIGENS = ['Presencial', 'WhatsApp', 'Telefone', 'Email', 'Visita do gabinete', 'Indicação', 'Redes sociais']

interface Props {
  open: boolean
  onClose: () => void
  demanda?: Demanda | null
  eleitorIdInicial?: string
  statusInicial?: string
}

export function DemandaModal({ open, onClose, demanda, eleitorIdInicial, statusInicial }: Props) {
  const { data: eleitores } = useEleitores()
  const salvar = useSalvarDemanda()
  const deletar = useDeletarDemanda()
  const [buscaEleitor, setBuscaEleitor] = useState('')

  const [form, setForm] = useState<DemandaInsert>({
    eleitor_id: '',
    tipo: '',
    status: 'Aberta',
    descricao: '',
    data: new Date().toISOString().slice(0, 10),
    orgao_responsavel: null,
    origem: 'Presencial',
    notas: null,
  })

  useEffect(() => {
    if (demanda) {
      setForm({
        eleitor_id: demanda.eleitor_id,
        tipo: demanda.tipo,
        status: demanda.status,
        descricao: demanda.descricao,
        data: demanda.data,
        orgao_responsavel: demanda.orgao_responsavel,
        origem: demanda.origem,
        notas: demanda.notas,
      })
    } else if (open) {
      setForm({
        eleitor_id: eleitorIdInicial ?? '',
        tipo: '',
        status: (statusInicial ?? 'Aberta'),
        descricao: '',
        data: new Date().toISOString().slice(0, 10),
        orgao_responsavel: null,
        origem: 'Presencial',
        notas: null,
      })
    }
  }, [demanda, open, eleitorIdInicial, statusInicial])

  const eleitoresFiltrados = useMemo(() => {
    if (!eleitores) return []
    const q = buscaEleitor.toLowerCase().trim()
    if (!q) return eleitores.slice(0, 20)
    return eleitores.filter(e => e.nome.toLowerCase().includes(q)).slice(0, 20)
  }, [eleitores, buscaEleitor])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.eleitor_id || !form.tipo || !form.descricao.trim()) return
    try {
      await salvar.mutateAsync({ id: demanda?.id, ...form })
      toast.success(demanda ? 'Atendimento atualizado' : 'Atendimento cadastrado')
      onClose()
    } catch (err) {
      toast.error('Erro ao salvar: ' + (err as Error).message)
    }
  }

  async function onDelete() {
    if (!demanda) return
    if (!confirm('Excluir esse atendimento?')) return
    await deletar.mutateAsync(demanda.id)
    toast.success('Atendimento excluído')
    onClose()
  }

  const eleitorSelecionado = eleitores?.find(e => e.id === form.eleitor_id)
  const navigate = useNavigate()

  function abrirWhatsAppEleitor() {
    if (!eleitorSelecionado?.telefone) {
      toast.error('Eleitor sem telefone cadastrado')
      return
    }
    const num = eleitorSelecionado.telefone.replace(/\D/g, '')
    const numFinal = num.startsWith('55') ? num : '55' + num
    window.open(`https://wa.me/${numFinal}`, '_blank')
  }

  function abrirCadastroEleitor() {
    if (!eleitorSelecionado) return
    navigate({ to: '/eleitores', search: { id: eleitorSelecionado.id } as never })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={demanda ? 'Editar atendimento' : 'Novo atendimento'} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Eleitor */}
        <Field label="Eleitor *">
          {eleitorSelecionado ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-marco-azul/5 rounded-lg">
                <span className="flex-1 font-semibold text-marco-azul">{eleitorSelecionado.nome}</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, eleitor_id: '' }))} className="text-xs text-slate-500 hover:underline">
                  trocar
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={abrirCadastroEleitor}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1"
                >
                  <User className="w-3 h-3" /> Ver cadastro do eleitor
                </button>
                <button
                  type="button"
                  onClick={abrirWhatsAppEleitor}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" /> Abrir WhatsApp
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                value={buscaEleitor}
                onChange={e => setBuscaEleitor(e.target.value)}
                placeholder="Buscar eleitor por nome..."
                className="input"
              />
              {eleitoresFiltrados.length > 0 && (
                <div className="mt-1 border border-slate-200 rounded-lg max-h-48 overflow-y-auto scrollbar-thin">
                  {eleitoresFiltrados.map(e => (
                    <button
                      type="button"
                      key={e.id}
                      onClick={() => { setForm(f => ({ ...f, eleitor_id: e.id })); setBuscaEleitor('') }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100"
                    >
                      <div className="font-medium">{e.nome}</div>
                      <div className="text-xs text-slate-500">{e.telefone ?? 'sem tel'} · {e.bairro ?? '—'}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Tipo *">
            <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} required className="input">
              <option value="">— Escolha —</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Andamento">
            <select value={form.status ?? 'Aberta'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
              {STATUS_DEMANDA.map(s => <option key={s.valor} value={s.valor}>{s.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Descrição *">
          <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3} required className="input" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Data">
            <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="input" />
          </Field>
          <Field label="Origem">
            <select value={form.origem ?? ''} onChange={e => setForm(f => ({ ...f, origem: e.target.value || null }))} className="input">
              <option value="">—</option>
              {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Órgão">
            <select value={form.orgao_responsavel ?? ''} onChange={e => setForm(f => ({ ...f, orgao_responsavel: e.target.value || null }))} className="input">
              <option value="">—</option>
              {ORGAOS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Notas internas">
          <textarea value={form.notas ?? ''} onChange={e => setForm(f => ({ ...f, notas: e.target.value || null }))} rows={3} className="input" />
        </Field>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {demanda ? (
            <button type="button" onClick={onDelete} className="text-rose-500 hover:bg-rose-50 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
              <Trash2 className="w-4 h-4" /> Excluir
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button type="submit" disabled={salvar.isPending || !form.eleitor_id} className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-5 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" /> {salvar.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
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
