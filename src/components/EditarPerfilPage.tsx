'use client'

import { useState, useEffect } from 'react'

interface Props {
  token: string
  onVoltar: () => void
  onSaved: (nome: string) => void
}

const ATIVIDADES = [
  'Empreendedor(a)/Empresário(a)',
  'Gestor(a) de projetos',
  'Consultor(a)/Assessor(a)',
  'Técnico(a) de ATER',
  'Produtor(a) Rural',
  'Associação/Cooperativa',
  'Outros',
]

export default function EditarPerfilPage({ token, onVoltar, onSaved }: Props) {
  const [form, setForm] = useState({
    nome: '', sobrenome: '', cpf: '', email: '',
    whatsapp: '', cnpj: '', atividade: '',
    endereco_linha1: '', endereco_linha2: '', cidade: '', uf: '', cep: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)

  useEffect(() => {
    fetch('/api/perfil', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErro(d.error); return }
        setForm({
          nome: d.nome || '',
          sobrenome: d.sobrenome || '',
          cpf: d.cpf || '',
          email: d.email || '',
          whatsapp: d.whatsapp || '',
          cnpj: d.cnpj || '',
          atividade: d.atividade || '',
          endereco_linha1: d.endereco_linha1 || '',
          endereco_linha2: d.endereco_linha2 || '',
          cidade: d.cidade || '',
          uf: d.uf || '',
          cep: d.cep || '',
        })
      })
      .catch(() => setErro('Erro ao carregar perfil.'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleCepBlur(cep: string) {
    const limpo = cep.replace(/\D/g, '')
    if (limpo.length !== 8) return
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
      const d = await res.json()
      if (d.erro) return
      setForm(f => ({
        ...f,
        endereco_linha1: d.logradouro || f.endereco_linha1,
        cidade: d.localidade || f.cidade,
        uf: d.uf || f.uf,
      }))
    } catch { /* silencioso */ } finally {
      setBuscandoCep(false)
    }
  }

  async function handleSalvar() {
    setSaving(true)
    setErro('')
    setSucesso(false)
    try {
      const res = await fetch('/api/perfil', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          sobrenome: form.sobrenome,
          whatsapp: form.whatsapp,
          cnpj: form.cnpj,
          atividade: form.atividade,
          endereco_linha1: form.endereco_linha1,
          endereco_linha2: form.endereco_linha2,
          cidade: form.cidade,
          uf: form.uf,
          cep: form.cep,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setErro(d.error || `Erro ${res.status}`); return }
      setSucesso(true)
      onSaved([form.nome, form.sobrenome].filter(Boolean).join(' '))
    } catch (e) {
      setErro(String(e))
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: keyof typeof form, opts?: { readOnly?: boolean; type?: string }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={opts?.type || 'text'}
        value={form[key]}
        readOnly={opts?.readOnly}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors ${
          opts?.readOnly
            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
            : 'border-gray-300 focus:border-[#1E3A6E] focus:ring-1 focus:ring-[#1E3A6E]/20'
        }`}
      />
    </div>
  )

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onVoltar}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <h1 className="text-xl font-bold text-gray-900">Editar perfil</h1>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field('Nome *', 'nome')}
            {field('Sobrenome *', 'sobrenome')}
          </div>
          {field('CPF', 'cpf', { readOnly: true })}
          {field('E-mail', 'email', { readOnly: true })}
          {field('WhatsApp', 'whatsapp')}
          {field('CNPJ', 'cnpj')}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Atividade</label>
            <select
              value={form.atividade}
              onChange={e => setForm(f => ({ ...f, atividade: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1E3A6E] focus:ring-1 focus:ring-[#1E3A6E]/20"
            >
              <option value="">Selecione...</option>
              {ATIVIDADES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Endereço</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  CEP {buscandoCep && <span className="text-gray-400 font-normal">buscando...</span>}
                </label>
                <input
                  type="text"
                  value={form.cep}
                  onChange={e => setForm(f => ({ ...f, cep: e.target.value }))}
                  onBlur={e => handleCepBlur(e.target.value)}
                  placeholder="Digite o seu CEP"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1E3A6E] focus:ring-1 focus:ring-[#1E3A6E]/20"
                />
              </div>
              {field('Endereço (logradouro e número)', 'endereco_linha1')}
              {field('Endereço (complemento)', 'endereco_linha2')}
              <div className="grid grid-cols-2 gap-4">
                {field('Cidade', 'cidade')}
                {field('UF', 'uf')}
              </div>
            </div>
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{erro}</p>
          )}
          {sucesso && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
              ✓ Perfil atualizado com sucesso.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onVoltar}
              className="flex-1 text-sm text-gray-600 border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={saving}
              className="flex-1 text-sm font-medium bg-[#1E3A6E] text-white rounded-xl py-2.5 hover:bg-[#162d56] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
