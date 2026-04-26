import React, { useState, useEffect } from 'react'
import { Plus, Pencil, LayoutGrid } from 'lucide-react'
import { useAppCtx } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { appApi, domainApi } from '../../api/client'
import { Modal, StarRating, ScoreBadge, ProgressBar, EmptyState, Spinner, FormRow, StatCard, useToast, ConfirmDialog } from '../shared/UI'

// ── Stat bar ──────────────────────────────────────────────────────────────────
function PortfolioScoreStat({ score }) {
  const normalized = score ? Math.max(0, Math.min(5, score)) : 0
  const deg = Math.round((normalized / 5) * 360)

  return (
    <div className="card px-3 py-2 min-h-[72px] flex items-center justify-center gap-3">
      <div
        className="relative w-11 h-11 rounded-full"
        style={{ background: `conic-gradient(#1f5b8d ${deg}deg, #c9d4e0 ${deg}deg)` }}
      >
        <div className="absolute inset-[5px] rounded-full bg-[#edf2f7]" />
      </div>
      <div className="leading-tight">
        <div className="text-[36px] font-semibold text-[#111a28] leading-none">
          {score ? `${score.toFixed(1)}/5` : '–'}
        </div>
        <div className="text-[12px] text-[#4c5b6b] mt-1">Portfolio Score</div>
      </div>
    </div>
  )
}

function CanvasStats() {
  const { domains, applications, getAvgScore } = useAppCtx()
  const rated = applications.filter(a => getAvgScore(a) !== null).length
  const scores = applications.map(getAvgScore).filter(Boolean)
  const portfolioAvg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <StatCard label="Domains"     value={domains.length} />
      <StatCard label="Applications" value={applications.length} />
      <StatCard label="Rated"        value={`${rated}/${applications.length}`} />
      <PortfolioScoreStat score={portfolioAvg} />
    </div>
  )
}

// ── Domain cell ───────────────────────────────────────────────────────────────
function DomainCell({ domain, onClick, onAddApp, onRename }) {
  const { getAppsByDomain, getAvgScore } = useAppCtx()
  const apps = getAppsByDomain(domain.id)
  const previewApps = [...apps].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 3)
  const avg = apps.length
    ? apps.map(getAvgScore).filter(Boolean).reduce((a, b, _, arr) => a + b / arr.length, 0) || null
    : null
  const rated = apps.filter(a => getAvgScore(a) !== null).length

  return (
    <div
      className="card p-4 cursor-pointer hover:border-[#8eadcc] hover:shadow-[0_16px_30px_rgba(26,44,65,0.2)] transition-all duration-200 group"
      onClick={() => onClick(domain)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[16px] font-semibold text-[#1f2734] truncate leading-tight">{domain.name}</span>
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#7b899a] hover:text-[#4f6074] transition-all flex-shrink-0"
            onClick={e => { e.stopPropagation(); onRename(domain) }}
            title="Rename domain"
          >
            <Pencil size={12} />
          </button>
        </div>
        {avg ? <ScoreBadge score={avg} variant="solid" /> : <span className="badge-gray text-xs">–</span>}
      </div>

      {/* App list */}
      <div className="space-y-1.5 mb-3 min-h-[110px]">
        {previewApps.map(app => {
          const s = getAvgScore(app)
          const scoreColor = !s ? '#8b98aa' : s >= 3.5 ? '#1f7a53' : s >= 2 ? '#8a6a2a' : '#925454'
          return (
            <div key={app.id} className="flex items-center justify-between text-[12px] bg-[rgba(215,224,234,0.74)] border border-[#d2dce7] rounded-xl px-3 py-1.5">
              <span className="text-[#1d2734] truncate flex-1">{app.name}</span>
              {s ? <span className="font-semibold ml-2" style={{ color: scoreColor }}>{s.toFixed(1)}</span>
                 : <span className="text-[#8b98aa] ml-2">–</span>}
            </div>
          )
        })}
        {apps.length > 3 && (
          <p className="text-[11px] text-[#6c7988] pl-1">+{apps.length - 3} more</p>
        )}
        {apps.length === 0 && (
          <p className="text-[12px] text-[#99a6b5] italic pl-1">No applications</p>
        )}
      </div>

      {/* Progress bar */}
      {apps.length > 0 && <ProgressBar value={rated} max={apps.length} color="#97d2ad" height={6} />}

      {/* Add button */}
      <button
        className="mt-3 w-full text-[12px] text-[#55687c] border border-[#c3d0dc] rounded-xl py-2 bg-[rgba(229,236,244,0.45)] hover:bg-[rgba(229,236,244,0.72)] transition-colors"
        onClick={e => { e.stopPropagation(); onAddApp(domain.id) }}
      >
        + add application
      </button>
    </div>
  )
}

// ── Application rating panel (modal) ─────────────────────────────────────────
function DomainPanel({ domain, open, onClose }) {
  const { getAppsByDomain, criteria, refreshApps, getAvgScore } = useAppCtx()
  const { canEdit } = useAuth()
  const toast = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const apps = getAppsByDomain(domain?.id)

  const handleScoreChange = async (appId, critIdx, score) => {
    try {
      await appApi.setScore(appId, critIdx, score)
      await refreshApps()
    } catch { toast('Failed to save score', 'error') }
  }

  if (!domain) return null
  return (
    <Modal open={open} onClose={onClose} title={domain.name} size="xl">
      {apps.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Add an application to start rating"
          action={
            <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> Add Application
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {apps.map(app => {
            const avg = getAvgScore(app)
            return (
              <div key={app.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{app.name}</span>
                    {app.vendor && <span className="text-xs text-gray-400 ml-2">{app.vendor}</span>}
                  </div>
                  <ScoreBadge score={avg} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {criteria.map(c => (
                    <div key={c.criterion_index} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-2">{c.label}</div>
                      <StarRating
                        value={app.scores?.[c.criterion_index] || 0}
                        onChange={canEdit ? (v) => handleScoreChange(app.id, c.criterion_index, v) : undefined}
                        readonly={!canEdit}
                      />
                    </div>
                  ))}
                </div>
                {app.notes && <p className="text-xs text-gray-400 mt-2 italic">{app.notes}</p>}
              </div>
            )
          })}
        </div>
      )}
      {canEdit && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button className="btn btn-primary w-full" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Application to {domain.name}
          </button>
        </div>
      )}
      <AddAppModal open={addOpen} onClose={() => setAddOpen(false)} defaultDomainId={domain?.id} />
    </Modal>
  )
}

// ── Add Application Modal ─────────────────────────────────────────────────────
function AddAppModal({ open, onClose, defaultDomainId }) {
  const { domains, refreshApps } = useAppCtx()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', vendor: '', domain_id: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm({ name: '', vendor: '', domain_id: defaultDomainId || '', notes: '' })
  }, [open, defaultDomainId])

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast('Application name is required', 'error')
    if (!form.domain_id) return toast('Please select a domain', 'error')
    setSaving(true)
    try {
      await appApi.create({ ...form, domain_id: Number(form.domain_id) })
      await refreshApps()
      toast('Application added')
      onClose()
    } catch (e) {
      toast(e.response?.data?.detail || 'Failed to add application', 'error')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Application">
      <FormRow label="Application Name" required>
        <input className="input" placeholder="e.g. SAP Finance Module" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
      </FormRow>
      <FormRow label="Vendor / Supplier">
        <input className="input" placeholder="e.g. SAP SE" value={form.vendor}
          onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} />
      </FormRow>
      <FormRow label="Domain" required>
        <select className="input" value={form.domain_id}
          onChange={e => setForm(f => ({ ...f, domain_id: e.target.value }))}>
          <option value="">— Select domain —</option>
          {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </FormRow>
      <FormRow label="Notes">
        <textarea className="input resize-none" rows={3} placeholder="Optional observations..."
          value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </FormRow>
      <div className="flex gap-2 justify-end pt-2">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? <Spinner size={14} /> : <Plus size={14} />} Add Application
        </button>
      </div>
    </Modal>
  )
}

// ── Rename Domain Modal ───────────────────────────────────────────────────────
function RenameDomainModal({ domain, open, onClose }) {
  const { refreshDomains } = useAppCtx()
  const toast = useToast()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open && domain) setName(domain.name) }, [open, domain])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await domainApi.update(domain.id, { name: name.trim() })
      await refreshDomains()
      toast('Domain renamed')
      onClose()
    } catch { toast('Failed to rename domain', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Rename Domain" size="sm">
      <input className="input mb-4" value={name} onChange={e => setName(e.target.value)}
        autoFocus onKeyDown={e => e.key === 'Enter' && handleSave()} />
      <div className="flex gap-2 justify-end">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size={14} /> : null} Save
        </button>
      </div>
    </Modal>
  )
}

// ── Canvas View (main export) ─────────────────────────────────────────────────
export default function CanvasView() {
  const { domains, loadingData } = useAppCtx()
  const { canEdit } = useAuth()
  const [panelDomain, setPanelDomain] = useState(null)
  const [addAppDomainId, setAddAppDomainId] = useState(null)
  const [renameDomain, setRenameDomain] = useState(null)

  if (loadingData) return (
    <div className="flex-1 flex items-center justify-center min-h-64">
      <Spinner size={32} />
    </div>
  )

  if (domains.length === 0) return (
    <div className="screen-shell">
      <EmptyState
        icon={<LayoutGrid size={48} />}
        title="No domains configured"
        description="Go to Settings to add domains to your canvas"
      />
    </div>
  )

  return (
    <div className="screen-shell">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="app-title-font text-[40px] sm:text-[48px] leading-none font-semibold text-[#22384f]">Application Canvas</h1>
          <p className="text-[14px] text-[#536272] mt-1">Click a domain to rate applications</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary px-5 py-2 text-[13px]" onClick={() => setAddAppDomainId(-1)}>
            <Plus size={14} /> Add Application
          </button>
        )}
      </div>

      <CanvasStats />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {domains.map(d => (
          <DomainCell
            key={d.id}
            domain={d}
            onClick={setPanelDomain}
            onAddApp={setAddAppDomainId}
            onRename={setRenameDomain}
          />
        ))}
      </div>

      <DomainPanel
        domain={panelDomain}
        open={!!panelDomain}
        onClose={() => setPanelDomain(null)}
      />
      <AddAppModal
        open={!!addAppDomainId}
        onClose={() => setAddAppDomainId(null)}
        defaultDomainId={addAppDomainId > 0 ? addAppDomainId : null}
      />
      <RenameDomainModal
        domain={renameDomain}
        open={!!renameDomain}
        onClose={() => setRenameDomain(null)}
      />
    </div>
  )
}
