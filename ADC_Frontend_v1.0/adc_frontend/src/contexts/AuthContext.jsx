import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('adc_access_token')
    if (!token) { setLoading(false); return }
    try {
      const { data } = await authApi.me()
      setUser(data)
    } catch {
      localStorage.removeItem('adc_access_token')
      localStorage.removeItem('adc_refresh_token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email, password) => {
    const { data } = await authApi.login(email, password)
    localStorage.setItem('adc_access_token', data.access_token)
    localStorage.setItem('adc_refresh_token', data.refresh_token)
    setUser({
      id: data.user_id,
      full_name: data.full_name,
      role: data.role,
      org_id: data.org_id,
      terms_accepted: data.terms_accepted,
      must_change_password: data.must_change_password,
    })
    return data
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
  }

  const isAdmin = user?.role === 'administrator'
  const isSenior = ['administrator', 'senior_analyst'].includes(user?.role)
  const canEdit = ['administrator', 'senior_analyst', 'analyst'].includes(user?.role)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, loadUser, isAdmin, isSenior, canEdit }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
