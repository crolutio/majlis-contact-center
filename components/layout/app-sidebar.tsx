"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import {
  Inbox,
  BarChart3,
  Settings,
  PhoneCall,
  Award,
  Users,
  ChevronDown,
  LogOut,
  FileText,
  BookOpen,
  Zap,
  Bell,
  Monitor,
  MessageSquare,
  GitBranch,
  PlugZap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth, type UserRole } from "@/contexts/auth-context"
import { canAccessRoute, getDefaultRouteForRole } from "@/lib/permissions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MajlisConnectLogo } from "@/components/brand/majlis-connect-logo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"

// Base navigation items (for supervisors, admins, analysts)
const baseNavigation = [
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "Live Console", href: "/live-console", icon: PhoneCall },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Quality", href: "/quality", icon: Award },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Knowledge", href: "/knowledge", icon: BookOpen },
  { name: "Workflows", href: "/workflows", icon: Zap },
  { name: "Agent Builder", href: "/agent-builder", icon: GitBranch },
  { name: "Integrations", href: "/integrations", icon: PlugZap },
  { name: "Automation", href: "/automation", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
]

// Agent-specific navigation
const chatAgentNavigation = [
  { name: "Chat Agent", href: "/chat-agent", icon: MessageSquare },
  { name: "Call Agent", href: "/call-agent", icon: PhoneCall },
  { name: "Knowledge", href: "/knowledge", icon: BookOpen },
]

const callAgentNavigation = [
  { name: "Call Agent", href: "/call-agent", icon: PhoneCall },
  { name: "Chat Agent", href: "/chat-agent", icon: MessageSquare },
  { name: "Knowledge", href: "/knowledge", icon: BookOpen },
]

const backOfficeNavigation = [
  { name: "Back Office", href: "/back-office", icon: Monitor },
  { name: "Knowledge", href: "/knowledge", icon: BookOpen },
]

// Admin/Agent Builder navigation (limited access)
const adminNavigation = [
  { name: "Agent Builder", href: "/agent-builder", icon: GitBranch },
  { name: "Knowledge", href: "/knowledge", icon: BookOpen },
  { name: "Integrations", href: "/integrations", icon: PlugZap },
  { name: "Settings", href: "/settings", icon: Settings },
]

const roleLabels: Record<UserRole, string> = {
  agent: "Agent",
  call_agent: "Call Agent",
  supervisor: "Supervisor",
  admin: "Agent Builder",
  analyst: "Analyst",
  back_office: "Back Office",
}

const roleColors: Record<UserRole, string> = {
  agent: "bg-blue-500/10 text-blue-600",
  call_agent: "bg-blue-500/10 text-blue-600",
  supervisor: "bg-amber-500/10 text-amber-600",
  admin: "bg-red-500/10 text-red-600",
  analyst: "bg-emerald-500/10 text-emerald-600",
  back_office: "bg-slate-500/10 text-slate-600",
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, switchRole, logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  // Auto-collapse after 3 seconds of no interaction, but not if dropdown is open
  useEffect(() => {
    if (isDropdownOpen) return

    const timer = setTimeout(() => {
      setIsCollapsed(true)
    }, 1500)

    return () => clearTimeout(timer)
  }, [isDropdownOpen])

  const effectiveCollapsed = (isCollapsed && !isHovered) && !isDropdownOpen && !isUserMenuOpen

  if (!user) return null

  const handleRoleSwitch = (role: UserRole) => {
    switchRole(role)
    const targetRoute = getDefaultRouteForRole(role)
    if (pathname !== targetRoute) {
      router.push(targetRoute)
    }
  }

  return (
    <aside
      className={`bg-sidebar text-sidebar-foreground flex flex-col h-screen border-r border-sidebar-border transition-all duration-200 ease-in-out overflow-x-hidden ${
        effectiveCollapsed ? 'w-[84px]' : 'w-64'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className="h-16 flex items-center border-b border-sidebar-border">
        <div className="flex items-center w-full gap-1 pr-2">
          <Link
            href={user.role === "admin" ? "/agent-builder" : user.role === "agent" ? "/chat-agent" : user.role === "call_agent" ? "/call-agent" : user.role === "back_office" ? "/back-office" : "/inbox"}
            className="flex items-center min-w-0 flex-1"
          >
            <div className="w-[84px] flex items-center justify-center flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <MajlisConnectLogo className="w-6 h-6 text-sidebar-primary-foreground" />
              </div>
            </div>
            <div className="flex flex-col items-start text-left py-2">
              <span
                className={cn(
                  "font-semibold text-lg transition-all duration-200 ease-in-out overflow-hidden whitespace-nowrap truncate pr-2",
                  effectiveCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                )}
              >
                Majlis
              </span>
              <span
                className={cn(
                  "font-semibold text-lg transition-all duration-200 ease-in-out overflow-hidden whitespace-nowrap truncate pr-2",
                  effectiveCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                )}
              >
                Connect
              </span>
            </div>
          </Link>
          <div
            className={cn(
              "ml-auto flex-shrink-0 transition-all duration-200 ease-in-out overflow-hidden",
              effectiveCollapsed ? "w-0 opacity-0" : "w-10 opacity-100"
            )}
          >
            <ThemeToggle onOpenChange={setIsDropdownOpen} />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden min-w-0">
        {(user.role === "back_office"
          ? backOfficeNavigation
          : user.role === "agent"
          ? chatAgentNavigation
          : user.role === "call_agent"
            ? callAgentNavigation
            : user.role === "admin"
              ? adminNavigation
              : baseNavigation).map((item) => {
          const isActive = pathname.startsWith(item.href)
          const hasAccess = canAccessRoute(user.role, item.href)
          const Icon = item.icon

          if (!hasAccess) return null

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center w-full py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 overflow-hidden min-w-0",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                "justify-start flex-nowrap"
              )}
              title={effectiveCollapsed ? item.name : undefined}
            >
              <div className="w-[84px] flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div
                className={cn(
                  "flex items-center min-w-0 transition-opacity duration-150 ease-in-out overflow-hidden",
                  effectiveCollapsed ? "w-0 opacity-0" : "w-auto opacity-100 flex-1 pr-3 gap-2"
                )}
              >
                <span className="whitespace-nowrap truncate">{item.name}</span>
                {item.name === "Inbox" && user.role !== "agent" && (
                  <Badge
                    variant="secondary"
                    className="ml-auto text-xs bg-sidebar-primary text-sidebar-primary-foreground transition-colors duration-200"
                  >
                    12
                  </Badge>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* User Menu */}
      <div className="py-3 border-t border-sidebar-border">
        <DropdownMenu open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors duration-200 overflow-hidden min-w-0"
              )}
            >
              <div className="w-[84px] flex items-center justify-center flex-shrink-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                  <AvatarFallback>
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div
                className={cn(
                  "flex items-center min-w-0 transition-opacity duration-150 overflow-hidden",
                  effectiveCollapsed ? "w-0 opacity-0" : "w-auto opacity-100 flex-1 pr-3 gap-2"
                )}
              >
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-medium truncate transition-all duration-200 whitespace-nowrap">{user.name}</p>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 transition-all duration-200", roleColors[user.role])}>
                    {roleLabels[user.role]}
                  </Badge>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-sidebar-foreground/50 transition-transform duration-200", isUserMenuOpen ? "rotate-0" : "rotate-180")} />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            alignOffset={0}
            className="w-56"
            side="top"
            sideOffset={12}
          >
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleRoleSwitch("agent")} className="capitalize">
              <Badge variant="outline" className={cn("mr-2", roleColors.agent)}>
                A
              </Badge>
              Agent
              {user.role === "agent" && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRoleSwitch("supervisor")} className="capitalize">
              <Badge variant="outline" className={cn("mr-2", roleColors.supervisor)}>
                S
              </Badge>
              Supervisor
              {user.role === "supervisor" && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRoleSwitch("admin")} className="capitalize">
              <Badge variant="outline" className={cn("mr-2", roleColors.admin)}>
                A
              </Badge>
              Agent Builder
              {user.role === "admin" && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRoleSwitch("analyst")} className="capitalize h-10">
              <Badge variant="outline" className={cn("mr-2", roleColors.analyst)}>
                A
              </Badge>
              Analyst
              {user.role === "analyst" && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRoleSwitch("back_office")} className="capitalize">
              <Badge variant="outline" className={cn("mr-2", roleColors.back_office)}>
                B
              </Badge>
              Back Office
              {user.role === "back_office" && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
