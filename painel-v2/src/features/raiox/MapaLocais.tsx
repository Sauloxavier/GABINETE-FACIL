import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet'
import { Loader2, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import 'leaflet/dist/leaflet.css'

interface LocalGeo {
  nome: string
  endereco: string | null
  lat: number | null
  lng: number | null
  total_votos: number
  total_secoes: number
}

interface Props {
  ano: number
  cargo: string
}

// Centro aproximado de Limeira-SP
const CENTRO_LIMEIRA: [number, number] = [-22.5647, -47.4017]

export function MapaLocais({ ano, cargo }: Props) {
  const [locais, setLocais] = useState<LocalGeo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setCarregando(true)
    setErro(null)
    ;(supabase as any).rpc('raiox_locais_com_geo', { p_ano: ano, p_cargo: cargo })
      .then(({ data, error }: { data: LocalGeo[] | null; error: { message?: string } | null }) => {
        if (error) {
          if ((error.message ?? '').includes('raiox_locais_com_geo')) {
            setErro('Função SQL não criada. Rode painel/supabase/13-locais-geo.sql')
          } else {
            setErro(error.message ?? 'erro')
          }
        } else {
          setLocais((data ?? []).map(r => ({ ...r, total_votos: Number(r.total_votos), total_secoes: Number(r.total_secoes) })))
        }
        setCarregando(false)
      })
  }, [ano, cargo])

  const { comGeo, semGeo, maxVotos } = useMemo(() => {
    const cg = locais.filter(l => l.lat != null && l.lng != null)
    return {
      comGeo: cg,
      semGeo: locais.filter(l => l.lat == null).length,
      maxVotos: Math.max(...cg.map(l => l.total_votos), 1),
    }
  }, [locais])

  if (carregando) {
    return (
      <div className="bg-white rounded-2xl ring-soft p-12 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto" />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-800">⚠️ {erro}</div>
    )
  }

  if (comGeo.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm text-amber-900">
        <MapPin className="w-6 h-6 mb-2" />
        <strong>Nenhum local geocodificado ainda.</strong>
        <p className="mt-2">Pra ativar o mapa, na VM rode:</p>
        <pre className="bg-slate-900 text-emerald-300 text-xs p-3 rounded-lg mt-2 overflow-x-auto">
{`cd scripts/geocodificar-locais
cp .env.example .env
npm install
node index.js`}
        </pre>
        <p className="mt-2 text-xs">
          Demora ~8 min na 1ª vez (Nominatim limita 1 req/s). Depois fica em cache.
        </p>
      </div>
    )
  }

  function raio(votos: number) {
    // raio em pixels — escala log pra não ficar discrepante
    const escala = Math.sqrt(votos / maxVotos)
    return 6 + escala * 20
  }

  function cor(votos: number) {
    const pct = votos / maxVotos
    if (pct > 0.66) return '#1E5BBA'  // azul forte (Marco)
    if (pct > 0.33) return '#3b82f6'  // azul médio
    if (pct > 0.10) return '#60a5fa'  // azul claro
    return '#93c5fd'                  // muito claro
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl ring-soft p-3 flex items-center gap-3 text-sm flex-wrap">
        <MapPin className="w-4 h-4 text-marco-azul" />
        <span><strong>{comGeo.length}</strong> locais no mapa</span>
        {semGeo > 0 && (
          <span className="text-amber-700 text-xs">⚠️ {semGeo} sem coordenadas (rode o geocodificador)</span>
        )}
        <div className="flex items-center gap-2 ml-auto text-xs text-slate-500">
          <span>Tamanho do ponto = votos:</span>
          <div className="w-2 h-2 rounded-full bg-blue-300" />
          <span>poucos</span>
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>médio</span>
          <div className="w-5 h-5 rounded-full bg-marco-azul" />
          <span>muitos</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl ring-soft overflow-hidden" style={{ height: '70vh', minHeight: 500 }}>
        <MapContainer
          center={CENTRO_LIMEIRA}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {comGeo.map(l => (
            <CircleMarker
              key={l.nome}
              center={[l.lat!, l.lng!]}
              radius={raio(l.total_votos)}
              pathOptions={{
                color: cor(l.total_votos),
                fillColor: cor(l.total_votos),
                fillOpacity: 0.6,
                weight: 1.5,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <div>
                  <div className="font-bold text-xs">{l.nome}</div>
                  <div className="text-xs">
                    {l.total_votos.toLocaleString('pt-BR')} votos · {l.total_secoes} seções
                  </div>
                </div>
              </Tooltip>
              <Popup>
                <div className="text-sm">
                  <div className="font-bold text-marco-azul">{l.nome}</div>
                  {l.endereco && <div className="text-xs text-slate-600 mt-1">{l.endereco}</div>}
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="bg-marco-azul/10 text-marco-azul font-bold px-2 py-0.5 rounded">
                      {l.total_votos.toLocaleString('pt-BR')} votos
                    </span>
                    <span className="text-slate-500">{l.total_secoes} seções</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
