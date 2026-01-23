"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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

const roleLabels: Record<UserRole, string> = {
  agent: "Agent",
  call_agent: "Call Agent",
  supervisor: "Supervisor",
  admin: "Admin",
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

  if (!user) return null

  const handleRoleSwitch = (role: UserRole) => {
    switchRole(role)
    const targetRoute = getDefaultRouteForRole(role)
    if (pathname !== targetRoute) {
      router.push(targetRoute)
    }
  }

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-screen border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <Link href="/inbox" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <MajlisConnectLogo className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">Majlis Connect</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {(user.role === "back_office"
          ? backOfficeNavigation
          : user.role === "agent"
          ? chatAgentNavigation
          : user.role === "call_agent"
            ? callAgentNavigation
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
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name}
              {item.name === "Inbox" && user.role !== "agent" && (
                <Badge
                  variant="secondary"
                  className="ml-auto text-xs bg-sidebar-primary text-sidebar-primary-foreground"
                >
                  12
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Menu */}
      <div className="p-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback>
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", roleColors[user.role])}>
                  {roleLabels[user.role]}
                </Badge>
              </div>
              <ChevronDown className="w-4 h-4 text-sidebar-foreground/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" side="top">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleRoleSwitch("agent")} className="capitalize">
              <Badge variant="outline" className={cn("mr-2", roleColors.agent)}>
                A
              </Badge>
              Agent
              {user.role === "agent" && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRoleSwitch("call_agent")} className="capitalize">
              <Badge variant="outline" className={cn("mr-2", roleColors.call_agent)}>
                C
              </Badge>
              Call Agent
              {user.role === "call_agent" && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
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
              Admin
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
