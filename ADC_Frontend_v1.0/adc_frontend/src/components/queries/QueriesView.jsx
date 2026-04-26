import React, { useState, useEffect, useCallback } from 'react'
import { Plus, MessageSquare, ChevronRight, Trash2, CheckCircle } from 'lucide-react'
import { queryApi } from '../../api/client'
import { useAppCtx } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { Modal, StatCard, EmptyState, Spinner, FormRow, useToast, ConfirmDialog } from '../shared/UI'

const STATUS_STYLES = {
  'Open':        'badge-blue',
  'In Progress': 'badge-amber',
  'Resolved':    'badge-green',
  'Escalated':   'badge-red',
}
const PRIORITY_STYLES = { High: 'badge-red', Medium: 'badge-amber', Low: 'badge-green' }
const WORKFLOW_STEPS = ['Submitted', 'Acknowledged', 'Under Review', 'Response Issued', 'Closed']

function WorkflowTracker({ currentStep }) {
  const idx = WORKFLOW_STEPS.indexOf(currentStep)
  return (
    <div className="flex items-center mt-3">
      {WORKFLOW_STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center flex-shrink-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${
              i < idx  ? 'bg-green-500 border-green-500 text-white'
            : i === idx ? 'bg-blue-100 border-blue-400 text-blue-700'
            : 'bg-white border-gray-200 text-gray-400'
            }`}>
              {i < idx ? <CheckCircle size={12} /> : i + 1}
            </div>
            <span className="text-[9px] text-gray-400 mt-1 text-center w-14 leading-tight hidden sm:block">{step}</span>
          </div>
          {i < WORKFLOW_STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 ${i < idx ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function QueryCard({ query, onManage, onDelete }) {
  return (
    <div className="card p-4 hover:border-gray-200 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={STATUS_STYLES[query.status] || 'badge-gray'}>{query.status}</span>
            <span className={PRIORITY_STYLES[query.priority] || 'badge-gray'}>{query.priority}</span>
            {query.category && <span className="badge-blue">{query.category}</span>}
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{query.title}</h3>
          {query.description && <p className="text-xs text-gray-500 line-clamp-2">{query.description}</p>}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
            {query.app_name && <span>📋 {query.app_name}</span>}
            {query.assignee && <span>→ {query.assignee}</span>}
            {query.due_date && <span>Due: {query.due_date}</span>}
            {query.responses?.length > 0 && <span>💬 {query.responses.length}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button className="btn btn-sm" onClick={() => onManage(query)}>Manage</button>
          <button className="btn btn-sm text-gray-400 hover:text-red-500" onClick={() => onDelete(query)}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <WorkflowTracker currentStep={query.workflow_step} />
    </div>
  )
}

function ManageQueryModal({ query, open, onClose, onUpdated }) {
  const toast = useToast()
  const { canEdit } = useAuth()
  const [status, setStatus]   = useState('')
  const [wfStep, setWfStep]   = useState('')
  const [respText, setRespText] = useState('')
  const [respAuthor, setRespAuthor] = useState('')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (query) { setStatus(query.status); setWfStep(query.workflow_step) }
  }, [query])

  const handleUpdate = async () => {
    setSaving(true)
    try {
      await queryApi.update(query.id, { status, workflow_step: wfStep })
      toast('Query updated')
      onUpdated()
      onClose()
    } catch { toast('Update failed', 'error') }
    finally { setSaving(false) }
  }

  const handleAddResponse = async () => {
    if (!respText.trim()) return toast('Response text is required', 'error')
    if (!respAuthor.trim()) return toast('Please enter your name', 'error')
    setSaving(true)
    try {
      await queryApi.addResponse(query.id, { response_text: respText, author: respAuthor })
      toast('Response added')
      setRespText(''); setRespAuthor('')
      onUpdated()
    } catch { toast('Failed to add response', 'error') }
    finally { setSaving(false) }
  }

  if (!query) return null
  return (
    <Modal open={open} onClose={onClose} title={query.title} size="lg">
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={STATUS_STYLES[query.status] || 'badge-gray'}>{query.status}</span>
        <span className={PRIORITY_STYLES[query.priority] || 'badge-gray'}>{query.priority}</span>
        {query.category && <span className="badge-blue">{query.category}</span>}
      </div>
      {query.description && <p className="text-sm text-gray-600 mb-4 bg-gray-50 rounded-lg p-3">{query.description}</p>}

      {canEdit && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <FormRow label="Update Status">
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              {['Open', 'In Progress', 'Resolved', 'Escalated'].map(s =>
                <option key={s} value={s}>{s}</option>)}
            </select>
          </FormRow>
          <FormRow label="Workflow Step">
            <select className="input" value={wfStep} onChange={e => setWfStep(e.target.value)}>
              {WORKFLOW_STEPS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormRow>
        </div>
      )}

      {canEdit && (
        <button className="btn btn-primary btn-sm w-full mb-5" onClick={handleUpdate} disabled={saving}>
          {saving ? <Spinner size={13} /> : null} Update Query
        </button>
      )}

      {/* Response thread */}
      <div className="section-title">Response Thread</div>
      {(query.responses || []).length === 0
        ? <p className="text-xs text-gray-400 mb-4 italic">No responses yet.</p>
        : (
          <div className="space-y-2 mb-4">
            {query.responses.map(r => (
              <div key={r.id} className="bg-gray-50 rounded-xl p-3 text-sm">
                <div className="text-xs text-gray-400 mb-1">
                  <span className="font-medium text-gray-600">{r.author}</span> —{' '}
                  {new Date(r.created_at).toLocaleString()}
                </div>
                <p className="text-gray-700">{r.response_text}</p>
              </div>
            ))}
          </div>
        )
      }

      {canEdit && (
        <div className="border-t border-gray-100 pt-4">
          <FormRow label="Add Response">
            <textarea className="input resize-none mb-2" rows={3}
              placeholder="Type your response or action taken..."
              value={respText} onChange={e => setRespText(e.target.value)} />
            <input className="input" placeholder="Your name"
              value={respAuthor} onChange={e => setRespAuthor(e.target.value)} />
          </FormRow>
          <button className="btn btn-primary btn-sm w-full mt-2" onClick={handleAddResponse} disabled={saving}>
            {saving ? <Spinner size={13} /> : <Plus size={13} />} Add Response
          </button>
        </div>
      )}
    </Modal>
  )
}

function NewQueryModal({ open, onClose, onCreated }) {
  const { applications } = useAppCtx()
  const toast = useToast()
  const [form, setForm] = useState({ title: '', description: '', app_id: '', priority: 'Medium', category: 'Other', assignee: '', due_date: '' })
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!form.title.trim()) return toast('Title is required', 'error')
    setSaving(true)
    try {
      await queryApi.create({ ...form, app_id: form.app_id ? Number(form.app_id) : null })
      toast('Query created')
      onCreated()
      onClose()
    } catch (e) { toast(e.response?.data?.detail || 'Failed to create query', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Query" size="lg">
      <FormRow label="Title" required>
        <input className="input" placeholder="Short description of the query" autoFocus
          value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      </FormRow>
      <FormRow label="Description">
        <textarea className="input resize-none" rows={3} placeholder="Detailed description..."
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </FormRow>
      <FormRow label="Related Application">
        <select className="input" value={form.app_id} onChange={e => setForm(f => ({ ...f, app_id: e.target.value }))}>
          <option value="">— None —</option>
          {applications.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </FormRow>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Priority">
          <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
          </select>
        </FormRow>
        <FormRow label="Category">
          <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {['Pricing', 'Technical', 'Compliance', 'Functional', 'Contract', 'Other'].map(c => <option key={c}>{c}</option>)}
          </select>
        </FormRow>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Assigned To">
          <input className="input" placeholder="Name or team"
            value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} />
        </FormRow>
        <FormRow label="Due Date">
          <input type="date" className="input"
            value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </FormRow>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
          {saving ? <Spinner size={14} /> : <Plus size={14} />} Submit Query
        </button>
      </div>
    </Modal>
  )
}

export default function QueriesView() {
  const [queries, setQueries] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [manageQuery, setManageQuery] = useState(null)
  const [newOpen, setNewOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const toast = useToast()
  const { canEdit } = useAuth()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [qRes, sRes] = await Promise.all([
        queryApi.list({ ...(filterStatus && { status: filterStatus }), ...(filterPriority && { priority: filterPriority }) }),
        queryApi.stats(),
      ])
      setQueries(qRes.data)
      setStats(sRes.data)
    } catch { toast('Failed to load queries', 'error') }
    finally { setLoading(false) }
  }, [filterStatus, filterPriority])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    try {
      await queryApi.delete(deleteTarget.id)
      toast('Query deleted')
      setDeleteTarget(null)
      load()
    } catch { toast('Failed to delete', 'error') }
  }

  return (
    <div className="screen-shell">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[14px] font-semibold text-[#222]">Query & Issue Management</h1>
          <p className="text-[11px] text-[#777] mt-0.5">Track issues through the 5-step workflow</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
            <Plus size={14} /> New Query
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <StatCard label="Open"        value={stats.open || 0}        color="#185FA5" />
        <StatCard label="In Progress" value={stats.in_progress || 0} color="#854F0B" />
        <StatCard label="Escalated"   value={stats.escalated || 0}   color="#A32D2D" />
        <StatCard label="Resolved"    value={stats.resolved || 0}    color="#3B6D11" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <select className="input w-auto min-w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['Open', 'In Progress', 'Resolved', 'Escalated'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="input w-auto min-w-36" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Query list */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : queries.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={48} />}
          title="No queries found"
          description="Create a new query or adjust your filters"
          action={canEdit && <button className="btn btn-primary btn-sm" onClick={() => setNewOpen(true)}><Plus size={13} /> New Query</button>}
        />
      ) : (
        <div className="space-y-3">
          {queries.map(q => (
            <QueryCard key={q.id} query={q}
              onManage={() => { setManageQuery(q); setManageQuery(q) }}
              onDelete={() => setDeleteTarget(q)} />
          ))}
        </div>
      )}

      <NewQueryModal open={newOpen} onClose={() => setNewOpen(false)} onCreated={load} />
      <ManageQueryModal query={manageQuery} open={!!manageQuery}
        onClose={() => setManageQuery(null)} onUpdated={load} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Query"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        danger onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
