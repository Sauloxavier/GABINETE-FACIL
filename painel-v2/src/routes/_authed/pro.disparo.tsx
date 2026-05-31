import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Rocket, Filter, MessageSquare, Send, CheckCircle2, XCircle, Loader2, Image, Mic, Shuffle, Upload } from 'lucide-react'
import { useEleitores } from '@/features/eleitores/hooks'
import { useConfig } from '@/features/config/hooks'
import { WahaClient } from '@/lib/waha'
import { supabase } from '@/lib/supabase'
import { iniciais, chatIdDe } from '@/lib/utils'
import { variarMensagem, temSpintax, expandirSpintax } from '@/lib/spintax'

export const Route = createFileRoute('/_authed/pro/disparo')({
  component: DisparoPage,
})

type Modo = 'navegador' | 'waha'
type TipoMidia = 'texto' | 'imagem' | 'audio'

function DisparoPage() {
  const { data: eleitores } = useEleitores()
  const { data: config } = useConfig()

  const [filtroEnv, setFiltroEnv] = useState('')
  const [filtroBairro, setFiltroBairro] = useState('')
  const [filtroNicho, setFiltroNicho] = useState('')
  const [somenteComTel, setSomenteComTel] = useState(true)
  const [templateId, setTemplateId] = useState('')
  const [usarCustom, setUsarCustom] = useState(false)
  const [conteudoCustom, setConteudoCustom] = useState('')
  const [modo, setModo] = useState<Modo>('waha')
  const [tipoMidia, setTipoMidia] = useState<TipoMidia>('texto')
  const [intervaloMin, setIntervaloMin] = useState(8)
  const [intervaloMax, setIntervaloMax] = useState(20)
  const [aplicarVariacoes, setAplicarVariacoes] = useState(true)

  // Mídia
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [arquivoUrl, setArquivoUrl] = useState('')
  const [uploadando, setUploadando] = useState(false)

  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [progresso, setProgresso] = useState({ enviados: 0, falhas: 0, total: 0 })
  const [parar, setParar] = useState(false)

  const bairros = useMemo(() => {
    if (!eleitores) return []
    return [...new Set(eleitores.map(e => e.bairro).filter(Boolean) as string[])].sort()
  }, [eleitores])

  const destinatarios = useMemo(() => {
    if (!eleitores) return []
    return eleitores.filter(e => {
      if (filtroEnv && e.envolvimento !== filtroEnv) return false
      if (filtroBairro && e.bairro !== filtroBairro) return false
      if (filtroNicho && !(e.nichos ?? []).includes(filtroNicho)) return false
      if (somenteComTel && !(e.telefone ?? '').replace(/\D/g, '')) return false
      return true
    })
  }, [eleitores, filtroEnv, filtroBairro, filtroNicho, somenteComTel])

  const conteudoEfetivo = useMemo(() => {
    if (usarCustom) return conteudoCustom
    return config?.mensagens_padrao?.find(t => t.id === templateId)?.conteudo ?? ''
  }, [usarCustom, conteudoCustom, templateId, config])

  const previewMsg = useMemo(() => {
    const alvo = destinatarios[0]
    if (!alvo || !conteudoEfetivo) return '(sem destinatário ou template)'
    const vars = {
      nome: alvo.nome.split(' ')[0] ?? alvo.nome,
      nome_completo: alvo.nome,
      primeiro_nome: alvo.nome.split(' ')[0] ?? '',
      bairro: alvo.bairro ?? '',
      vereador: config?.nome_vereador ?? 'Marco Xavier',
    }
    return variarMensagem(conteudoEfetivo, vars, aplicarVariacoes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinatarios, conteudoEfetivo, aplicarVariacoes, config])

  async function uploadArquivo() {
    if (!arquivo) return
    setUploadando(true)
    try {
      const ext = (arquivo.name.split('.').pop() || 'bin').toLowerCase()
      const path = `disparo/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage.from('anexos').upload(path, arquivo, {
        contentType: arquivo.type,
        upsert: false,
      })
      if (error) throw error
      // URL pública (anexos é private; geramos signed URL longa)
      const { data: pub } = await supabase.storage.from('anexos').createSignedUrl(path, 60 * 60 * 24 * 7)
      setArquivoUrl(pub?.signedUrl ?? '')
      setResultado({ ok: true, msg: 'Mídia enviada ao Storage' })
    } catch (err) {
      setResultado({ ok: false, msg: 'Falha no upload: ' + (err as Error).message })
    } finally {
      setUploadando(false)
    }
  }

  async function disparar() {
    if (tipoMidia === 'texto' && !conteudoEfetivo.trim()) {
      setResultado({ ok: false, msg: 'Escreva uma mensagem ou escolha um template' })
      return
    }
    if ((tipoMidia === 'imagem' || tipoMidia === 'audio') && !arquivoUrl) {
      setResultado({ ok: false, msg: 'Faça upload da mídia primeiro' })
      return
    }
    if (destinatarios.length === 0) {
      setResultado({ ok: false, msg: 'Nenhum destinatário com esses filtros' })
      return
    }
    if (modo === 'waha' && !config?.waha_url) {
      setResultado({ ok: false, msg: 'WAHA não configurado — vá em Configurações' })
      return
    }

    const txtConfirm = tipoMidia === 'texto' ? 'mensagem'
                     : tipoMidia === 'imagem' ? 'imagem com legenda'
                     : 'áudio'
    if (!confirm(
      `Disparar ${txtConfirm} pra ${destinatarios.length} contato(s)?\n\n` +
      `Intervalo: ${intervaloMin}-${intervaloMax}s entre cada envio.\n` +
      (aplicarVariacoes ? '✓ Anti-bloqueio: spintax + microvariações ativos.' : '⚠️ Sem variações — risco de bloqueio.')
    )) return

    setEnviando(true)
    setParar(false)
    setResultado(null)
    setProgresso({ enviados: 0, falhas: 0, total: destinatarios.length })

    if (modo === 'waha') {
      const waha = new WahaClient({
        waha_url: config!.waha_url,
        waha_api_key: config!.waha_api_key,
        waha_session: config!.waha_session,
      })
      let enviados = 0
      let falhas = 0
      for (let i = 0; i < destinatarios.length; i++) {
        if (parar) break
        const e = destinatarios[i]
        const tel = (e.telefone ?? '').replace(/\D/g, '')
        if (!tel) { falhas++; continue }
        const chatId = `${tel.startsWith('55') ? tel : '55' + tel}@c.us`
        const vars = {
          nome: e.nome.split(' ')[0] ?? e.nome,
          nome_completo: e.nome,
          primeiro_nome: e.nome.split(' ')[0] ?? '',
          bairro: e.bairro ?? '',
          vereador: config?.nome_vereador ?? 'Marco Xavier',
        }
        try {
          if (tipoMidia === 'texto') {
            const msg = variarMensagem(conteudoEfetivo, vars, aplicarVariacoes)
            await waha.enviarTexto(chatId, msg)
          } else if (tipoMidia === 'imagem') {
            const caption = conteudoEfetivo.trim() ? variarMensagem(conteudoEfetivo, vars, aplicarVariacoes) : undefined
            await waha.enviarImagem(chatId, arquivoUrl, caption)
          } else if (tipoMidia === 'audio') {
            await waha.enviarAudio(chatId, arquivoUrl)
          }
          enviados++
        } catch {
          falhas++
        }
        setProgresso({ enviados, falhas, total: destinatarios.length })
        if (i < destinatarios.length - 1) {
          const espera = (intervaloMin + Math.random() * (intervaloMax - intervaloMin)) * 1000
          await new Promise(r => setTimeout(r, espera))
        }
      }
      setResultado({
        ok: falhas === 0,
        msg: `Disparo concluído: ${enviados} enviado(s), ${falhas} falha(s)`,
      })
    } else {
      // Modo navegador: só texto
      let i = 0
      for (const e of destinatarios) {
        if (parar) break
        const num = (chatIdDe(e.telefone) ?? '').replace('@c.us', '')
        if (!num) continue
        const vars = {
          nome: e.nome.split(' ')[0] ?? e.nome,
          nome_completo: e.nome,
          primeiro_nome: e.nome.split(' ')[0] ?? '',
          bairro: e.bairro ?? '',
          vereador: config?.nome_vereador ?? 'Marco Xavier',
        }
        const msg = variarMensagem(conteudoEfetivo, vars, aplicarVariacoes)
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
        i++
        setProgresso({ enviados: i, falhas: 0, total: destinatarios.length })
        await new Promise(r => setTimeout(r, 1000))
      }
      setResultado({ ok: true, msg: `Abertos ${i} chats no WhatsApp Web` })
    }

    setEnviando(false)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 mb-6 flex items-center gap-2">
        <Rocket className="w-8 h-8 text-marco-azul" /> Disparo em massa
      </h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white rounded-2xl ring-soft p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Filter className="w-4 h-4" /> 1. Destinatários
              </h3>
              <span className="text-sm font-bold text-marco-azul">{destinatarios.length}</span>
            </div>
            <div className="space-y-2">
              <select value={filtroEnv} onChange={e => setFiltroEnv(e.target.value)} className="input">
                <option value="">Todos envolvimentos</option>
                <option value="Não trabalhado">Não trabalhado</option>
                <option value="Em prospecção">Em prospecção</option>
                <option value="Conquistado">Conquistado</option>
                <option value="Incerto">Incerto</option>
                <option value="Perdido">Perdido</option>
              </select>
              <select value={filtroBairro} onChange={e => setFiltroBairro(e.target.value)} className="input">
                <option value="">Todos bairros</option>
                {bairros.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={filtroNicho} onChange={e => setFiltroNicho(e.target.value)} className="input">
                <option value="">Todos nichos</option>
                {(config?.nichos ?? []).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={somenteComTel} onChange={e => setSomenteComTel(e.target.checked)} />
                Apenas com telefone
              </label>
            </div>
            <div className="mt-3 max-h-48 overflow-y-auto scrollbar-thin border-t border-slate-100 pt-2">
              {destinatarios.slice(0, 10).map(e => (
                <div key={e.id} className="flex items-center gap-2 text-xs py-1">
                  <div className="w-6 h-6 rounded-full bg-marco-azul text-white font-bold text-[10px] flex items-center justify-center">
                    {iniciais(e.nome)}
                  </div>
                  <span className="flex-1 truncate text-slate-700">{e.nome}</span>
                  <span className="text-slate-400">{e.telefone || 'sem tel'}</span>
                </div>
              ))}
              {destinatarios.length > 10 && (
                <div className="text-xs text-slate-400 text-center mt-1">+ {destinatarios.length - 10}</div>
              )}
            </div>
          </div>

          {/* Tipo de mídia + Mensagem */}
          <div className="bg-white rounded-2xl ring-soft p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> 2. Conteúdo
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(['texto', 'imagem', 'audio'] as TipoMidia[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTipoMidia(t)}
                  className={`border-2 rounded-lg p-2 text-xs font-bold flex flex-col items-center gap-1 ${
                    tipoMidia === t ? 'border-marco-azul bg-marco-azul/5 text-marco-azul' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {t === 'texto' && <MessageSquare className="w-4 h-4" />}
                  {t === 'imagem' && <Image className="w-4 h-4" />}
                  {t === 'audio' && <Mic className="w-4 h-4" />}
                  {t === 'texto' ? 'Texto' : t === 'imagem' ? 'Imagem' : 'Áudio'}
                </button>
              ))}
            </div>

            {(tipoMidia === 'imagem' || tipoMidia === 'audio') && (
              <div className="mb-3 bg-slate-50 rounded-lg p-3">
                <label className="block">
                  <input
                    type="file"
                    accept={tipoMidia === 'imagem' ? 'image/*' : 'audio/*'}
                    onChange={e => setArquivo(e.target.files?.[0] ?? null)}
                    className="text-xs w-full"
                  />
                </label>
                {arquivo && !arquivoUrl && (
                  <button onClick={uploadArquivo} disabled={uploadando} className="mt-2 w-full bg-marco-azul text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
                    <Upload className="w-3 h-3" />
                    {uploadando ? 'Enviando...' : `Enviar ${arquivo.name}`}
                  </button>
                )}
                {arquivoUrl && (
                  <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Pronto pra enviar
                  </div>
                )}
              </div>
            )}

            {(tipoMidia === 'texto' || tipoMidia === 'imagem') && (
              <>
                <div className="text-xs flex gap-3 mb-2">
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={!usarCustom} onChange={() => setUsarCustom(false)} />
                    Template
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={usarCustom} onChange={() => setUsarCustom(true)} />
                    Custom
                  </label>
                </div>
                {!usarCustom ? (
                  <select value={templateId} onChange={e => setTemplateId(e.target.value)} className="input">
                    <option value="">— Escolha —</option>
                    {(config?.mensagens_padrao ?? []).map(t => (
                      <option key={t.id} value={t.id}>{t.nome} ({t.categoria})</option>
                    ))}
                  </select>
                ) : (
                  <textarea value={conteudoCustom} onChange={e => setConteudoCustom(e.target.value)} rows={5}
                    placeholder="Olá {{nome}}, {Oi|E aí|Tudo bem}, ..."
                    className="input" />
                )}
                {temSpintax(conteudoEfetivo) && (
                  <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1 bg-emerald-50 rounded p-2">
                    <Shuffle className="w-3 h-3" /> Spintax detectado — cada envio será uma variação diferente
                  </div>
                )}
                <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                  <div className="text-xs font-bold text-emerald-700 mb-1">PRÉVIA (1º destinatário)</div>
                  <div className="text-sm text-slate-700 whitespace-pre-line">{previewMsg}</div>
                </div>
                <div className="mt-2 text-[10px] text-slate-500">
                  💡 Spintax: <code>{'{Olá|Oi|E aí}'}</code> → sorteia 1 por envio. Variáveis: <code>{'{{nome}}'}</code>, <code>{'{{bairro}}'}</code>, <code>{'{{vereador}}'}</code>.
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Anti-bloqueio + Modo + Intervalo */}
          <div className="bg-white rounded-2xl ring-soft p-5">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Shuffle className="w-4 h-4" /> 3. Anti-bloqueio
            </h3>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={aplicarVariacoes} onChange={e => setAplicarVariacoes(e.target.checked)} className="mt-1" />
              <div>
                <div className="font-semibold">Aplicar microvariações automáticas</div>
                <div className="text-xs text-slate-500">Pontuação, espaços invisíveis e emojis diferentes em cada envio. Reduz risco de bloqueio do Meta.</div>
              </div>
            </label>
          </div>

          <div className="bg-white rounded-2xl ring-soft p-5">
            <h3 className="font-bold text-slate-800 mb-3">4. Modo de envio</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className={`border-2 rounded-xl p-3 cursor-pointer flex items-start gap-2 ${modo === 'waha' ? 'border-marco-azul bg-marco-azul/5' : 'border-slate-200'}`}>
                <input type="radio" value="waha" checked={modo === 'waha'} onChange={() => setModo('waha')} className="mt-1" />
                <div>
                  <div className="font-bold text-sm">⚡ Via WhatsApp (WAHA)</div>
                  <div className="text-xs text-slate-500">Automático com intervalo aleatório. Suporta texto, imagem e áudio.</div>
                </div>
              </label>
              <label className={`border-2 rounded-xl p-3 cursor-pointer flex items-start gap-2 ${modo === 'navegador' ? 'border-marco-azul bg-marco-azul/5' : 'border-slate-200'}`}>
                <input type="radio" value="navegador" checked={modo === 'navegador'} onChange={() => setModo('navegador')} className="mt-1" />
                <div>
                  <div className="font-bold text-sm">🌐 Navegador</div>
                  <div className="text-xs text-slate-500">Abre wa.me um por vez. Só texto.</div>
                </div>
              </label>
            </div>

            <h4 className="font-bold text-slate-700 mt-4 mb-2 text-sm">Tempo entre envios</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500">Mínimo (s)</label>
                <input type="number" min={2} value={intervaloMin} onChange={e => setIntervaloMin(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Máximo (s)</label>
                <input type="number" min={2} value={intervaloMax} onChange={e => setIntervaloMax(Number(e.target.value))} className="input" />
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              ⏱ Tempo estimado: <strong>{Math.ceil(destinatarios.length * (intervaloMin + intervaloMax) / 2 / 60)} min</strong> pra {destinatarios.length} contato(s)
            </div>
            <div className="text-xs text-amber-700 mt-1">
              💡 8-30s pra evitar bloqueio. Acima de 100/dia: risco alto.
            </div>
          </div>

          {/* Botão */}
          {!enviando ? (
            <button
              onClick={disparar}
              className="w-full bg-marco-azul hover:bg-marco-azul-esc text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-lg"
            >
              <Send className="w-5 h-5" />
              🚀 Disparar para {destinatarios.length}
            </button>
          ) : (
            <button
              onClick={() => setParar(true)}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-lg"
            >
              <XCircle className="w-5 h-5" /> Parar disparo
            </button>
          )}

          {enviando && (
            <div className="bg-white rounded-2xl ring-soft p-4">
              <div className="flex items-center gap-2 text-sm font-bold mb-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-emerald-50 rounded p-2">
                  <div className="text-xl font-black text-emerald-600">{progresso.enviados}</div>
                  <div className="text-emerald-700">Enviados</div>
                </div>
                <div className="bg-rose-50 rounded p-2">
                  <div className="text-xl font-black text-rose-600">{progresso.falhas}</div>
                  <div className="text-rose-700">Falhas</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-xl font-black text-slate-600">{progresso.total - progresso.enviados - progresso.falhas}</div>
                  <div className="text-slate-700">Restam</div>
                </div>
              </div>
            </div>
          )}

          {resultado && (
            <div className={`rounded-xl p-4 flex items-start gap-2 ${resultado.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'}`}>
              {resultado.ok ? <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" /> : <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
              <div className="text-sm">{resultado.msg}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Suprime unused
void expandirSpintax
