import React, { useState, useEffect, useCallback } from 'react'
import { Download, Wand2, RefreshCw, BarChart3 } from 'lucide-react'
import { reportApi, aiApi } from '../../api/client'
import { useAppCtx } from '../../contexts/AppContext'
import { ScoreBadge, StatCard, Spinner, EmptyState, Modal, useToast } from '../shared/UI'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function MiniBar({ score }) {
  const color = !score ? '#e2e8f0' : score >= 3.5 ? '#1D9E75' : score >= 2 ? '#BA7517' : '#E24B4A'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-gray-100 rounded-full overflow-hidden h-1.5 flex-shrink-0">
        <div className="h-full rounded-full" style={{ width: `${score ? (score / 5) * 100 : 0}%`, background: color }} />
      </div>
      <ScoreBadge score={score} />
    </div>
  )
}

export default function ReportsView() {
  const { org } = useAppCtx()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [aiOpen, setAiOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await reportApi.summary()
      setData(res.data)
    } catch { toast('Failed to load report data', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleExcel = async () => {
    setExporting(true)
    try {
      const res = await reportApi.exportExcel()
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = 'ADC_Report.xlsx'; a.click()
      URL.revokeObjectURL(url)
    } catch { toast('Export failed', 'error') }
    finally { setExporting(false) }
  }

  const handleAI = async () => {
    setAiLoading(true)
    try {
      const { data: result } = await aiApi.analyse({ analysis_type: 'full' })
      setAiResult(result.analysis)
      setAiOpen(true)
    } catch { toast('AI analysis failed — check API key configuration', 'error') }
    finally { setAiLoading(false) }
  }

  const handlePDF = () => {
    if (!data) return
    const { org: orgName, domains, applications, open_queries } = data
    const html = buildReportHtml(orgName, domains, applications, open_queries, org)
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size={28} /></div>
  if (!data) return <EmptyState icon={<BarChart3 size={48} />} title="No data" description="Add applications and scores first" />

  const chartData = (data.domains || [])
    .filter(d => d.avg_score)
    .map(d => ({ name: d.name.split(' ').slice(0, 2).join(' '), score: parseFloat(d.avg_score) || 0 }))
    .sort((a, b) => b.score - a.score)

  return (
    <div className="screen-shell">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[14px] font-semibold text-[#222]">Portfolio Report</h1>
          <p className="text-[11px] text-[#777] mt-0.5">
            {org?.name}{org?.analyst ? ` · ${org.analyst}` : ''}{org?.reference_no ? ` · ${org.reference_no}` : ''}
            {org?.financial_year ? ` · FY ${org.financial_year}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn" onClick={handleAI} disabled={aiLoading}>
            {aiLoading ? <Spinner size={14} /> : <Wand2 size={14} />} AI Analysis
          </button>
          <button className="btn" onClick={handlePDF}><Download size={14} /> PDF</button>
          <button className="btn btn-primary" onClick={handleExcel} disabled={exporting}>
            {exporting ? <Spinner size={14} /> : <Download size={14} />} Excel
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <StatCard label="Domains"      value={data.domains?.length || 0} />
        <StatCard label="Applications" value={data.applications?.length || 0} />
        <StatCard label="Rated"        value={data.applications?.filter(a => a.avg_score).length || 0} />
        <StatCard label="Open Queries" value={data.open_queries?.length || 0} />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card p-5 mb-5">
          <div className="section-title">Domain Score Overview</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip formatter={(v) => [v.toFixed(1), 'Avg Score']} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.score >= 3.5 ? '#1D9E75' : entry.score >= 2 ? '#BA7517' : '#E24B4A'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Domain overview table */}
      <div className="card overflow-hidden mb-5">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Domain Overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head-row text-[10px] uppercase tracking-[0.04em]">
                <th className="text-left px-4 py-3">Domain</th>
                <th className="text-left px-3 py-3">Apps</th>
                <th className="text-left px-3 py-3">Avg Score</th>
                <th className="text-left px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data.domains || []).map((d, i) => (
                <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 font-semibold text-gray-900">{d.name}</td>
                  <td className="px-3 py-2.5 text-gray-600">{d.app_count}</td>
                  <td className="px-3 py-2.5"><MiniBar score={d.avg_score} /></td>
                  <td className="px-3 py-2.5">
                    {!d.avg_score ? <span className="badge-gray">Unrated</span>
                      : d.avg_score >= 3.5 ? <span className="badge-green">Adequate</span>
                      : d.avg_score >= 2 ? <span className="badge-amber">Review</span>
                      : <span className="badge-red">Critical</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Applications table */}
      <div className="card overflow-hidden mb-5">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">All Applications</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head-row text-[10px] uppercase tracking-[0.04em]">
                <th className="text-left px-4 py-3">Application</th>
                <th className="text-left px-3 py-3">Vendor</th>
                <th className="text-left px-3 py-3">Domain</th>
                <th className="text-left px-3 py-3">Score</th>
                <th className="text-left px-3 py-3">TCO (R)</th>
                <th className="text-left px-3 py-3">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {(data.applications || [])
                .sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0))
                .map((app, i) => (
                  <tr key={app.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{app.name}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{app.vendor || '–'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{app.domain || '–'}</td>
                    <td className="px-3 py-2.5"><ScoreBadge score={app.avg_score} /></td>
                    <td className="px-3 py-2.5 text-sm">{app.tco ? `R ${Number(app.tco).toLocaleString()}` : '–'}</td>
                    <td className="px-3 py-2.5">
                      {app.recommendation ? <span className="badge-gray">{app.recommendation}</span> : '–'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open queries */}
      {(data.open_queries || []).length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Open Queries</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head-row text-[10px] uppercase tracking-[0.04em]">
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-3 py-3">Status</th>
                  <th className="text-left px-3 py-3">Priority</th>
                  <th className="text-left px-3 py-3">Assignee</th>
                  <th className="text-left px-3 py-3">Due</th>
                </tr>
              </thead>
              <tbody>
                {data.open_queries.map((q, i) => (
                  <tr key={q.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{q.title}</td>
                    <td className="px-3 py-2.5"><span className="badge-blue">{q.status}</span></td>
                    <td className="px-3 py-2.5">
                      {q.priority === 'High' ? <span className="badge-red">High</span>
                        : q.priority === 'Medium' ? <span className="badge-amber">Medium</span>
                        : <span className="badge-green">Low</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{q.assignee || '–'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{q.due_date || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Modal */}
      <Modal open={aiOpen} onClose={() => setAiOpen(false)} title="AI Portfolio Analysis" size="2xl">
        <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{aiResult}</div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
          <button className="btn" onClick={() => { navigator.clipboard.writeText(aiResult); toast('Copied') }}>Copy</button>
          <button className="btn btn-primary" onClick={() => setAiOpen(false)}>Close</button>
        </div>
      </Modal>
    </div>
  )
}

function buildReportHtml(orgName, domains, applications, openQueries, org) {
  return `<!DOCTYPE html><html><head><style>
    body{font-family:Arial,sans-serif;font-size:11px;margin:30px;color:#222;line-height:1.5}
    h1{font-size:18px;color:#1F3864}h2{font-size:13px;border-bottom:1px solid #ccc;padding-bottom:3px;margin:18px 0 8px;color:#2E75B6}
    table{width:100%;border-collapse:collapse;margin-bottom:12px}
    th{background:#1F3864;color:#fff;padding:5px 7px;text-align:left;font-size:10px}
    td{padding:5px 7px;border-bottom:1px solid #eee;font-size:10px}
    .meta{font-size:10px;color:#777;margin-bottom:18px}
  </style></head><body>
    <h1>Application Due Diligence Report</h1>
    <div class="meta">${orgName}${org?.department?' — '+org.department:''} | ${org?.analyst||''} | ${org?.reference_no||''} | ${new Date().toLocaleDateString()}</div>
    <h2>Domain Overview</h2>
    <table><tr><th>Domain</th><th>Apps</th><th>Avg Score</th><th>Status</th></tr>
    ${(domains||[]).map(d=>`<tr><td>${d.name}</td><td>${d.app_count}</td><td>${d.avg_score?Number(d.avg_score).toFixed(1):'–'}</td><td>${!d.avg_score?'Unrated':d.avg_score>=3.5?'Adequate':d.avg_score>=2?'Review':'Critical'}</td></tr>`).join('')}
    </table>
    <h2>All Applications</h2>
    <table><tr><th>Application</th><th>Vendor</th><th>Domain</th><th>Score</th><th>TCO</th><th>Recommendation</th></tr>
    ${(applications||[]).map(a=>`<tr><td>${a.name}</td><td>${a.vendor||'–'}</td><td>${a.domain||'–'}</td><td>${a.avg_score?Number(a.avg_score).toFixed(1):'–'}</td><td>${a.tco?'R '+Number(a.tco).toLocaleString():'–'}</td><td>${a.recommendation||'–'}</td></tr>`).join('')}
    </table>
    ${(openQueries||[]).length?`<h2>Open Queries</h2><table><tr><th>Title</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due</th></tr>${openQueries.map(q=>`<tr><td>${q.title}</td><td>${q.status}</td><td>${q.priority}</td><td>${q.assignee||'–'}</td><td>${q.due_date||'–'}</td></tr>`).join('')}</table>`:''}
  </body></html>`
}
