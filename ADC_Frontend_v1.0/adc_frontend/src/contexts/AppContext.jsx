import React, { createContext, useContext, useState, useCallback } from 'react'
import { orgApi, domainApi, appApi } from '../api/client'
import { useAuth } from './AuthContext'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { user } = useAuth()
  const [org, setOrg] = useState(null)
  const [domains, setDomains] = useState([])
  const [applications, setApplications] = useState([])
  const [criteria, setCriteria] = useState([
    { criterion_index: 0, label: 'Business Fit',    weight_pct: 25 },
    { criterion_index: 1, label: 'Technical Health', weight_pct: 25 },
    { criterion_index: 2, label: 'Cost Efficiency',  weight_pct: 25 },
    { criterion_index: 3, label: 'Risk Level',       weight_pct: 25 },
  ])
  const [logoUrl, setLogoUrl] = useState(null)
  const [loadingData, setLoadingData] = useState(false)

  const refreshAll = useCallback(async () => {
    if (!user) return
    setLoadingData(true)
    try {
      const [orgRes, domainsRes, appsRes, critRes] = await Promise.all([
        orgApi.get(),
        domainApi.list(),
        appApi.list(),
        orgApi.getCriteria(),
      ])
      setOrg(orgRes.data)
      setDomains(domainsRes.data)
      setApplications(appsRes.data)
      if (critRes.data?.length) setCriteria(critRes.data)
      // Load logo
      try {
        const logoRes = await orgApi.getLogo()
        setLogoUrl(URL.createObjectURL(logoRes.data))
      } catch { setLogoUrl(null) }
    } catch (e) {
      console.error('Failed to load app data', e)
    } finally {
      setLoadingData(false)
    }
  }, [user])

  const refreshDomains = async () => {
    const res = await domainApi.list()
    setDomains(res.data)
  }

  const refreshApps = async () => {
    const res = await appApi.list()
    setApplications(res.data)
  }

  // Derived helpers
  const getAppsByDomain = (domainId) => applications.filter(a => a.domain_id === domainId)

  const getAvgScore = (app) => {
    if (!app?.scores || !Object.keys(app.scores).length) return null
    const vals = Object.values(app.scores).filter(v => v > 0)
    if (!vals.length) return null
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }

  const scoreBadgeClass = (score) => {
    if (!score) return 'badge-gray'
    if (score >= 3.5) return 'badge-green'
    if (score >= 2.0) return 'badge-amber'
    return 'badge-red'
  }

  const scoreLabel = (score) => {
    if (!score) return 'Unrated'
    if (score >= 3.5) return 'Adequate'
    if (score >= 2.0) return 'Review'
    return 'Critical'
  }

  const scoreColor = (score) => {
    if (!score) return '#94a3b8'
    if (score >= 3.5) return '#1D9E75'
    if (score >= 2.0) return '#BA7517'
    return '#E24B4A'
  }

  return (
    <AppContext.Provider value={{
      org, setOrg, domains, setDomains, applications, setApplications,
      criteria, setCriteria, logoUrl, setLogoUrl,
      loadingData, refreshAll, refreshDomains, refreshApps,
      getAppsByDomain, getAvgScore, scoreBadgeClass, scoreLabel, scoreColor,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppCtx = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppCtx must be used inside AppProvider')
  return ctx
}
