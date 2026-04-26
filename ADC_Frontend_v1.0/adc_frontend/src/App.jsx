import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider, useAppCtx } from './contexts/AppContext'
import { ToastContainer } from './components/shared/UI'
import TopBar from './components/shared/TopBar'
import CanvasView   from './components/canvas/CanvasView'
import PricingView  from './components/pricing/PricingView'
import TORView      from './components/tor/TORView'
import QueriesView  from './components/queries/QueriesView'
import ReportsView  from './components/reports/ReportsView'
import SettingsView from './components/settings/SettingsView'
import { LoginPage, TermsPage, ChangePasswordPage } from './pages/AuthPages'

// ── Protected Route ───────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <p className="text-sm text-gray-500 animate-pulse">Loading ADC...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (user.must_change_password) return <Navigate to="/change-password" replace />
  if (!user.terms_accepted) return <Navigate to="/terms" replace />
  return children
}

function RequirePasswordChange({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <p className="text-sm text-gray-500 animate-pulse">Loading ADC...</p>
      </div>
    </div>
  )

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!user.must_change_password) {
    if (!user.terms_accepted) return <Navigate to="/terms" replace />
    return <Navigate to="/app" replace />
  }
  return children
}

// ── Main App Shell ────────────────────────────────────────────────────────────
const TABS = ['canvas', 'pricing', 'tor', 'queries', 'reports', 'settings']
const TAB_COMPONENTS = {
  canvas:   <CanvasView />,
  pricing:  <PricingView />,
  tor:      <TORView />,
  queries:  <QueriesView />,
  reports:  <ReportsView />,
  settings: <SettingsView />,
}

function AppShell() {
  const [activeTab, setActiveTab] = useState('canvas')
  const { refreshAll } = useAppCtx()

  useEffect(() => { refreshAll() }, [refreshAll])

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <TopBar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1">
        {TAB_COMPONENTS[activeTab] || TAB_COMPONENTS.canvas}
      </main>
    </div>
  )
}

// ── Root App with Providers ───────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/change-password" element={
          <RequirePasswordChange>
            <ChangePasswordPage />
          </RequirePasswordChange>
        } />
        <Route path="/app" element={
          <RequireAuth>
            <AppProvider>
              <AppShell />
            </AppProvider>
          </RequireAuth>
        } />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </AuthProvider>
  )
}
