import React from 'react'
import { useAppCtx } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { LogOut } from 'lucide-react'

const TABS = [
  { key: 'canvas',   label: 'Canvas' },
  { key: 'pricing',  label: 'Pricing' },
  { key: 'tor',      label: 'Terms of Reference' },
  { key: 'queries',  label: 'Queries' },
  { key: 'reports',  label: 'Reports' },
  { key: 'settings', label: 'Settings' },
]

export default function TopBar({ activeTab, onTabChange }) {
  const { org, logoUrl } = useAppCtx()
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-[#31567c] bg-[linear-gradient(120deg,#0d2a49_0%,#183f66_52%,#224f77_100%)] shadow-[0_10px_24px_rgba(19,36,58,0.26)]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-5 py-2.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-md border border-[#3a618a] overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#16395d] cursor-pointer"
              title="Upload logo in Settings"
            >
              {logoUrl
                ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                : <span className="text-[9px] font-semibold text-[#9fb3c8]">Logo</span>
              }
            </div>

            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-[#eaf2fc] truncate leading-tight">
                {org?.name || 'My Organisation'}
              </div>
              <div className="text-[12px] text-[#d2deec] truncate leading-tight">
                {org?.department ? `${org.department} - ` : ''}Application Due Diligence Canvas
              </div>
            </div>
          </div>

          <div className="lg:ml-auto flex items-center gap-2 min-w-0">
            <nav className="flex gap-1 p-1.5 bg-[#102f52]/80 rounded-xl border border-[#375c82] overflow-x-auto scrollbar-none backdrop-blur-sm">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={`flex-shrink-0 px-3 py-1.5 text-[13px] rounded-md transition-colors whitespace-nowrap border-b-2 ${
                    activeTab === tab.key
                      ? 'text-white font-semibold border-white bg-[#1f4d78]/35'
                      : 'text-[#d5e3f2] border-transparent hover:text-white hover:bg-[#1f4d78]/35'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg border border-[#4d6d8e] bg-[#14385d]/70 text-white hover:bg-[#1f4f7d] transition-colors whitespace-nowrap"
              title="Log out"
            >
              <LogOut size={12} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>

        <div className="hidden sm:flex items-center justify-end pt-1.5">
          <span className="rounded-md border border-[#9ab0c4] bg-[#d6e6f3] px-2.5 py-0.5 text-[12px] text-[#1f3144] shadow-[0_4px_10px_rgba(22,41,64,0.22)] truncate max-w-full">
            {user?.full_name || 'User'} | {(user?.role || 'user').replace('_', ' ')}
          </span>
        </div>
      </div>
    </header>
  )
}
