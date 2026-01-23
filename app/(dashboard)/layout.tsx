"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { canAccessRoute, getDefaultRouteForRole } from "@/lib/permissions"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Agent pages (chat-agent, call-agent) should render full-screen without sidebar/header
  const isAgentPage = pathname?.startsWith("/chat-agent") || pathname?.startsWith("/call-agent")

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (!user || !pathname) return
    if (!canAccessRoute(user.role, pathname)) {
      router.push(getDefaultRouteForRole(user.role))
    }
  }, [user, pathname, router])

  if (!isAuthenticated) {
    return null
  }

  // Render agent pages full-screen (they have their own headers/layouts)
  if (isAgentPage) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    )
  }

  // Render other pages with sidebar and header
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-auto bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  )
}
