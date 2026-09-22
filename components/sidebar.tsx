"use client"

import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Users, Calendar, FileText, Inbox, CalendarDays, BarChart3, Shield,
  Settings, ChevronLeft, ChevronRight, LayoutDashboard, Menu, X,
  Megaphone, ShieldCheck,
} from "lucide-react"

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  badge?: boolean
}

interface SidebarProps {
  activeView: string
  onViewChange: (view: string) => void
  pendingLeaves: number
  isCollapsed: boolean
  onToggleCollapse: () => void
  navItems?: NavItem[]
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'attendance', label: 'Attendance', icon: Calendar },
  { id: 'slips', label: 'Salary Slips', icon: FileText },
  { id: 'leave-requests', label: 'Leave Requests', icon: Inbox, badge: true },
  { id: 'holidays', label: 'Holidays', icon: CalendarDays },
  { id: 'notices', label: 'Notices', icon: Megaphone },
  { id: 'policies', label: 'Policies', icon: ShieldCheck },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'audit-log', label: 'Audit Log', icon: Shield },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ activeView, onViewChange, pendingLeaves, isCollapsed, onToggleCollapse, navItems }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const items = navItems || ADMIN_NAV_ITEMS

  const navContent = (
    <nav className="flex-1 px-3 py-2 space-y-1">
      {items.map(item => {
        const isActive = activeView === item.id
        const Icon = item.icon
        return (
          <button
            key={item.id}
            onClick={() => {
              onViewChange(item.id)
              setMobileOpen(false)
            }}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
              transition-all duration-200 cursor-pointer relative group
              ${isActive
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                : 'text-muted-foreground hover:bg-[hsl(var(--sidebar-hover))] hover:text-foreground'
              }
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? item.label : undefined}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
            {!isCollapsed && (
              <>
                <span className="truncate">{item.label}</span>
                {item.badge && pendingLeaves > 0 && (
                  <span className={`ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full ${
                    isActive ? 'bg-white/25 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {pendingLeaves}
                  </span>
                )}
              </>
            )}
            {isCollapsed && item.badge && pendingLeaves > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[9px] font-bold bg-amber-500 text-white rounded-full flex items-center justify-center">
                {pendingLeaves}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-card border border-border shadow-lg cursor-pointer"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        glass-sidebar fixed top-0 left-0 h-screen z-40 flex flex-col
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-[72px]' : 'w-[260px]'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 h-16 border-b border-[hsl(var(--sidebar-border))] ${isCollapsed ? 'justify-center px-2' : ''}`}>
          <img src="/favicon.png" alt="OviTech" className="h-9 w-9 rounded-xl flex-shrink-0 object-contain" />
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground truncate">OviTech</h1>
              <p className="text-[10px] text-muted-foreground truncate">Salary Portal</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-3">
          {navContent}
        </div>

        {/* Collapse toggle — desktop only */}
        <div className="hidden lg:flex items-center justify-center p-3 border-t border-[hsl(var(--sidebar-border))]">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-hover))] transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  )
}
