// Tipos do schema Supabase (espelha o schema atual do iamob-supabase)
// Quando criar/alterar tabelas, atualize aqui ou rode `supabase gen types typescript`.

export type Envolvimento = 'Não trabalhado' | 'Em prospecção' | 'Conquistado' | 'Incerto' | 'Perdido'
export type StatusDemanda = string // dinâmico (statusKanban customizável)

export interface Eleitor {
  id: string
  codigo: string | null   // MX-001, MX-002 etc (auto-gerado por trigger)
  nome: string
  telefone: string | null
  telefone_res: string | null
  cpf: string | null
  sexo: string | null
  nascimento: string | null
  bairro: string | null
  endereco: string | null
  cidade: string | null
  uf: string | null
  email: string | null
  rede_social: string | null
  titulo_eleitor: string | null
  local_votacao: string | null
  envolvimento: Envolvimento | null
  marcadores: string[]
  nichos: string[]
  obs: string | null
  ultimo_contato: string | null
  criado_em: string
  atualizado_em: string
}

export interface EleitorInsert {
  id?: string
  nome: string
  telefone?: string | null
  telefone_res?: string | null
  cpf?: string | null
  sexo?: string | null
  nascimento?: string | null
  bairro?: string | null
  endereco?: string | null
  cidade?: string | null
  uf?: string | null
  email?: string | null
  rede_social?: string | null
  titulo_eleitor?: string | null
  local_votacao?: string | null
  envolvimento?: Envolvimento | null
  marcadores?: string[]
  nichos?: string[]
  obs?: string | null
  ultimo_contato?: string | null
}

export interface Demanda {
  id: string
  eleitor_id: string
  tipo: string
  status: StatusDemanda
  orgao_responsavel: string | null
  origem: string | null
  classificacao: string | null
  setor: string | null
  descricao: string
  data: string
  prazo: string | null
  notas: string | null
  chat_id: string | null
  ultima_visualizacao: string | null
  criado_em: string
  atualizado_em: string
}

export interface DemandaInsert {
  id?: string
  eleitor_id: string
  tipo: string
  status?: StatusDemanda
  orgao_responsavel?: string | null
  origem?: string | null
  classificacao?: string | null
  setor?: string | null
  descricao: string
  data?: string
  prazo?: string | null
  notas?: string | null
  chat_id?: string | null
}

// Compat v1: perfis.id é o próprio auth.users.id
export interface Perfil {
  id: string
  nome: string | null
  email: string | null
  papel: 'admin' | 'assessor'
  avatar_url: string | null
  criado_em: string
}

export interface ConfigRow {
  chave: string
  valor: unknown
  atualizado_em: string
}

export interface Database {
  public: {
    Tables: {
      eleitores: {
        Row: Eleitor
        Insert: EleitorInsert
        Update: Partial<EleitorInsert>
      }
      demandas: {
        Row: Demanda
        Insert: DemandaInsert
        Update: Partial<DemandaInsert>
      }
      perfis: {
        Row: Perfil
        Insert: Omit<Perfil, 'criado_em'>
        Update: Partial<Perfil>
      }
      config: {
        Row: ConfigRow
        Insert: { chave: string; valor: unknown }
        Update: { valor?: unknown }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
