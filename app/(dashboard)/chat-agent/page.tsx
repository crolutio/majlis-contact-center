"use client"

/**
 * Agent status is managed in local state only (UI-only).
 * The /api/agents/status route has been removed as part of the FastAPI-only backend migration.
 * Status dropdown changes UI appearance but does not persist to database.
 */

import { useState, useEffect } from "react"
import { ChatAgentDesktop } from "@/components/chat-agent-desktop"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function ChatAgentPage() {
  const { user } = useAuth()
  const role = user?.role
  const router = useRouter()
  const [agentStatus, setAgentStatus] = useState<"ready" | "busy" | "break" | "offline">("ready")
  const [autoAccept, setAutoAccept] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated and has chat agent permissions
    if (!user) {
      router.push("/login")
      return
    }

    // Only chat agents can access this page
    if (role !== "agent") {
      router.push("/inbox")
      return
    }

    setIsLoading(false)
  }, [user, role, router])

  const handleStatusChange = (newStatus: "ready" | "busy" | "break" | "offline") => {
    // Update local state only (UI-only, no API call)
    setAgentStatus(newStatus)
  }

  const handleAutoAcceptToggle = () => {
    setAutoAccept(!autoAccept)
  }

  const handleCloseChat = () => {
    // When closing chat, stay on chat agent page (don't navigate away)
    setAgentStatus("ready")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <ChatAgentDesktop
      onCloseChat={handleCloseChat}
      agentStatus={agentStatus}
      onStatusChange={handleStatusChange}
      autoAccept={autoAccept}
      onAutoAcceptToggle={handleAutoAcceptToggle}
    />
  )
}

