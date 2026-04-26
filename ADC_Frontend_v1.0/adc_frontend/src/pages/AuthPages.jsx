import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/client'
import { Spinner } from '../components/shared/UI'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'

// ── Login Page ────────────────────────────────────────────────────────────────
export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) return setError('Email and password are required')
    setLoading(true); setError('')
    try {
      const data = await login(email, password)
      if (data.must_change_password) navigate('/change-password')
      else if (!data.terms_accepted) navigate('/terms')
      else navigate('/app')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">ADC System</h1>
          <p className="text-blue-300 text-sm">Application Due Diligence Canvas</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="your@email.gov.za"
                value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} className="input pr-10"
                  placeholder="Enter your password"
                  value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPwd(v => !v)}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full justify-center py-2.5 text-base" disabled={loading}>
              {loading ? <Spinner size={16} /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              For account access, contact your system administrator.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-blue-400 mt-6">
          ADC System v1.0 · GMT Technology Solutions
        </p>
      </div>
    </div>
  )
}

// ── Forced Password Change Page ──────────────────────────────────────────────
export function ChangePasswordPage() {
  const { user, loadUser, logout } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPwd, setShowCurrentPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    if (!user.must_change_password) {
      if (!user.terms_accepted) navigate('/terms')
      else navigate('/app')
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match')
      return
    }

    setLoading(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      const { data } = await authApi.me()
      await loadUser()
      if (!data.terms_accepted) navigate('/terms')
      else navigate('/app')
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to change password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Security Update Required</h1>
          <p className="text-blue-300 text-sm">Change your temporary password to continue</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Current (temporary) password</label>
              <div className="relative">
                <input
                  type={showCurrentPwd ? 'text' : 'password'}
                  className="input pr-10"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowCurrentPwd(v => !v)}
                >
                  {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">New password</label>
              <div className="relative">
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  className="input pr-10"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowNewPwd(v => !v)}
                >
                  {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">At least 10 characters with uppercase, lowercase, number, and special character.</p>
            </div>

            <div>
              <label className="label">Confirm new password</label>
              <div className="relative">
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  className="input pr-10"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowConfirmPwd(v => !v)}
                >
                  {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full justify-center py-2.5 text-base" disabled={loading}>
              {loading ? <Spinner size={16} /> : null}
              {loading ? 'Updating password...' : 'Update password'}
            </button>
          </form>

          <button
            className="btn w-full justify-center mt-3 text-sm text-gray-500"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Terms Acceptance Page ─────────────────────────────────────────────────────
export function TermsPage() {
  const { user, loadUser } = useAuth()
  const navigate = useNavigate()
  const scrollRef = useRef()
  const [scrolled, setScrolled] = useState(false)
  const [checks, setChecks] = useState({ read: false, popia: false, auth: false })
  const [accepting, setAccepting] = useState(false)
  const allChecked = Object.values(checks).every(Boolean)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    if (user.must_change_password) navigate('/change-password')
  }, [user, navigate])

  const handleScroll = () => {
    const el = scrollRef.current
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setScrolled(true)
  }

  const handleAccept = async () => {
    if (!allChecked) return
    setAccepting(true)
    try {
      await authApi.acceptTerms()
      await loadUser()
      navigate('/app')
    } catch { setAccepting(false) }
  }

  const handleDecline = () => {
    localStorage.clear()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 px-8 py-6 text-center">
            <ShieldCheck size={32} className="text-blue-300 mx-auto mb-2" />
            <h1 className="text-lg font-semibold text-white">Application Due Diligence Canvas</h1>
            <p className="text-blue-300 text-sm mt-1">Terms and Conditions of Use</p>
          </div>

          {/* Scrollable T&C */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-72 overflow-y-auto px-8 py-5 text-sm text-gray-600 leading-relaxed border-b border-gray-100"
          >
            <h3 className="font-semibold text-gray-900 mb-2">1. Hosting and Service Provider</h3>
            <p className="mb-4">This application is hosted on Netlify, Inc. and Railway infrastructure. By using this system you acknowledge that the frontend interface is served via Netlify's global CDN, and that application data is stored on Railway-hosted MySQL infrastructure. Netlify's Terms of Service and Railway's Terms of Service apply to the delivery and storage of this system.</p>

            <h3 className="font-semibold text-gray-900 mb-2">2. Data Ownership and Privacy (POPIA)</h3>
            <p className="mb-4">All data entered into this system — including application records, pricing information, stakeholder details, and query logs — remains the property of your organisation. This system is designed for compliance with the Protection of Personal Information Act (POPIA, Act 4 of 2013). Personal information captured is used solely for the purpose of conducting the application due diligence review.</p>

            <h3 className="font-semibold text-gray-900 mb-2">3. Acceptable Use</h3>
            <p className="mb-4">This system is for authorised users only. You may not share your login credentials, attempt to access other organisations' data, or use this system for any purpose other than legitimate application portfolio assessment. Misuse may result in account suspension and disciplinary action in accordance with your organisation's ICT policy.</p>

            <h3 className="font-semibold text-gray-900 mb-2">4. Data Security</h3>
            <p className="mb-4">All data is transmitted over HTTPS/TLS 1.3. Passwords are stored as bcrypt hashes. The system does not store payment card information. You are responsible for keeping your credentials confidential and for all activity that occurs under your account.</p>

            <h3 className="font-semibold text-gray-900 mb-2">5. Data Residency</h3>
            <p className="mb-4">The frontend of this application is hosted on Netlify's infrastructure (United States/European Union). Application data is stored on Railway infrastructure. If your organisation requires data residency within South Africa, please contact your system administrator to discuss on-premise deployment options.</p>

            <h3 className="font-semibold text-gray-900 mb-2">6. Limitation of Liability</h3>
            <p>GMT Technology Solutions provides this system for the purposes agreed in the project contract. The system and its outputs are intended to support, not replace, professional judgement in application due diligence decisions. GMT Technology Solutions shall not be liable for decisions made based on system outputs.</p>
          </div>

          {/* Checkboxes */}
          <div className="px-8 py-5">
            {!scrolled && (
              <p className="text-xs text-amber-600 mb-3 text-center">↓ Scroll to read all terms before accepting</p>
            )}

            {[
              { key: 'read',  label: 'I have read and understood the Terms and Conditions of use for this system' },
              { key: 'popia', label: 'I consent to my usage data being processed in accordance with POPIA for the purpose of this due diligence review' },
              { key: 'auth',  label: 'I confirm I am an authorised user of this system as approved by my organisation' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-start gap-3 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-slate-900 flex-shrink-0"
                  checked={checks[key]}
                  onChange={e => setChecks(c => ({ ...c, [key]: e.target.checked }))}
                />
                <span className="text-sm text-gray-600">{label}</span>
              </label>
            ))}

            <button
              className="btn btn-primary w-full justify-center py-2.5 mt-3 text-sm disabled:opacity-40"
              disabled={!allChecked || accepting}
              onClick={handleAccept}
            >
              {accepting ? <Spinner size={16} /> : <ShieldCheck size={16} />}
              {accepting ? 'Accepting...' : 'Accept and continue'}
            </button>

            <button className="btn w-full justify-center mt-2 text-sm text-gray-500" onClick={handleDecline}>
              Decline — sign out
            </button>
          </div>

          <div className="px-8 py-3 bg-gray-50 text-center text-xs text-gray-400 border-t border-gray-100">
            ADC v1.0 · SRS-ADC-2026-001 · GMT Technology Solutions
          </div>
        </div>
      </div>
    </div>
  )
}
