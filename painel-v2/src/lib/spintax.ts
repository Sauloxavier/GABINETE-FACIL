// Spintax + microvariações pra reduzir chance de bloqueio em disparo em massa.
//
// Spintax: {Olá|Oi|E aí} {{nome}}! → sorteia 1 das alternativas por envio.
// Microvariações: troca pontuação, espaços invisíveis, emoji equivalente, ordem
// de quebras de linha — coisas que mudam o hash da mensagem sem alterar o sentido.

const PONTOS_VAR = ['.', '..', '. ', '!']
const EMOJIS_OPC = ['🙏', '🙌', '💙', '✨', '👋']
const ZERO_WIDTH = ['', '', '', '​'] // 1 em 4 mensagens ganha um espaço invisível

function escolherAleatorio<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Processa spintax {a|b|c}, escolhe uma opção aleatória.
 * Aceita aninhamento: {Olá {amigo|vizinho}|E aí, {tudo bem|beleza}}.
 */
export function expandirSpintax(texto: string): string {
  let resultado = texto
  // Loop pra resolver aninhados — máx 10 passadas pra evitar loop infinito
  for (let i = 0; i < 10; i++) {
    const match = resultado.match(/\{([^{}]+)\}/)
    if (!match) break
    const opcoes = match[1].split('|')
    const escolhido = escolherAleatorio(opcoes)
    resultado = resultado.slice(0, match.index!) + escolhido + resultado.slice(match.index! + match[0].length)
  }
  return resultado
}

/**
 * Adiciona microvariações: ~30% chance de ponto extra, espaço invisível,
 * ou emoji random no fim. Não muda o sentido, só o hash.
 */
export function microVariacoes(texto: string): string {
  let t = texto

  // 30% chance: troca o último ponto por variação
  if (Math.random() < 0.3 && /[.!]$/.test(t)) {
    t = t.slice(0, -1) + escolherAleatorio(PONTOS_VAR)
  }

  // 25% chance: adiciona emoji random no fim
  if (Math.random() < 0.25) {
    t = t + ' ' + escolherAleatorio(EMOJIS_OPC)
  }

  // 25% chance: zero-width space invisível antes do nome (se houver {{nome}} substituído)
  if (Math.random() < 0.25) {
    t = escolherAleatorio(ZERO_WIDTH) + t
  }

  // 15% chance: troca "—" por "-" ou vice-versa
  if (Math.random() < 0.15) {
    t = Math.random() < 0.5 ? t.replace(/—/g, '-') : t.replace(/(?<!\w)-(?!\w)/g, '—')
  }

  return t
}

/**
 * Aplica template variáveis + spintax + microvariações em ordem.
 */
export function variarMensagem(
  template: string,
  variaveis: Record<string, string>,
  aplicarVariacoes = true,
): string {
  // 1. Substitui variáveis {{nome}}, {{bairro}} etc.
  let msg = template
  for (const [k, v] of Object.entries(variaveis)) {
    msg = msg.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v)
  }
  // 2. Expande spintax
  msg = expandirSpintax(msg)
  // 3. Adiciona microvariações
  if (aplicarVariacoes) msg = microVariacoes(msg)
  return msg
}

export function temSpintax(texto: string): boolean {
  return /\{[^{}]*\|/.test(texto)
}
