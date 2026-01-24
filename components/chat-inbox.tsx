"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Instagram, Loader2 } from "lucide-react"
import { cn, formatConversationTime } from "@/lib/utils"
import { useAgentInbox } from "@/lib/hooks/useAgentInbox"
import { useAuth } from "@/contexts/auth-context"

const getChannelIcon = (channel: string) => {
  const normalizedChannel = channel?.toLowerCase() || 'chat'
  switch (normalizedChannel) {
    case "whatsapp":
      return <MessageCircle className="w-4 h-4 text-green-600" />
    case "instagram":
      return <Instagram className="w-4 h-4 text-pink-600" />
    case "webchat":
    case "chat":
      return <MessageCircle className="w-4 h-4 text-blue-600" />
    default:
      return <MessageCircle className="w-4 h-4" />
  }
}

const getChannelBg = (channel: string) => {
  const normalizedChannel = channel?.toLowerCase() || 'chat'
  switch (normalizedChannel) {
    case "whatsapp":
      return "bg-green-500/10"
    case "instagram":
      return "bg-pink-500/10"
    case "webchat":
    case "chat":
      return "bg-blue-500/10"
    default:
      return "bg-muted"
  }
}

interface ChatInboxProps {
  activeConversationId: string | number
  onConversationSelect: (id: string) => void
  embedded?: boolean
}

export function ChatInbox({ activeConversationId, onConversationSelect, embedded = false }: ChatInboxProps) {
  const { user } = useAuth()
  const agentId = useMemo(() => user?.id || null, [user?.id])
  const { conversations, isLoading, error } = useAgentInbox(agentId)
  const handleConversationClick = (id: string) => {
    onConversationSelect(id)
  }

  // Embedded mode renders only the scrollable list (so parent can provide its own header/container)
  if (embedded) {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      )
    }

    return (
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex items-center justify-center p-4">
            <p className="text-sm text-muted-foreground">No conversations</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleConversationClick(conv.id)}
              className={cn(
                "w-full text-left p-4 border-b border-border hover:bg-muted/50 transition-colors",
                (activeConversationId === conv.id || String(activeConversationId) === conv.id) && "bg-primary/5 border-l-4 border-l-primary",
              )}
            >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  getChannelBg(conv.channel),
                )}
              >
                {getChannelIcon(conv.channel)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm text-foreground truncate">{conv.customerName}</p>
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-black border-primary/20">
                    {formatConversationTime(conv.lastMessageTime) || 'Unknown'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
              </div>
            </div>
          </button>
        ))
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="w-80 border-r border-border bg-muted/30 flex flex-col">
        <div className="bg-card border-b border-border px-4 py-3">
          <h2 className="font-semibold text-sm text-foreground">Omni-channel Inbox</h2>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-80 border-r border-border bg-muted/30 flex flex-col">
        <div className="bg-card border-b border-border px-4 py-3">
          <h2 className="font-semibold text-sm text-foreground">Omni-channel Inbox</h2>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-r border-border bg-muted/30 flex flex-col">
      <div className="bg-card border-b border-border px-4 py-3">
        <h2 className="font-semibold text-sm text-foreground">Omni-channel Inbox</h2>
        <p className="text-xs text-muted-foreground">{conversations.length} active conversations</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex items-center justify-center p-4">
            <p className="text-sm text-muted-foreground">No conversations</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleConversationClick(conv.id)}
              className={cn(
                "w-full text-left p-4 border-b border-border hover:bg-muted/50 transition-colors",
                (activeConversationId === conv.id || String(activeConversationId) === conv.id) && "bg-primary/5 border-l-4 border-l-primary",
              )}
            >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  getChannelBg(conv.channel),
                )}
              >
                {getChannelIcon(conv.channel)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm text-foreground truncate">{conv.customerName}</p>
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-black border-primary/20">
                    {formatConversationTime(conv.lastMessageTime) || 'Unknown'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
              </div>
            </div>
          </button>
        )))}
      </div>
    </div>
  )
}
