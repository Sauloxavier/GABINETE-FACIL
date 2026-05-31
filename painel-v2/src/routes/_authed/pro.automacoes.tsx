import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Workflow, Loader2, Power, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/Toast'

export const Route = createFileRoute('/_authed/pro/automacoes')({
  component: AutomacoesPage,
})

interface Automacao {
  id: string
  nome: string
  descricao: string | null
  tipo: string
  ativo: boolean
  gatilho: Record<string, unknown>
  acao: Record<string, unknown>
  ultima_execucao: string | null
  total_execucoes: number
  total_falhas: number
}

const TIPO_META: Record<string, { label: string; emoji: string; cor: string }> = {
  boas_vindas:      { label: 'Boas-vindas a novo eleitor',  emoji: '👋', cor: 'bg-emerald-100 text-emerald-700' },
  fup:              { label: 'FUP de atendimento parado',    emoji: '🔁', cor: 'bg-blue-100 text-blue-700' },
  reativacao:       { label: 'Reativar eleitor frio',        emoji: '❄️', cor: 'bg-sky-100 text-sky-700' },
  aniversario:      { label: 'Aniversário do eleitor',       emoji: '🎂', cor: 'bg-rose-100 text-rose-700' },
  resposta_keyword: { label: 'Auto-resposta por palavra',    emoji: '🔑', cor: 'bg-amber-100 text-amber-700' },
}

function AutomacoesPage() {
  const [automacoes, setAutomacoes] = useState<Automacao[]>([])
  const [loading, setLoading] = useState(true)
  const [erroSchema, setErroSchema] = useState(false)

  async function carregar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('automacoes')
      .select('*')
      .order('criado_em', { ascending: false })
    if (error) {
      console.error('[automacoes]', error)
      // tabela ainda não criada (migration 09 não rodou)
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
      toast.success(a.ativo ? 'Automação pausada' : 'Automação ativada')
      carregar()
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 mb-6 flex items-center gap-2">
        <Workflow className="w-8 h-8 text-marco-azul" /> Automações
      </h1>

      {erroSchema && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4 text-sm text-rose-800">
          ⚠️ A tabela <code>automacoes</code> não existe no banco. Rode a migration{' '}
          <code>painel/supabase/09-automacoes.sql</code> no Supabase Studio.
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-sm text-amber-900">
        ⚙️ Pra rodar 24/7, o worker <code>scripts/automacoes/</code> precisa estar ativo na VM.
        Sem ele, as regras ficam configuradas mas não disparam sozinhas.
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
        </div>
      ) : automacoes.length === 0 ? (
        <div className="bg-white rounded-2xl ring-soft p-12 text-center text-slate-500">
          Sem automações ainda. Rode a migration 09 pra criar os modelos prontos
          (boas-vindas, FUP, reativação, aniversário).
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {automacoes.map(a => {
            const meta = TIPO_META[a.tipo] ?? { label: a.tipo, emoji: '⚙️', cor: 'bg-slate-100 text-slate-700' }
            return (
              <div key={a.id} className="bg-white rounded-2xl ring-soft p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-12 h-12 rounded-2xl ${meta.cor} flex items-center justify-center text-2xl`}>
                    {meta.emoji}
                  </div>
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
                {a.descricao && (
                  <p className="text-xs text-slate-600 mb-3">{a.descricao}</p>
                )}
                <div className="flex items-center gap-3 text-xs border-t border-slate-100 pt-3">
                  <span className="text-emerald-600 font-bold">✓ {a.total_execucoes ?? 0}</span>
                  <span className="text-rose-600 font-bold">✗ {a.total_falhas ?? 0}</span>
                  <span className="text-slate-400 ml-auto">
                    {a.ultima_execucao
                      ? new Date(a.ultima_execucao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : 'nunca'}
                  </span>
                </div>
                <button className="mt-3 w-full text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg flex items-center justify-center gap-1">
                  <Pencil className="w-3 h-3" /> Editar (em breve)
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
