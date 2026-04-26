import React, { useEffect, useState, useCallback } from 'react'
import { X, AlertTriangle, CheckCircle, Info, Star, Loader2 } from 'lucide-react'

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl', '2xl': 'max-w-3xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${widths[size]} bg-white rounded-xl shadow-xl max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastFn = null
export function useToast() {
  return useCallback((msg, type = 'success', duration = 3500) => {
    if (toastFn) toastFn(msg, type, duration)
  }, [])
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    toastFn = (msg, type, duration) => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, msg, type }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
    }
    return () => { toastFn = null }
  }, [])

  const icons = { success: <CheckCircle size={16} />, error: <AlertTriangle size={16} />, info: <Info size={16} /> }
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium animate-slide-up ${colors[t.type] || colors.info}`}>
          {icons[t.type] || icons.info}
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ── Star Rating ───────────────────────────────────────────────────────────────
export function StarRating({ value = 0, onChange, readonly = false, size = 'md' }) {
  const [hover, setHover] = useState(0)
  const sizes = { sm: 14, md: 18, lg: 22 }
  const sz = sizes[size] || 18

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          size={sz}
          className={`transition-colors ${readonly ? '' : 'cursor-pointer'} ${
            s <= (hover || value)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-gray-100 text-gray-300'
          }`}
          onClick={() => !readonly && onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
        />
      ))}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 20, className = '' }) {
  return <Loader2 size={size} className={`animate-spin text-blue-600 ${className}`} />
}

export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-64">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={32} />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-gray-300 mb-4">{icon}</div>}
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
      {description && <p className="text-xs text-gray-400 mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
export function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger = false }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={20} className={danger ? 'text-red-500 flex-shrink-0 mt-0.5' : 'text-amber-500 flex-shrink-0 mt-0.5'} />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
          <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Score Badge ───────────────────────────────────────────────────────────────
export function ScoreBadge({ score, variant = 'soft' }) {
  if (!score) return <span className="badge-gray">–</span>
  const cls = score >= 3.5 ? 'badge-green' : score >= 2 ? 'badge-amber' : 'badge-red'
  if (variant === 'solid') {
    return (
      <span className={`${cls} min-w-[38px] justify-center shadow-[0_3px_8px_rgba(27,47,70,0.25)]`}>
        {Number(score).toFixed(1)}
      </span>
    )
  }
  return <span className={`${cls} min-w-[36px] justify-center`}>{Number(score).toFixed(1)}</span>
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, color = '#1D9E75', height = 4 }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{ height }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ── Form Row ──────────────────────────────────────────────────────────────────
export function FormRow({ label, children, required }) {
  return (
    <div className="mb-4">
      <label className="label">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, color }) {
  const valueStr = String(value ?? '–')
  const valueSizeClass =
    valueStr.length > 11 ? 'text-[18px]' :
    valueStr.length > 8 ? 'text-[22px]' :
    valueStr.length > 5 ? 'text-[30px]' :
    'text-[36px]'

  return (
    <div className="card px-3 py-2 text-center min-h-[72px] flex flex-col items-center justify-center">
      <div className={`${valueSizeClass} leading-none font-semibold text-[#101825]`} style={color ? { color } : {}}>
        {valueStr}
      </div>
      <div className="text-[12px] text-[#4c5b6b] mt-1">{label}</div>
    </div>
  )
}
