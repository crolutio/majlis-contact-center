"use client"

/**
 * Agent status is managed in local state only (UI-only).
 * The /api/agents/status route has been removed as part of the FastAPI-only backend migration.
 * Status dropdown changes UI appearance but does not persist to database.
 * Queue counts are static demo values.
 */

import { useState, useEffect } from "react"
import { VoiceAgentDesktop } from "@/components/voice-agent-desktop"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function CallAgentPage() {
  const { user } = useAuth()
  const role = user?.role
  const router = useRouter()
  const [agentStatus, setAgentStatus] = useState<"ready" | "busy" | "break" | "offline">("ready")
  const [autoAccept, setAutoAccept] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  // Static demo values for queue counts
  const [callsInQueue] = useState(0)
  const [chatsInQueue] = useState(1)

  useEffect(() => {
    // Check if user is authenticated and has call agent permissions
    if (!user) {
      router.push("/login")
      return
    }

    // Only call agents (and agents for demo) can access this page
    if (role !== "call_agent" && role !== "agent") {
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

  const handleEndCall = () => {
    // When ending call, stay on call agent page (don't navigate away)
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
    <VoiceAgentDesktop
      onEndCall={handleEndCall}
      agentStatus={agentStatus}
      onStatusChange={handleStatusChange}
      autoAccept={autoAccept}
      onAutoAcceptToggle={handleAutoAcceptToggle}
      callsInQueue={callsInQueue}
      chatsInQueue={chatsInQueue}
    />
  )
}

