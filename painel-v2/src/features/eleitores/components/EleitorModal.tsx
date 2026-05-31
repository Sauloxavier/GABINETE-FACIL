import { useState, useEffect } from 'react'
import { Save, Trash2, Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { useSalvarEleitor, useDeletarEleitor } from '@/features/eleitores/hooks'
import { useConfig, useSalvarConfig } from '@/features/config/hooks'
import type { Eleitor, EleitorInsert, Envolvimento } from '@/lib/database.types'

interface Props {
  open: boolean
  onClose: () => void
  eleitor?: Eleitor | null
}

const ENVOLVIMENTOS: Envolvimento[] = ['Não trabalhado', 'Em prospecção', 'Conquistado', 'Incerto', 'Perdido']

export function EleitorModal({ open, onClose, eleitor }: Props) {
  const { data: config } = useConfig()
  const salvar = useSalvarEleitor()
  const deletar = useDeletarEleitor()
  const salvarConfig = useSalvarConfig()
  const [novoMarcador, setNovoMarcador] = useState('')
  const [novoNicho, setNovoNicho] = useState('')

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
    } else if (open) {
      setForm({
        nome: '', telefone: null, cpf: null, sexo: null, nascimento: null,
        bairro: null, endereco: null, cidade: 'Limeira', uf: 'SP',
        email: null, rede_social: null, envolvimento: 'Não trabalhado',
        marcadores: [], nichos: [], obs: null,
      })
    }
  }, [eleitor, open])

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

  return (
    <Modal open={open} onClose={onClose} title={eleitor ? 'Editar eleitor' : 'Novo eleitor'} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        {eleitor?.codigo && (
          <div className="bg-marco-azul/5 border border-marco-azul/20 rounded-lg px-3 py-2 text-sm">
            <span className="text-xs text-slate-500">Código: </span>
            <span className="font-mono font-bold text-marco-azul">{eleitor.codigo}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nome *">
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required className="input" />
          </Field>
          <Field label="Telefone">
            <input value={form.telefone ?? ''} onChange={e => setForm(f => ({ ...f, telefone: e.target.value || null }))} placeholder="19 99999-8888" className="input" />
          </Field>
          <Field label="CPF">
            <input value={form.cpf ?? ''} onChange={e => setForm(f => ({ ...f, cpf: e.target.value || null }))} className="input" />
          </Field>
          <Field label="Nascimento">
            <input type="date" value={form.nascimento ?? ''} onChange={e => setForm(f => ({ ...f, nascimento: e.target.value || null }))} className="input" />
          </Field>
          <Field label="Sexo">
            <select value={form.sexo ?? ''} onChange={e => setForm(f => ({ ...f, sexo: e.target.value || null }))} className="input">
              <option value="">—</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </Field>
          <Field label="E-mail">
            <input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value || null }))} className="input" />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Field label="Bairro">
              <input value={form.bairro ?? ''} onChange={e => setForm(f => ({ ...f, bairro: e.target.value || null }))} className="input" />
            </Field>
          </div>
          <Field label="Cidade / UF">
            <div className="flex gap-2">
              <input value={form.cidade ?? ''} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} className="input flex-1" />
              <input value={form.uf ?? ''} maxLength={2} onChange={e => setForm(f => ({ ...f, uf: e.target.value.toUpperCase() }))} className="input w-16" />
            </div>
          </Field>
        </div>

        <Field label="Endereço">
          <input value={form.endereco ?? ''} onChange={e => setForm(f => ({ ...f, endereco: e.target.value || null }))} className="input" />
        </Field>

        <Field label="Envolvimento">
          <select value={form.envolvimento ?? 'Não trabalhado'} onChange={e => setForm(f => ({ ...f, envolvimento: e.target.value as Envolvimento }))} className="input">
            {ENVOLVIMENTOS.map(env => <option key={env} value={env}>{env}</option>)}
          </select>
        </Field>

        <div>
          <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">Marcadores</span>
          {(config?.marcadores?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {config!.marcadores.map(m => (
                <button
                  type="button"
                  key={m}
                  onClick={() => toggleArr('marcadores', m)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${(form.marcadores ?? []).includes(m) ? 'bg-marco-azul text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={novoMarcador}
              onChange={e => setNovoMarcador(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarMarcador() } }}
              placeholder="Criar novo marcador..."
              className="input flex-1 text-xs"
            />
            <button type="button" onClick={adicionarMarcador} disabled={!novoMarcador.trim() || salvarConfig.isPending}
              className="bg-marco-azul text-white text-xs font-bold px-3 rounded-lg flex items-center gap-1 disabled:opacity-50">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        </div>

        <div>
          <span className="text-xs font-bold text-slate-600 uppercase mb-1 block">Nichos</span>
          {(config?.nichos?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {config!.nichos.map(n => (
                <button
                  type="button"
                  key={n}
                  onClick={() => toggleArr('nichos', n)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${(form.nichos ?? []).includes(n) ? 'bg-marco-amarelo text-marco-azul-esc' : 'bg-slate-100 text-slate-700'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={novoNicho}
              onChange={e => setNovoNicho(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarNicho() } }}
              placeholder="Criar novo nicho (ex: Bairro Centro, Comunidade XYZ)..."
              className="input flex-1 text-xs"
            />
            <button type="button" onClick={adicionarNicho} disabled={!novoNicho.trim() || salvarConfig.isPending}
              className="bg-marco-azul text-white text-xs font-bold px-3 rounded-lg flex items-center gap-1 disabled:opacity-50">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        </div>

        <Field label="Observações">
          <textarea value={form.obs ?? ''} onChange={e => setForm(f => ({ ...f, obs: e.target.value || null }))} rows={3} className="input" />
        </Field>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {eleitor ? (
            <button type="button" onClick={onDelete} className="text-rose-500 hover:bg-rose-50 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
              <Trash2 className="w-4 h-4" /> Excluir
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button type="submit" disabled={salvar.isPending} className="bg-marco-azul hover:bg-marco-azul-esc text-white font-bold px-5 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
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
