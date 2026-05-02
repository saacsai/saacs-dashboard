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
  mise_en_place_status: Record<string, string>
  mise_en_place_concluido: boolean
  ideia_inicial: string | null
  tipo: string | null
}
