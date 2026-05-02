import { NextRequest, NextResponse } from 'next/server'

const MCP = (process.env.NEXT_PUBLIC_MCP_URL || 'https://mcp.saacs.com.br').trim()

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params
  const token = req.headers.get('authorization') || ''
  const contentType = req.headers.get('content-type') || ''

  const isMultipart = contentType.includes('multipart/form-data')
  const url = isMultipart
    ? `${MCP}/api/projetos/${projectId}/mise-en-place/upload`
    : `${MCP}/api/projetos/${projectId}/mise-en-place/upload-text`

  const body = await req.arrayBuffer()

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: token,
      'content-type': contentType,
    },
    body,
  })

  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}
