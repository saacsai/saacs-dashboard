const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL || 'https://mcp.saacs.com.br'

// Token gerado diretamente na página tilapia/page.tsx via OAuth client_credentials
// Esta função é placeholder — ver implementação em TilapiaPage
export async function getMcpToken(_projectId: string, _cpf: string): Promise<string | null> {
  return null
}

// Envia arquivo para o MCP (fallback para imagens)
export async function uploadToMcp(
  projectId: string,
  token: string,
  file: File,
  fase: string,
  ingrediente: string
): Promise<{ status: string; preview?: string }> {
  const form = new FormData()
  form.append('arquivo', file)
  form.append('fase', fase)
  form.append('ingrediente', ingrediente)

  const res = await fetch(`${MCP_URL}/api/projetos/${projectId}/mise-en-place/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  return res.json()
}

// Envia conteúdo já convertido client-side
export async function uploadTextToMcp(
  projectId: string,
  token: string,
  conteudoMd: string,
  fase: string,
  ingrediente: string,
  fileName: string,
  fileSizeBytes: number
): Promise<{ status: string; preview?: string }> {
  const res = await fetch(`${MCP_URL}/api/projetos/${projectId}/mise-en-place/upload-text`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conteudo_md: conteudoMd,
      fase,
      ingrediente,
      arquivo_original: fileName,
      tamanho_bytes: fileSizeBytes,
    }),
  })
  return res.json()
}

// Status do mise en place
export async function getMiseEnPlaceStatus(projectId: string, token: string) {
  const res = await fetch(`${MCP_URL}/api/projetos/${projectId}/mise-en-place/status`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}
