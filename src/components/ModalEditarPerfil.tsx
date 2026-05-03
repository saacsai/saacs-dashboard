'use client'

import { useEffect, useState } from 'react'

interface Props {
  token: string
  onClose: () => void
  onSaved: (nomeCompleto: string) => void
}

const ATIVIDADES = [
  'Técnico ATER', 'Gestor público', 'Consultor', 'Pesquisador',
  'Coordenador de projetos', 'Educador', 'Empreendedor social', 'Outro',
]

interface FormData {
  nome: string
  sobrenome: string
  cpf: string
  email: string
  whatsapp: string
  cnpj: string
  atividade: string
}

export default function ModalEditarPerfil({ token, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormData>({
    nome: '', sobrenome: '', cpf: '', email: '', whatsapp: '', cnpj: '', atividade: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/perfil', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setForm(f => ({ ...f, ...data })); setLoading(false) })
      .catch(() => { setError('Erro ao carregar perfil.'); setLoading(false) })
  }, [token])

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome || !form.email) { setError('Nome e email são obrigatórios.'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/perfil', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setToast('Perfil atualizado com sucesso!')
      onSaved(`${form.nome} ${form.sobrenome}`.trim())
      setTimeout(() => { setToast(''); onClose() }, 1500)
    } else {
      const j = await res.json()
      setError(j.error || 'Erro ao salvar.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Editar perfil</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Carregando…</div>
          ) : (
            <form id="perfil-form" onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome *" value={form.nome} onChange={set('nome')} required />
                <Field label="Sobrenome *" value={form.sobrenome} onChange={set('sobrenome')} required />
              </div>
              <Field label="CPF" value={form.cpf} onChange={() => {}} readOnly />
              <Field label="Email *" type="email" value={form.email} onChange={set('email')} required />
              <Field label="WhatsApp" value={form.whatsapp} onChange={set('whatsapp')} placeholder="(11) 99999-9999" />
              <Field label="CNPJ" value={form.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Atividade principal</label>
                <select
                  value={form.atividade}
                  onChange={set('atividade')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione…</option>
                  {ATIVIDADES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}
              {toast && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">✅ {toast}</p>}
            </form>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
          <button
            form="perfil-form" type="submit"
            disabled={saving || loading}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', readOnly = false, required = false, placeholder = '' }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string; readOnly?: boolean; required?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type} value={value} onChange={onChange}
        readOnly={readOnly} required={required} placeholder={placeholder}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
          ${readOnly ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
      />
    </div>
  )
}
