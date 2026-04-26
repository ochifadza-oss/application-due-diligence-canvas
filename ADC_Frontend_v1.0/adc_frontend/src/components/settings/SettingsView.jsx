import React, { useState, useEffect, useRef } from 'react'
import { Save, Plus, X, Upload, UserPlus, Download } from 'lucide-react'
import { orgApi, domainApi, userApi, marketplaceApi } from '../../api/client'
import { useAppCtx } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { Spinner, FormRow, useToast, ConfirmDialog, Modal } from '../shared/UI'

function Section({ title, children }) {
  return (
    <div className="card p-5 mb-5">
      <div className="section-title">{title}</div>
      {children}
    </div>
  )
}

const DEFAULT_LANDING_FORM = {
  app_name: '',
  company: {
    legal_name: '',
    registration_number: '',
    vat_number: '',
    csd_number: '',
  },
  links: {
    app_url: '',
    login_url: '',
    website_url: '',
    about_url: '',
    case_studies_url: '',
    blog_url: '',
    documentation_url: '',
    user_guide_url: '',
    status_url: '',
    privacy_url: '',
    terms_url: '',
    cookie_url: '',
    popia_url: '',
    info_email: '',
    support_email: '',
    sales_email: '',
    careers_email: '',
    press_email: '',
    phone: '',
  },
  plans: {
    starter: {
      code: 'starter',
      label: 'Starter',
      monthly_price: '',
      annual_price: '',
      cta_label: '',
    },
    professional: {
      code: 'professional',
      label: 'Professional',
      monthly_price: '',
      annual_price: '',
      cta_label: '',
    },
    enterprise: {
      code: 'enterprise',
      label: 'Enterprise',
      monthly_price: '',
      annual_price: '',
      cta_label: '',
    },
  },
}

function normalizeLandingConfig(input = {}) {
  return {
    app_name: input.app_name || '',
    company: {
      ...DEFAULT_LANDING_FORM.company,
      ...(input.company || {}),
    },
    links: {
      ...DEFAULT_LANDING_FORM.links,
      ...(input.links || {}),
    },
    plans: {
      starter: {
        ...DEFAULT_LANDING_FORM.plans.starter,
        ...((input.plans || {}).starter || {}),
      },
      professional: {
        ...DEFAULT_LANDING_FORM.plans.professional,
        ...((input.plans || {}).professional || {}),
      },
      enterprise: {
        ...DEFAULT_LANDING_FORM.plans.enterprise,
        ...((input.plans || {}).enterprise || {}),
      },
    },
  }
}

export default function SettingsView() {
  const { org, setOrg, domains, setDomains, criteria, setCriteria, logoUrl, setLogoUrl } = useAppCtx()
  const { isAdmin } = useAuth()
  const toast = useToast()
  const fileRef = useRef()

  const [orgForm, setOrgForm] = useState({ name: '', department: '', analyst: '', reference_no: '', financial_year: '', currency_symbol: 'R' })
  const [savingOrg, setSavingOrg] = useState(false)
  const [savingCrit, setSavingCrit] = useState(false)
  const [localCriteria, setLocalCriteria] = useState([])
  const [domainInput, setDomainInput] = useState('')
  const [addingDomain, setAddingDomain] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [users, setUsers] = useState([])
  const [newUserOpen, setNewUserOpen] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', full_name: '', role: 'analyst' })
  const [savingUser, setSavingUser] = useState(false)
  const [landingForm, setLandingForm] = useState(DEFAULT_LANDING_FORM)
  const [loadingLanding, setLoadingLanding] = useState(false)
  const [savingLanding, setSavingLanding] = useState(false)

  useEffect(() => {
    if (org) {
      setOrgForm({
        name: org.name || '',
        department: org.department || '',
        analyst: org.analyst || '',
        reference_no: org.reference_no || '',
        financial_year: org.financial_year || '',
        currency_symbol: org.currency_symbol || 'R',
      })
    }
  }, [org])

  useEffect(() => {
    setLocalCriteria(criteria.map(c => ({ ...c })))
  }, [criteria])

  useEffect(() => {
    if (isAdmin) {
      userApi.list().then(r => setUsers(r.data)).catch(() => {})

      setLoadingLanding(true)
      marketplaceApi.getLandingConfigAdmin()
        .then((r) => setLandingForm(normalizeLandingConfig(r.data)))
        .catch(() => toast('Failed to load landing configuration', 'error'))
        .finally(() => setLoadingLanding(false))
    }
  }, [isAdmin, toast])

  const saveOrg = async () => {
    setSavingOrg(true)
    try {
      const { data } = await orgApi.update(orgForm)
      setOrg(data)
      toast('Settings saved')
    } catch { toast('Failed to save settings', 'error') }
    finally { setSavingOrg(false) }
  }

  const saveCriteria = async () => {
    setSavingCrit(true)
    try {
      await orgApi.updateCriteria(localCriteria)
      setCriteria(localCriteria)
      toast('Criteria updated')
    } catch { toast('Failed to update criteria', 'error') }
    finally { setSavingCrit(false) }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) return toast('Only PNG or JPEG allowed', 'error')
    if (file.size > 2 * 1024 * 1024) return toast('Logo must be under 2MB', 'error')
    setUploadingLogo(true)
    try {
      await orgApi.uploadLogo(file)
      const res = await orgApi.getLogo()
      setLogoUrl(URL.createObjectURL(res.data))
      toast('Logo uploaded')
    } catch { toast('Logo upload failed', 'error') }
    finally { setUploadingLogo(false) }
  }

  const addDomain = async () => {
    if (!domainInput.trim()) return
    setAddingDomain(true)
    try {
      const { data } = await domainApi.create({ name: domainInput.trim(), sort_order: domains.length })
      setDomains(prev => [...prev, data])
      setDomainInput('')
      toast('Domain added')
    } catch { toast('Failed to add domain', 'error') }
    finally { setAddingDomain(false) }
  }

  const deleteDomain = async () => {
    try {
      await domainApi.delete(deleteTarget.id)
      setDomains(prev => prev.filter(d => d.id !== deleteTarget.id))
      toast('Domain removed')
      setDeleteTarget(null)
    } catch { toast('Failed to delete domain', 'error') }
  }

  const renameDomain = async (domain, newName) => {
    try {
      await domainApi.update(domain.id, { name: newName })
      setDomains(prev => prev.map(d => d.id === domain.id ? { ...d, name: newName } : d))
    } catch { toast('Failed to rename domain', 'error') }
  }

  const createUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password || !newUser.full_name) {
      return toast('All fields are required', 'error')
    }
    setSavingUser(true)
    try {
      const { data } = await userApi.create(newUser)
      setUsers(prev => [...prev, data])
      toast('User created')
      setNewUserOpen(false)
      setNewUser({ username: '', email: '', password: '', full_name: '', role: 'analyst' })
    } catch (e) { toast(e.response?.data?.detail || 'Failed to create user', 'error') }
    finally { setSavingUser(false) }
  }

  const updateLandingCompany = (field, value) => {
    setLandingForm(prev => ({
      ...prev,
      company: {
        ...prev.company,
        [field]: value,
      },
    }))
  }

  const updateLandingLink = (field, value) => {
    setLandingForm(prev => ({
      ...prev,
      links: {
        ...prev.links,
        [field]: value,
      },
    }))
  }

  const updateLandingPlan = (planCode, field, value) => {
    setLandingForm(prev => ({
      ...prev,
      plans: {
        ...prev.plans,
        [planCode]: {
          ...prev.plans[planCode],
          [field]: value,
        },
      },
    }))
  }

  const saveLandingConfig = async () => {
    setSavingLanding(true)
    try {
      const payload = {
        app_name: landingForm.app_name,
        company: landingForm.company,
        links: landingForm.links,
        plans: landingForm.plans,
      }
      const { data } = await marketplaceApi.updateLandingConfigAdmin(payload)
      setLandingForm(normalizeLandingConfig(data))
      toast('Landing content settings saved')
    } catch (e) {
      toast(e.response?.data?.detail || 'Failed to save landing settings', 'error')
    } finally {
      setSavingLanding(false)
    }
  }

  return (
    <div className="screen-shell">
      <h1 className="text-[14px] font-semibold text-[#222] mb-4">Settings & Administration</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* LEFT COLUMN */}
        <div>
          {/* Institution Details */}
          <Section title="Institution Details">
            <FormRow label="Organisation Name">
              <input className="input" value={orgForm.name} onChange={e => setOrgForm(f => ({ ...f, name: e.target.value }))} />
            </FormRow>
            <FormRow label="Department / Directorate">
              <input className="input" placeholder="e.g. ICT Directorate" value={orgForm.department} onChange={e => setOrgForm(f => ({ ...f, department: e.target.value }))} />
            </FormRow>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Analyst Name">
                <input className="input" placeholder="Full name" value={orgForm.analyst} onChange={e => setOrgForm(f => ({ ...f, analyst: e.target.value }))} />
              </FormRow>
              <FormRow label="Reference No.">
                <input className="input" placeholder="ADC-2026-001" value={orgForm.reference_no} onChange={e => setOrgForm(f => ({ ...f, reference_no: e.target.value }))} />
              </FormRow>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Financial Year">
                <input className="input" placeholder="2025/2026" value={orgForm.financial_year} onChange={e => setOrgForm(f => ({ ...f, financial_year: e.target.value }))} />
              </FormRow>
              <FormRow label="Currency Symbol">
                <input className="input" placeholder="R" value={orgForm.currency_symbol} onChange={e => setOrgForm(f => ({ ...f, currency_symbol: e.target.value }))} />
              </FormRow>
            </div>
            <button className="btn btn-primary" onClick={saveOrg} disabled={savingOrg}>
              {savingOrg ? <Spinner size={14} /> : <Save size={14} />} Save Settings
            </button>
          </Section>

          {/* Logo */}
          <Section title="Organisation Logo">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                {logoUrl
                  ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  : <span className="text-xs text-gray-400 text-center px-2">No logo</span>
                }
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">PNG or JPEG, maximum 2MB. Displayed in header and on all exports.</p>
                <button className="btn btn-sm" onClick={() => fileRef.current?.click()} disabled={uploadingLogo}>
                  {uploadingLogo ? <Spinner size={13} /> : <Upload size={13} />} Upload Logo
                </button>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoUpload} />
              </div>
            </div>
          </Section>

          {/* Scoring Criteria */}
          <Section title="Rating Criteria">
            <p className="text-xs text-gray-400 mb-3">Labels shown on all scoring panels. Weights must total 100%.</p>
            <div className="space-y-2 mb-3">
              {localCriteria.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-5 flex-shrink-0">{i + 1}</span>
                  <input className="input flex-1" value={c.label}
                    onChange={e => setLocalCriteria(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                  <input type="number" min="0" max="100" className="input w-20 flex-shrink-0" value={c.weight_pct}
                    onChange={e => setLocalCriteria(prev => prev.map((x, j) => j === i ? { ...x, weight_pct: Number(e.target.value) } : x))} />
                  <span className="text-xs text-gray-400 flex-shrink-0">%</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Total: <span className={localCriteria.reduce((s, c) => s + Number(c.weight_pct), 0) === 100 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                  {localCriteria.reduce((s, c) => s + Number(c.weight_pct), 0)}%
                </span>
              </span>
              <button className="btn btn-primary btn-sm" onClick={saveCriteria} disabled={savingCrit}>
                {savingCrit ? <Spinner size={13} /> : <Save size={13} />} Save Criteria
              </button>
            </div>
          </Section>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Domain Management */}
          <Section title="Domain Management">
            <div className="space-y-1.5 mb-3 max-h-64 overflow-y-auto">
              {domains.map(d => (
                <div key={d.id} className="flex items-center gap-2">
                  <input
                    className="input flex-1 text-sm"
                    defaultValue={d.name}
                    onBlur={e => e.target.value !== d.name && renameDomain(d, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                  />
                  <button className="btn btn-sm text-gray-400 hover:text-red-500 flex-shrink-0"
                    onClick={() => setDeleteTarget(d)} title="Remove domain">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="New domain name"
                value={domainInput} onChange={e => setDomainInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addDomain()} />
              <button className="btn btn-primary btn-sm flex-shrink-0" onClick={addDomain} disabled={addingDomain || !domainInput.trim()}>
                {addingDomain ? <Spinner size={13} /> : <Plus size={13} />} Add
              </button>
            </div>
          </Section>

          {/* User Management */}
          {isAdmin && (
            <Section title="User Management">
              <div className="space-y-1.5 mb-3">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-gray-800">{u.full_name}</span>
                      <span className="text-xs text-gray-400 ml-2">{u.email}</span>
                    </div>
                    <span className="badge-gray text-xs capitalize">{u.role?.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-sm" onClick={() => setNewUserOpen(true)}>
                <UserPlus size={13} /> Add User
              </button>
            </Section>
          )}

          {isAdmin && (
            <Section title="Public Landing Content">
              <p className="text-xs text-gray-500 mb-3">
                These values drive the public landing page via the marketplace landing-config API.
              </p>
              {loadingLanding ? (
                <div className="py-5"><Spinner size={16} /></div>
              ) : (
                <>
                  <FormRow label="App Name">
                    <input
                      className="input"
                      value={landingForm.app_name}
                      onChange={e => setLandingForm(prev => ({ ...prev, app_name: e.target.value }))}
                    />
                  </FormRow>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormRow label="Company Legal Name">
                      <input className="input" value={landingForm.company.legal_name} onChange={e => updateLandingCompany('legal_name', e.target.value)} />
                    </FormRow>
                    <FormRow label="Company Website">
                      <input className="input" value={landingForm.links.website_url} onChange={e => updateLandingLink('website_url', e.target.value)} />
                    </FormRow>
                    <FormRow label="Registration Number">
                      <input className="input" value={landingForm.company.registration_number} onChange={e => updateLandingCompany('registration_number', e.target.value)} />
                    </FormRow>
                    <FormRow label="VAT Number">
                      <input className="input" value={landingForm.company.vat_number} onChange={e => updateLandingCompany('vat_number', e.target.value)} />
                    </FormRow>
                    <FormRow label="CSD Number">
                      <input className="input" value={landingForm.company.csd_number} onChange={e => updateLandingCompany('csd_number', e.target.value)} />
                    </FormRow>
                    <FormRow label="Contact Phone">
                      <input className="input" value={landingForm.links.phone} onChange={e => updateLandingLink('phone', e.target.value)} />
                    </FormRow>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormRow label="App URL">
                      <input className="input" value={landingForm.links.app_url} onChange={e => updateLandingLink('app_url', e.target.value)} />
                    </FormRow>
                    <FormRow label="Login URL">
                      <input className="input" value={landingForm.links.login_url} onChange={e => updateLandingLink('login_url', e.target.value)} />
                    </FormRow>
                    <FormRow label="Info Email">
                      <input className="input" value={landingForm.links.info_email} onChange={e => updateLandingLink('info_email', e.target.value)} />
                    </FormRow>
                    <FormRow label="Support Email">
                      <input className="input" value={landingForm.links.support_email} onChange={e => updateLandingLink('support_email', e.target.value)} />
                    </FormRow>
                    <FormRow label="Sales Email">
                      <input className="input" value={landingForm.links.sales_email} onChange={e => updateLandingLink('sales_email', e.target.value)} />
                    </FormRow>
                    <FormRow label="Careers Email">
                      <input className="input" value={landingForm.links.careers_email} onChange={e => updateLandingLink('careers_email', e.target.value)} />
                    </FormRow>
                    <FormRow label="Press Email">
                      <input className="input" value={landingForm.links.press_email} onChange={e => updateLandingLink('press_email', e.target.value)} />
                    </FormRow>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormRow label="About URL">
                      <input className="input" value={landingForm.links.about_url} onChange={e => updateLandingLink('about_url', e.target.value)} />
                    </FormRow>
                    <FormRow label="Case Studies URL">
                      <input className="input" value={landingForm.links.case_studies_url} onChange={e => updateLandingLink('case_studies_url', e.target.value)} />
                    </FormRow>
                    <FormRow label="Blog URL">
                      <input className="input" value={landingForm.links.blog_url} onChange={e => updateLandingLink('blog_url', e.target.value)} />
                    </FormRow>
                    <FormRow label="Documentation URL">
                      <input className="input" value={landingForm.links.documentation_url} onChange={e => updateLandingLink('documentation_url', e.target.value)} />
                    </FormRow>
                    <FormRow label="User Guide URL">
                      <input className="input" value={landingForm.links.user_guide_url} onChange={e => updateLandingLink('user_guide_url', e.target.value)} />
                    </FormRow>
                    <FormRow label="Status URL">
                      <input className="input" value={landingForm.links.status_url} onChange={e => updateLandingLink('status_url', e.target.value)} />
                    </FormRow>
                    <FormRow label="Privacy URL">
                      <input className="input" value={landingForm.links.privacy_url} onChange={e => updateLandingLink('privacy_url', e.target.value)} />
                    </FormRow>
                    <FormRow label="Terms URL">
                      <input className="input" value={landingForm.links.terms_url} onChange={e => updateLandingLink('terms_url', e.target.value)} />
                    </FormRow>
                    <FormRow label="Cookie URL">
                      <input className="input" value={landingForm.links.cookie_url} onChange={e => updateLandingLink('cookie_url', e.target.value)} />
                    </FormRow>
                    <FormRow label="POPIA URL">
                      <input className="input" value={landingForm.links.popia_url} onChange={e => updateLandingLink('popia_url', e.target.value)} />
                    </FormRow>
                  </div>

                  <div className="space-y-3 mt-3">
                    {['starter', 'professional', 'enterprise'].map((planCode) => (
                      <div key={planCode} className="border border-gray-100 rounded-lg p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{planCode} plan</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <FormRow label="Label">
                            <input className="input" value={landingForm.plans[planCode].label} onChange={e => updateLandingPlan(planCode, 'label', e.target.value)} />
                          </FormRow>
                          <FormRow label="Monthly Price">
                            <input className="input" value={landingForm.plans[planCode].monthly_price} onChange={e => updateLandingPlan(planCode, 'monthly_price', e.target.value)} />
                          </FormRow>
                          <FormRow label="Annual Price">
                            <input className="input" value={landingForm.plans[planCode].annual_price} onChange={e => updateLandingPlan(planCode, 'annual_price', e.target.value)} />
                          </FormRow>
                          <FormRow label="CTA Label">
                            <input className="input" value={landingForm.plans[planCode].cta_label} onChange={e => updateLandingPlan(planCode, 'cta_label', e.target.value)} />
                          </FormRow>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="btn btn-primary" onClick={saveLandingConfig} disabled={savingLanding}>
                    {savingLanding ? <Spinner size={14} /> : <Save size={14} />} Save Landing Content
                  </button>
                </>
              )}
            </Section>
          )}

          {/* Data Management */}
          <Section title="Data Management">
            <p className="text-xs text-gray-500 mb-3">Export your full data for backup, or import a previously exported JSON file.</p>
            <div className="flex gap-2 flex-wrap">
              <button className="btn" onClick={async () => {
                try {
                  const { data } = await (await import('../../api/client')).reportApi.summary()
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'adc-export.json'; a.click()
                  toast('Data exported')
                } catch { toast('Export failed', 'error') }
              }}>
                <Download size={13} /> Export JSON
              </button>
            </div>
          </Section>
        </div>
      </div>

      {/* Modals */}
      <ConfirmDialog open={!!deleteTarget} danger
        title="Remove Domain"
        message={`Remove "${deleteTarget?.name}"? Applications in this domain will also be removed.`}
        onConfirm={deleteDomain}
        onCancel={() => setDeleteTarget(null)}
      />

      <Modal open={newUserOpen} onClose={() => setNewUserOpen(false)} title="Add User" size="sm">
        <FormRow label="Full Name" required>
          <input className="input" value={newUser.full_name} onChange={e => setNewUser(f => ({ ...f, full_name: e.target.value }))} />
        </FormRow>
        <FormRow label="Username" required>
          <input className="input" value={newUser.username} onChange={e => setNewUser(f => ({ ...f, username: e.target.value }))} />
        </FormRow>
        <FormRow label="Email" required>
          <input type="email" className="input" value={newUser.email} onChange={e => setNewUser(f => ({ ...f, email: e.target.value }))} />
        </FormRow>
        <FormRow label="Password" required>
          <input type="password" className="input" value={newUser.password} onChange={e => setNewUser(f => ({ ...f, password: e.target.value }))} />
        </FormRow>
        <FormRow label="Role">
          <select className="input" value={newUser.role} onChange={e => setNewUser(f => ({ ...f, role: e.target.value }))}>
            {['administrator', 'senior_analyst', 'analyst', 'reviewer', 'client_stakeholder'].map(r => (
              <option key={r} value={r}>{r.replace('_', ' ')}</option>
            ))}
          </select>
        </FormRow>
        <div className="flex gap-2 justify-end pt-2">
          <button className="btn" onClick={() => setNewUserOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={createUser} disabled={savingUser}>
            {savingUser ? <Spinner size={14} /> : <UserPlus size={14} />} Create User
          </button>
        </div>
      </Modal>
    </div>
  )
}
