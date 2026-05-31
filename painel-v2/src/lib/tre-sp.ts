// Cliente das APIs públicas do TRE-SP
// (https://apps.tre-sp.jus.br/api-gateway/)
// As APIs são gratuitas, sem token, retornam XML.
// Limeira-SP: zona eleitoral 066.

export const ZONA_LIMEIRA = '066'

export interface LocalVotacao {
  local: string
  municipio: string
  zona: string
  nome: string
  ativo: boolean
}

export interface ResumoEleitorado {
  ano: number
  mes: number
  aptos: number
  locaisVotacao: number
  secoes: number
  zonas: number
  regiao: '1' | '2' | string
}

function getText(el: Element | null, tag: string): string {
  const t = el?.getElementsByTagName(tag)[0]
  return t?.textContent?.trim() ?? ''
}

function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'text/xml')
}

// ============ Lista locais de votação por zona ============
export async function listarLocaisVotacao(opts: {
  zona?: string
  ano?: number
  mes?: number
} = {}): Promise<LocalVotacao[]> {
  const zona = (opts.zona ?? ZONA_LIMEIRA).padStart(3, '0')
  const ano = String(opts.ano ?? new Date().getFullYear())
  const mes = String(opts.mes ?? 10).padStart(2, '0')

  const url = `https://apps.tre-sp.jus.br/api-gateway/zonaEleitoral/1.0/${zona}/localVotacao/${ano}/${mes}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TRE-SP ${res.status}`)
  const xml = await res.text()
  const doc = parseXml(xml)

  const itens: LocalVotacao[] = []
  const list = doc.getElementsByTagName('item')
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    const codigo = item.getElementsByTagName('codigo')[0]
    itens.push({
      local:     getText(codigo, 'local'),
      municipio: getText(codigo, 'municipio'),
      zona:      getText(codigo, 'zona'),
      nome:      getText(item, 'nome'),
      ativo:     getText(item, 'indicador') === '1',
    })
  }
  return itens
}

// ============ Resumo do eleitorado (ano vigente) ============
export async function eleitoradoAtual(): Promise<ResumoEleitorado[]> {
  const url = 'https://apps.tre-sp.jus.br/api-gateway/eleitorado/1.0/consultar'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TRE-SP ${res.status}`)
  const xml = await res.text()
  const doc = parseXml(xml)

  const itens: ResumoEleitorado[] = []
  const list = doc.getElementsByTagName('item')
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    itens.push({
      ano:           Number(getText(item, 'ano')),
      mes:           Number(getText(item, 'mes')),
      aptos:         Number(getText(item, 'aptos')),
      locaisVotacao: Number(getText(item, 'locaisVotacao')),
      secoes:        Number(getText(item, 'secoes')),
      zonas:         Number(getText(item, 'zonas')),
      regiao:        getText(item, 'regiao'),
    })
  }
  return itens
}

// ============ Histórico de eleitorado (1994+) ============
export async function eleitoradoHistorico(): Promise<Array<ResumoEleitorado & { descricao?: string }>> {
  const url = 'https://apps.tre-sp.jus.br/api-gateway/eleitorado/historico/1.0/resumo'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TRE-SP ${res.status}`)
  const xml = await res.text()
  const doc = parseXml(xml)

  const itens: Array<ResumoEleitorado & { descricao?: string }> = []
  const list = doc.getElementsByTagName('item')
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    itens.push({
      ano:           Number(getText(item, 'ano')),
      mes:           Number(getText(item, 'mes')),
      descricao:     getText(item, 'descricao'),
      aptos:         Number(getText(item, 'aptos')),
      locaisVotacao: Number(getText(item, 'locaisVotacao')),
      secoes:        Number(getText(item, 'secoes')),
      zonas:         Number(getText(item, 'zonas')),
      regiao:        getText(item, 'regiao'),
    })
  }
  return itens
}
