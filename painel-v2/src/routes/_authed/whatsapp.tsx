import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { Phone, Loader2, RefreshCw, Power, PowerOff, CheckCircle2 } from 'lucide-react'
import { useConfig } from '@/features/config/hooks'
import { WahaClient, type WahaStatus } from '@/lib/waha'

export const Route = createFileRoute('/_authed/whatsapp')({
  component: WhatsAppPage,
})

function WhatsAppPage() {
  const { data: config } = useConfig()
  const [status, setStatus] = useState<WahaStatus>({ status: 'unknown' })
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [carregandoQr, setCarregandoQr] = useState(false)

  const waha = useMemo(() => config ? new WahaClient(config) : null, [config])

  async function refresh() {
    if (!waha) return
    const s = await waha.status()
    setStatus(s)
    if (s.status === 'SCAN_QR_CODE') {
      setCarregandoQr(true)
      const url = await waha.qr()
      setQrUrl(url)
      setCarregandoQr(false)
    } else {
      setQrUrl(null)
    }
  }

  useEffect(() => {
    if (!waha?.isConfigured) return
    refresh()
    const iv = setInterval(refresh, 5000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waha?.isConfigured])

  async function iniciar() {
    if (!waha) return
    try { await waha.iniciar(); refresh() } catch (e) { alert((e as Error).message) }
  }

  async function parar() {
    if (!waha) return
    if (!confirm('Parar a sessão? Vai precisar escanear QR novamente.')) return
    try { await waha.parar(); refresh() } catch (e) { alert((e as Error).message) }
  }

  const statusMeta = {
    'WORKING':       { label: 'CONECTADO',  cor: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    'SCAN_QR_CODE':  { label: 'AGUARDANDO QR', cor: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    'STARTING':      { label: 'INICIANDO',  cor: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
    'STOPPED':       { label: 'PARADO',     cor: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400' },
    'FAILED':        { label: 'FALHOU',     cor: 'bg-rose-100 text-rose-700',     dot: 'bg-rose-500' },
    'unknown':       { label: 'DESCONHECIDO', cor: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' },
  }[status.status] ?? { label: status.status, cor: 'bg-slate-100', dot: 'bg-slate-300' }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 mb-6 flex items-center gap-2">
        <Phone className="w-8 h-8 text-marco-azul" /> Conexão WhatsApp
      </h1>

      {!waha?.isConfigured && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4 text-sm text-rose-800">
          ⚠️ WAHA não configurado. Vá em <a href="/config" className="underline font-bold">Configurações → WhatsApp</a>.
        </div>
      )}

      <div className="bg-white rounded-2xl ring-soft p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-xs text-slate-500">Status</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-3 h-3 rounded-full ${statusMeta.dot} ${status.status === 'WORKING' ? 'animate-pulse' : ''}`} />
              <span className={`text-sm font-bold px-2 py-1 rounded-full ${statusMeta.cor}`}>{statusMeta.label}</span>
            </div>
            {status.me?.pushName && (
              <div className="text-sm text-slate-600 mt-2">
                📱 Conectado como <strong>{status.me.pushName}</strong>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={refresh} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
              <RefreshCw className="w-4 h-4" /> Atualizar
            </button>
            {status.status === 'STOPPED' || status.status === 'FAILED' ? (
              <button onClick={iniciar} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
                <Power className="w-4 h-4" /> Iniciar
              </button>
            ) : status.status === 'WORKING' ? (
              <button onClick={parar} className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1">
                <PowerOff className="w-4 h-4" /> Parar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {status.status === 'SCAN_QR_CODE' && (
        <div className="bg-white rounded-2xl ring-soft p-6 text-center">
          <h3 className="font-bold text-slate-800 mb-2">📱 Escaneie o QR Code com o WhatsApp</h3>
          <p className="text-sm text-slate-500 mb-4">
            Abra o WhatsApp no celular do Marco → <strong>Configurações → Aparelhos conectados → Conectar um aparelho</strong>
          </p>
          {carregandoQr ? (
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-marco-azul" />
          ) : qrUrl ? (
            <img src={qrUrl} alt="QR Code WhatsApp" className="mx-auto rounded-xl shadow-lg" style={{ maxWidth: 360 }} />
          ) : (
            <div className="text-rose-500 text-sm">QR Code não disponível — clique em Atualizar</div>
          )}
          <p className="text-xs text-slate-400 mt-4">
            ⏱ O QR atualiza automaticamente a cada 5s.
          </p>
        </div>
      )}

      {status.status === 'WORKING' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
          <h3 className="font-bold text-emerald-800 text-lg">Conectado!</h3>
          <p className="text-sm text-emerald-700 mt-1">
            O painel pode enviar e receber mensagens. Acesse <a href="/conversas" className="underline font-bold">Conversas</a> ou{' '}
            <a href="/pro/disparo" className="underline font-bold">Disparo em massa</a>.
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mt-4 text-sm text-blue-900">
        💡 <strong>Importante:</strong> Conecte 1x só. A sessão fica salva no servidor WAHA — os assessores
        não precisam escanear QR de novo, basta abrir o painel.
      </div>
    </div>
  )
}
