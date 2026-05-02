'use client'

// Converte PDF → texto usando pdf.js
export async function convertPdfToText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const pdf = await getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items.map((item) => ('str' in item ? item.str : '') || '').join(' ')
    pages.push(text)
  }
  return pages.join('\n\n')
}

// Converte DOCX → texto/markdown usando mammoth
export async function convertDocxToText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

// Converte XLSX → texto tabular usando xlsx
export async function convertXlsxToText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const lines: string[] = []
  for (const sheetName of workbook.SheetNames) {
    lines.push(`## ${sheetName}`)
    const sheet = workbook.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(sheet)
    lines.push(csv)
  }
  return lines.join('\n\n')
}

export type SupportedExt = 'pdf' | 'docx' | 'doc' | 'xlsx' | 'jpg' | 'jpeg' | 'png'

export function getFileExt(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export function isClientSideConvertible(ext: string): boolean {
  return ['pdf', 'docx', 'doc', 'xlsx'].includes(ext)
}

// Rota pelo tipo — retorna null para formatos que precisam do servidor
export async function convertFileClientSide(file: File): Promise<string | null> {
  const ext = getFileExt(file.name)
  if (ext === 'pdf') return await convertPdfToText(file)
  if (ext === 'docx' || ext === 'doc') return await convertDocxToText(file)
  if (ext === 'xlsx') return await convertXlsxToText(file)
  return null  // imagens: fallback para servidor
}
