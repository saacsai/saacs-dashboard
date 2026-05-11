import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    _client = createClient(url, key)
  }
  return _client
}

// Alias para compatibilidade com imports existentes
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return getSupabase()[prop as keyof SupabaseClient]
  },
})

export interface MiseEnPlaceItem {
  id: string
  projeto_id: string
  fase: string
  ingrediente: string
  status: 'pendente' | 'uploading' | 'processando' | 'pronto' | 'erro'
  arquivo_original: string | null
  conteudo_md: string | null
  tamanho_bytes: number | null
  criado_em: string
  atualizado_em: string
}

export interface Projeto {
  id: string
  client_id: string
  organizacao_id: string | null
  mise_en_place_status: Record<string, string>
  mise_en_place_concluido: boolean
  ideia_inicial: string | null
  tipo: string | null
}

export interface Organizacao {
  id: string
  client_id: string
  nome_fantasia: string | null
  razao_social: string | null
  cnpj: string | null
  logo_url: string | null
  papel_timbrado_url: string | null
  estatuto_url: string | null
  ata_dirigentes_url: string | null
  cartao_cnpj_url: string | null
  cnds_url: string | null
  curriculo_entidade_url: string | null
  created_at: string
  updated_at: string
}

export interface OrganizacaoDoc {
  id: string
  organizacao_id: string
  ingrediente: string
  status: 'pronto' | 'processando' | 'erro'
  arquivo_original: string | null
  conteudo_md: string | null
  tamanho_bytes: number | null
  criado_em: string
  atualizado_em: string
}
