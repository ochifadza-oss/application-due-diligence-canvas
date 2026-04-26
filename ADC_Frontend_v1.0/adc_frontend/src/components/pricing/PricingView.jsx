import React, { useState, useEffect, useCallback } from 'react'
import { Save, Download, DollarSign } from 'lucide-react'
import { useAppCtx } from '../../contexts/AppContext'
import { pricingApi } from '../../api/client'
import { Spinner, ScoreBadge, StatCard, useToast, EmptyState } from '../shared/UI'

const RECOMMENDATIONS = ['', 'Keep', 'Upgrade', 'Replace', 'Retire', 'Review']

function recColor(rec) {
  const map = { Keep: 'badge-green', Upgrade: 'badge-amber', Replace: 'badge-red', Retire: 'badge-red', Review: 'badge-amber' }
  return map[rec] || 'badge-gray'
}

export default function PricingView() {
  const { applications, domains, getAvgScore } = useAppCtx()
  const toast = useToast()
  const [pricing, setPricing] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  const domainMap = Object.fromEntries(domains.map(d => [d.id, d.name]))

  const loadPricing = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await pricingApi.list()
      const map = {}
      data.forEach(p => {
        map[p.app_id] = {
          licence_cost: p.licence_cost || 0,
          maintenance_cost: p.maintenance_cost || 0,
          implementation_cost: p.implementation_cost || 0,
          score_weight: p.score_weight || 100,
          recommendation: p.recommendation || '',
          notes: p.notes || '',
        }
      })
      setPricing(map)
    } catch { toast('Failed to load pricing', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadPricing() }, [loadPricing])

  const updateField = (appId, field, value) => {
    setPricing(prev => ({
      ...prev,
      [appId]: { ...(prev[appId] || {}), [field]: value }
    }))
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      await Promise.all(
        applications.map(app => {
          const p = pricing[app.id] || {}
          return pricingApi.upsert(app.id, {
            licence_cost: Number(p.licence_cost) || 0,
            maintenance_cost: Number(p.maintenance_cost) || 0,
            implementation_cost: Number(p.implementation_cost) || 0,
            score_weight: Number(p.score_weight) || 100,
            recommendation: p.recommendation || null,
            notes: p.notes || '',
          })
        })
      )
      toast('All pricing saved')
    } catch { toast('Failed to save pricing', 'error') }
    finally { setSaving(false) }
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      const { reportApi } = await import('../../api/client')
      const res = await reportApi.exportExcel()
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = 'ADC_Report.xlsx'; a.click()
      URL.revokeObjectURL(url)
    } catch { toast('Export failed', 'error') }
    finally { setExporting(false) }
  }

  // Totals
  const totals = applications.reduce((acc, app) => {
    const p = pricing[app.id] || {}
    acc.lic += Number(p.licence_cost) || 0
    acc.maint += Number(p.maintenance_cost) || 0
    acc.impl += Number(p.implementation_cost) || 0
    return acc
  }, { lic: 0, maint: 0, impl: 0 })

  const fmt = (n) => `R ${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}`

  if (loading) return <div className="flex justify-center py-16"><Spinner size={28} /></div>

  if (applications.length === 0) return (
    <div className="screen-shell">
      <EmptyState icon={<DollarSign size={48} />} title="No applications yet"
        description="Add applications on the Canvas tab first" />
    </div>
  )

  return (
    <div className="screen-shell">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[14px] font-semibold text-[#222]">Pricing & Score Management</h1>
          <p className="text-[11px] text-[#777] mt-0.5">Capture TCO and set recommendations for each application</p>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={exportExcel} disabled={exporting}>
            {exporting ? <Spinner size={14} /> : <Download size={14} />} Export Excel
          </button>
          <button className="btn btn-primary" onClick={saveAll} disabled={saving}>
            {saving ? <Spinner size={14} /> : <Save size={14} />} Save All
          </button>
        </div>
      </div>

      {/* Totals bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <StatCard label="Licence Total"      value={fmt(totals.lic)} />
        <StatCard label="Maintenance Total"  value={fmt(totals.maint)} />
        <StatCard label="Impl. Total"        value={fmt(totals.impl)} />
        <StatCard label="Portfolio TCO"      value={fmt(totals.lic + totals.maint + totals.impl)} color="#1D9E75" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head-row text-[10px] uppercase tracking-[0.04em]">
                <th className="text-left px-4 py-2.5 font-semibold">Application</th>
                <th className="text-left px-3 py-2.5 font-semibold">Domain</th>
                <th className="text-left px-3 py-2.5 font-semibold">Licence (R)</th>
                <th className="text-left px-3 py-2.5 font-semibold">Maint. (R)</th>
                <th className="text-left px-3 py-2.5 font-semibold">Impl. (R)</th>
                <th className="text-left px-3 py-2.5 font-semibold">Total TCO</th>
                <th className="text-left px-3 py-2.5 font-semibold">Weight %</th>
                <th className="text-left px-3 py-2.5 font-semibold">Score</th>
                <th className="text-left px-3 py-2.5 font-semibold">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, idx) => {
                const p = pricing[app.id] || {}
                const tco = (Number(p.licence_cost) || 0) + (Number(p.maintenance_cost) || 0) + (Number(p.implementation_cost) || 0)
                const avg = getAvgScore(app)
                return (
                  <tr key={app.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-gray-900">{app.name}</div>
                      {app.vendor && <div className="text-xs text-gray-400">{app.vendor}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{domainMap[app.domain_id] || '–'}</td>
                    {['licence_cost', 'maintenance_cost', 'implementation_cost'].map(field => (
                      <td key={field} className="px-3 py-2">
                        <input
                          type="number" min="0" step="1000"
                          className="w-28 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                          value={p[field] || ''}
                          placeholder="0"
                          onChange={e => updateField(app.id, field, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2.5 font-semibold text-sm text-gray-800">
                      {tco ? fmt(tco) : '–'}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number" min="0" max="100"
                        className="w-16 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                        value={p.score_weight || 100}
                        onChange={e => updateField(app.id, 'score_weight', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2.5"><ScoreBadge score={avg} /></td>
                    <td className="px-3 py-2">
                      <select
                        className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                        value={p.recommendation || ''}
                        onChange={e => updateField(app.id, 'recommendation', e.target.value)}
                      >
                        {RECOMMENDATIONS.map(r => <option key={r} value={r}>{r || '– Select –'}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-gray-200 font-semibold text-sm">
                <td colSpan={2} className="px-4 py-3 text-gray-600">TOTALS</td>
                <td className="px-3 py-3 text-gray-800">{fmt(totals.lic)}</td>
                <td className="px-3 py-3 text-gray-800">{fmt(totals.maint)}</td>
                <td className="px-3 py-3 text-gray-800">{fmt(totals.impl)}</td>
                <td className="px-3 py-3 text-green-700">{fmt(totals.lic + totals.maint + totals.impl)}</td>
                <td colSpan={3} className="px-3 py-3 text-xs text-gray-400">Weights should total 100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
