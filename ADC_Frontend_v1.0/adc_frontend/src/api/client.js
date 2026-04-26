import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// ── Request interceptor — attach JWT ────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adc_access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor — handle 401 with refresh ──────────────────────────
let refreshing = false
let queue = []

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      if (refreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }
      original._retry = true
      refreshing = true
      try {
        const refresh = localStorage.getItem('adc_refresh_token')
        if (!refresh) throw new Error('No refresh token')
        const { data } = await axios.post(`${BASE}/auth/refresh`, { refresh_token: refresh })
        localStorage.setItem('adc_access_token', data.access_token)
        localStorage.setItem('adc_refresh_token', data.refresh_token)
        queue.forEach(({ resolve }) => resolve(data.access_token))
        queue = []
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        queue.forEach(({ reject }) => reject(error))
        queue = []
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        refreshing = false
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  refresh: (token) => api.post('/auth/refresh', { refresh_token: token }),
  me: () => api.get('/auth/me'),
  acceptTerms: () => api.post('/auth/accept-terms', { accepted: true }),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
}

// ── Organisation ─────────────────────────────────────────────────────────────
export const orgApi = {
  get: () => api.get('/org'),
  update: (data) => api.put('/org', data),
  uploadLogo: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/org/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  getLogo: () => api.get('/org/logo', { responseType: 'blob' }),
  getCriteria: () => api.get('/org/criteria'),
  updateCriteria: (criteria) => api.put('/org/criteria', criteria),
}

// ── Domains ──────────────────────────────────────────────────────────────────
export const domainApi = {
  list: () => api.get('/domains'),
  create: (data) => api.post('/domains', data),
  update: (id, data) => api.put(`/domains/${id}`, data),
  delete: (id) => api.delete(`/domains/${id}`),
}

// ── Applications ─────────────────────────────────────────────────────────────
export const appApi = {
  list: (domainId) => api.get('/applications', { params: domainId ? { domain_id: domainId } : {} }),
  get: (id) => api.get(`/applications/${id}`),
  create: (data) => api.post('/applications', data),
  update: (id, data) => api.put(`/applications/${id}`, data),
  delete: (id) => api.delete(`/applications/${id}`),
  setScore: (id, criterionIndex, score) =>
    api.post(`/applications/${id}/scores`, { criterion_index: criterionIndex, score }),
}

// ── Pricing ───────────────────────────────────────────────────────────────────
export const pricingApi = {
  list: () => api.get('/pricing'),
  upsert: (appId, data) => api.put(`/pricing/${appId}`, data),
}

// ── Queries ───────────────────────────────────────────────────────────────────
export const queryApi = {
  list: (filters = {}) => api.get('/queries', { params: filters }),
  stats: () => api.get('/queries/stats'),
  create: (data) => api.post('/queries', data),
  update: (id, data) => api.put(`/queries/${id}`, data),
  addResponse: (id, data) => api.post(`/queries/${id}/responses`, data),
  delete: (id) => api.delete(`/queries/${id}`),
}

// ── Terms of Reference ────────────────────────────────────────────────────────
export const torApi = {
  get: () => api.get('/tor'),
  upsert: (data) => api.put('/tor', data),
}

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportApi = {
  summary: () => api.get('/reports/summary'),
  exportExcel: () => api.get('/reports/export/excel', { responseType: 'blob' }),
}

// ── AI Analysis ───────────────────────────────────────────────────────────────
export const aiApi = {
  analyse: (payload = {}) => api.post('/ai/analyse', payload),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const userApi = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
}

// ── Billing ───────────────────────────────────────────────────────────────────
export const billingApi = {
  status: () => api.get('/billing/status'),
  checkout: (tier, successUrl, cancelUrl) =>
    api.post('/billing/checkout', { tier, success_url: successUrl, cancel_url: cancelUrl }),
}

// ── Marketplace (admin landing content) ─────────────────────────────────────
export const marketplaceApi = {
  getLandingConfigAdmin: () => api.get('/marketplace/admin/landing-config'),
  updateLandingConfigAdmin: (payload) => api.put('/marketplace/admin/landing-config', payload),
}

export default api
