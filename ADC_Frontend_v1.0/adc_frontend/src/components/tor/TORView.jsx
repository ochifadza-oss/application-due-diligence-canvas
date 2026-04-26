import React, { useState, useEffect, useCallback } from 'react'
import { Save, Download, Plus, X, Wand2, FileText } from 'lucide-react'
import { torApi, aiApi } from '../../api/client'
import { Spinner, FormRow, useToast, Modal } from '../shared/UI'

function DeliverableRow({ item, idx, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <input className="input flex-1" placeholder="Deliverable description"
        value={item.description} onChange={e => onChange(idx, 'description', e.target.value)} />
      <input type="date" className="input w-36 flex-shrink-0"
        value={item.due_date || ''} onChange={e => onChange(idx, 'due_date', e.target.value)} />
      <button className="btn btn-sm text-gray-400 hover:text-red-500 flex-shrink-0" onClick={() => onRemove(idx)}>
        <X size={14} />
      </button>
    </div>
  )
}

function StakeholderRow({ item, idx, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <input className="input flex-1" placeholder="Full name"
        value={item.full_name} onChange={e => onChange(idx, 'full_name', e.target.value)} />
      <input className="input flex-1" placeholder="Role"
        value={item.role || ''} onChange={e => onChange(idx, 'role', e.target.value)} />
      <input className="input flex-1" placeholder="Responsibility"
        value={item.responsibility || ''} onChange={e => onChange(idx, 'responsibility', e.target.value)} />
      <button className="btn btn-sm text-gray-400 hover:text-red-500 flex-shrink-0" onClick={() => onRemove(idx)}>
        <X size={14} />
      </button>
    </div>
  )
}

export default function TORView() {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')

  const [form, setForm] = useState({
    title: '', sponsor: '', project_manager: '',
    start_date: '', end_date: '', budget: '',
    background: '', purpose: '', objectives: '',
    scope: '', exclusions: '', methodology: '',
    governance: '', constraints: '',
    deliverables: [{ description: '', due_date: '' }],
    stakeholders: [{ full_name: '', role: '', responsibility: '' }],
  })

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  useEffect(() => {
    torApi.get()
      .then(({ data }) => {
        setForm({
          title: data.title || '',
          sponsor: data.sponsor || '',
          project_manager: data.project_manager || '',
          start_date: data.start_date || '',
          end_date: data.end_date || '',
          budget: data.budget || '',
          background: data.background || '',
          purpose: data.purpose || '',
          objectives: data.objectives || '',
          scope: data.scope || '',
          exclusions: data.exclusions || '',
          methodology: data.methodology || '',
          governance: data.governance || '',
          constraints: data.constraints || '',
          deliverables: data.deliverables?.length ? data.deliverables : [{ description: '', due_date: '' }],
          stakeholders: data.stakeholders?.length ? data.stakeholders : [{ full_name: '', role: '', responsibility: '' }],
        })
      })
      .catch(() => {}) // 404 is fine — TOR doesn't exist yet
      .finally(() => setLoading(false))
  }, [])

  const updateDeliverable = (idx, field, val) => {
    setForm(f => {
      const d = [...f.deliverables]
      d[idx] = { ...d[idx], [field]: val }
      return { ...f, deliverables: d }
    })
  }
  const removeDeliverable = (idx) => setForm(f => ({ ...f, deliverables: f.deliverables.filter((_, i) => i !== idx) }))
  const addDeliverable = () => setForm(f => ({ ...f, deliverables: [...f.deliverables, { description: '', due_date: '' }] }))

  const updateStakeholder = (idx, field, val) => {
    setForm(f => {
      const s = [...f.stakeholders]
      s[idx] = { ...s[idx], [field]: val }
      return { ...f, stakeholders: s }
    })
  }
  const removeStakeholder = (idx) => setForm(f => ({ ...f, stakeholders: f.stakeholders.filter((_, i) => i !== idx) }))
  const addStakeholder = () => setForm(f => ({ ...f, stakeholders: [...f.stakeholders, { full_name: '', role: '', responsibility: '' }] }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await torApi.upsert({
        ...form,
        budget: form.budget ? Number(form.budget) : null,
        deliverables: form.deliverables.filter(d => d.description),
        stakeholders: form.stakeholders.filter(s => s.full_name),
      })
      toast('Terms of Reference saved')
    } catch (e) { toast(e.response?.data?.detail || 'Save failed', 'error') }
    finally { setSaving(false) }
  }

  const handleExportPDF = () => {
    // Build print-ready HTML and open print dialog
    const html = buildTORHtml(form)
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const handleAIGenerate = async () => {
    setAiLoading(true)
    try {
      const { data } = await aiApi.analyse({
        analysis_type: 'full',
        custom_prompt: `Generate a formal Terms of Reference document for an Application Due Diligence review based on this data: ${JSON.stringify(form)}. Format as a professional government document.`,
      })
      setAiResult(data.analysis)
      setAiOpen(true)
    } catch { toast('AI generation failed — check API key configuration', 'error') }
    finally { setAiLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size={28} /></div>

  return (
    <div className="screen-shell">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[14px] font-semibold text-[#222]">Terms of Reference</h1>
          <p className="text-[11px] text-[#777] mt-0.5">Define the scope, governance, and deliverables for this review</p>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={handleAIGenerate} disabled={aiLoading}>
            {aiLoading ? <Spinner size={14} /> : <Wand2 size={14} />} Generate with AI
          </button>
          <button className="btn" onClick={handleExportPDF}>
            <Download size={14} /> Export PDF
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size={14} /> : <Save size={14} />} Save TOR
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT COLUMN */}
        <div className="space-y-5">
          <div className="card p-5">
            <div className="section-title">Project Identification</div>
            <FormRow label="Project Title">
              <input className="input" placeholder="Application Portfolio Due Diligence Review 2025/26" value={form.title} onChange={set('title')} />
            </FormRow>
            <FormRow label="Project Sponsor">
              <input className="input" placeholder="Name and designation" value={form.sponsor} onChange={set('sponsor')} />
            </FormRow>
            <FormRow label="Project Manager">
              <input className="input" placeholder="Name and designation" value={form.project_manager} onChange={set('project_manager')} />
            </FormRow>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Start Date">
                <input type="date" className="input" value={form.start_date} onChange={set('start_date')} />
              </FormRow>
              <FormRow label="End Date">
                <input type="date" className="input" value={form.end_date} onChange={set('end_date')} />
              </FormRow>
            </div>
            <FormRow label="Budget (R)">
              <input type="number" className="input" placeholder="0.00" value={form.budget} onChange={set('budget')} />
            </FormRow>
          </div>

          <div className="card p-5">
            <div className="section-title">Background & Context</div>
            <textarea className="input resize-none" rows={4}
              placeholder="Describe the organisational context and reason for the review..."
              value={form.background} onChange={set('background')} />
          </div>

          <div className="card p-5">
            <div className="section-title">Purpose & Objectives</div>
            <FormRow label="Purpose">
              <textarea className="input resize-none" rows={2}
                placeholder="State the purpose of the due diligence review..."
                value={form.purpose} onChange={set('purpose')} />
            </FormRow>
            <FormRow label="Objectives (one per line)">
              <textarea className="input resize-none" rows={4}
                placeholder="1. Assess current application landscape&#10;2. Identify redundancies&#10;3. Rate applications against criteria"
                value={form.objectives} onChange={set('objectives')} />
            </FormRow>
          </div>

          <div className="card p-5">
            <div className="section-title">Methodology</div>
            <textarea className="input resize-none" rows={3}
              placeholder="Describe the approach, tools, and rating framework..."
              value={form.methodology} onChange={set('methodology')} />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          <div className="card p-5">
            <div className="section-title">Scope of Work</div>
            <FormRow label="Inclusions">
              <textarea className="input resize-none" rows={3}
                placeholder="Define what is in scope for this review..."
                value={form.scope} onChange={set('scope')} />
            </FormRow>
            <FormRow label="Exclusions">
              <textarea className="input resize-none" rows={2}
                placeholder="List what is explicitly excluded..."
                value={form.exclusions} onChange={set('exclusions')} />
            </FormRow>
          </div>

          <div className="card p-5">
            <div className="section-title">Deliverables</div>
            {form.deliverables.map((d, i) => (
              <DeliverableRow key={i} item={d} idx={i} onChange={updateDeliverable} onRemove={removeDeliverable} />
            ))}
            <button className="btn btn-sm mt-1" onClick={addDeliverable}>
              <Plus size={13} /> Add Deliverable
            </button>
          </div>

          <div className="card p-5">
            <div className="section-title">Stakeholders & Roles</div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <span className="text-xs text-gray-400 font-medium">Name</span>
              <span className="text-xs text-gray-400 font-medium">Role</span>
              <span className="text-xs text-gray-400 font-medium">Responsibility</span>
            </div>
            {form.stakeholders.map((s, i) => (
              <StakeholderRow key={i} item={s} idx={i} onChange={updateStakeholder} onRemove={removeStakeholder} />
            ))}
            <button className="btn btn-sm mt-1" onClick={addStakeholder}>
              <Plus size={13} /> Add Stakeholder
            </button>
          </div>

          <div className="card p-5">
            <div className="section-title">Governance & Reporting</div>
            <textarea className="input resize-none" rows={3}
              placeholder="Describe reporting lines, review meetings, and escalation path..."
              value={form.governance} onChange={set('governance')} />
          </div>

          <div className="card p-5">
            <div className="section-title">Constraints & Assumptions</div>
            <textarea className="input resize-none" rows={3}
              placeholder="List known constraints and assumptions..."
              value={form.constraints} onChange={set('constraints')} />
          </div>
        </div>
      </div>

      {/* AI Result Modal */}
      <Modal open={aiOpen} onClose={() => setAiOpen(false)} title="AI-Generated TOR Draft" size="2xl">
        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
          {aiResult}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
          <button className="btn" onClick={() => {
            navigator.clipboard.writeText(aiResult)
            toast('Copied to clipboard')
          }}>Copy</button>
          <button className="btn btn-primary" onClick={() => setAiOpen(false)}>Close</button>
        </div>
      </Modal>
    </div>
  )
}

function buildTORHtml(form) {
  return `<!DOCTYPE html><html><head><style>
    body{font-family:Arial,sans-serif;font-size:12px;margin:40px;color:#222;line-height:1.6}
    h1{font-size:20px;color:#1F3864}h2{font-size:14px;border-bottom:1px solid #ccc;padding-bottom:4px;margin:20px 0 8px;color:#2E75B6}
    table{width:100%;border-collapse:collapse;margin-bottom:12px}
    th{background:#1F3864;color:#fff;padding:5px 8px;text-align:left;font-size:11px}
    td{padding:5px 8px;border-bottom:1px solid #eee;font-size:11px}
    p{margin-bottom:8px}
  </style></head><body>
    <h1>Terms of Reference</h1>
    <h2>1. Project Identification</h2>
    <table><tr><th>Field</th><th>Detail</th></tr>
    <tr><td>Project Title</td><td>${form.title||'–'}</td></tr>
    <tr><td>Project Sponsor</td><td>${form.sponsor||'–'}</td></tr>
    <tr><td>Project Manager</td><td>${form.project_manager||'–'}</td></tr>
    <tr><td>Start Date</td><td>${form.start_date||'–'}</td></tr>
    <tr><td>End Date</td><td>${form.end_date||'–'}</td></tr>
    <tr><td>Budget</td><td>${form.budget?'R '+Number(form.budget).toLocaleString():'–'}</td></tr></table>
    <h2>2. Background & Context</h2><p>${form.background||'–'}</p>
    <h2>3. Purpose & Objectives</h2><p>${form.purpose||'–'}</p>
    ${form.objectives?`<p>${form.objectives.replace(/\n/g,'<br>')}</p>`:''}
    <h2>4. Scope of Work</h2><p>${form.scope||'–'}</p>
    ${form.exclusions?`<p><strong>Exclusions:</strong> ${form.exclusions}</p>`:''}
    <h2>5. Methodology</h2><p>${form.methodology||'–'}</p>
    <h2>6. Deliverables</h2>
    <table><tr><th>Deliverable</th><th>Due Date</th></tr>
    ${form.deliverables.filter(d=>d.description).map(d=>`<tr><td>${d.description}</td><td>${d.due_date||'–'}</td></tr>`).join('')}
    </table>
    <h2>7. Stakeholders & Roles</h2>
    <table><tr><th>Name</th><th>Role</th><th>Responsibility</th></tr>
    ${form.stakeholders.filter(s=>s.full_name).map(s=>`<tr><td>${s.full_name}</td><td>${s.role||'–'}</td><td>${s.responsibility||'–'}</td></tr>`).join('')}
    </table>
    <h2>8. Governance & Reporting</h2><p>${form.governance||'–'}</p>
    <h2>9. Constraints & Assumptions</h2><p>${form.constraints||'–'}</p>
    <br><br><table><tr><th>Approved by</th><th>Role</th><th>Signature</th><th>Date</th></tr>
    <tr><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><td></td><td></td><td></td></tr>
    <tr><td>&nbsp;</td><td></td><td></td><td></td></tr></table>
  </body></html>`
}
