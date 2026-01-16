"use client"

/**
 * Agent status is managed in local state only (UI-only).
 * The /api/agents/status route has been removed as part of the FastAPI-only backend migration.
 * Status dropdown changes UI appearance but does not persist to database.
 * Queue counts are static demo values.
 */

import { useState, useEffect } from "react"
import { VoiceAgentDesktop } from "@/components/voice-agent-desktop"
import { ChatAgentDesktop } from "@/components/chat-agent-desktop"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, MessageSquare, Loader2 } from "lucide-react"

type Mode = "voice" | "chat" | null

export default function AgentDesktopPage() {
  const { user } = useAuth()
  const role = user?.role
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(null)
  const [agentStatus, setAgentStatus] = useState<"ready" | "busy" | "break" | "offline">("ready")
  const [autoAccept, setAutoAccept] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  // Static demo values for queue counts
  const [callsInQueue] = useState(0)
  const [chatsInQueue] = useState(1)

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      router.push("/login")
      return
    }

    // Only agents can access agent desktop views
    // This page redirects agents to their specific view
    if (role === "agent") {
      // For demo: redirect to chat-agent. In production, this would be based on agent assignment
      router.push("/chat-agent")
      return
    }

    // Non-agents should not access agent desktop - redirect to inbox
    router.push("/inbox")
    return
  }, [user, role, router])

  // Handle status changes
  const handleStatusChange = (newStatus: "ready" | "busy" | "break" | "offline") => {
    // Update local state only (UI-only, no API call)
    setAgentStatus(newStatus)
  }

  // Handle auto-accept toggle
  const handleAutoAcceptToggle = () => {
    setAutoAccept(!autoAccept)
    // TODO: Update auto-accept preference in database/user settings
  }

  // Handle ending call/chat
  const handleEndCall = () => {
    setMode(null)
    setAgentStatus("ready")
  }

  const handleCloseChat = () => {
    setMode(null)
    setAgentStatus("ready")
  }

  // Handle switching between modes
  const handleSwitchToChat = () => {
    setMode("chat")
  }

  const handleSwitchToVoice = () => {
    setMode("voice")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show mode selection if no mode is active
  if (!mode) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Agent Desktop</CardTitle>
              <CardDescription>Select a mode to start handling customer interactions</CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Voice Mode Card */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setMode("voice")}>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Voice Calls</CardTitle>
                    <CardDescription>Handle incoming and outgoing phone calls</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Calls in Queue</span>
                    <Badge variant="outline">{callsInQueue}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={agentStatus === "ready" ? "default" : "secondary"}>
                      {agentStatus === "ready" ? "Ready" : agentStatus}
                    </Badge>
                  </div>
                  <Button className="w-full" onClick={() => setMode("voice")}>
                    <Phone className="w-4 h-4 mr-2" />
                    Start Voice Mode
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Chat Mode Card */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setMode("chat")}>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Digital Channels</CardTitle>
                    <CardDescription>WhatsApp, Chat, Email, and more</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Chats in Queue</span>
                    <Badge variant="outline">{chatsInQueue}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={agentStatus === "ready" ? "default" : "secondary"}>
                      {agentStatus === "ready" ? "Ready" : agentStatus}
                    </Badge>
                  </div>
                  <Button className="w-full" onClick={() => setMode("chat")}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Start Chat Mode
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Render the appropriate desktop based on mode
  if (mode === "voice") {
    return (
      <VoiceAgentDesktop
        onEndCall={handleEndCall}
        onSwitchToChat={handleSwitchToChat}
        agentStatus={agentStatus}
        onStatusChange={handleStatusChange}
        autoAccept={autoAccept}
        onAutoAcceptToggle={handleAutoAcceptToggle}
        callsInQueue={callsInQueue}
        chatsInQueue={chatsInQueue}
      />
    )
  }

  if (mode === "chat") {
    return (
      <ChatAgentDesktop
        onCloseChat={handleCloseChat}
        onSwitchToVoice={handleSwitchToVoice}
        agentStatus={agentStatus}
        onStatusChange={handleStatusChange}
        autoAccept={autoAccept}
        onAutoAcceptToggle={handleAutoAcceptToggle}
      />
    )
  }

  return null
}

