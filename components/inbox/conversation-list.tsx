"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { cn, formatConversationTime } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  Phone,
  MessageSquare,
  Mail,
  MessageCircle,
  Clock,
  AlertTriangle,
  Search,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Bot,
  User,
  UserCheck,
  ExternalLink,
} from "lucide-react"
import type { Conversation } from "@/lib/sample-data"
import { getHandlingStatus, getHandlingLabel, getHandlingColor } from "@/lib/conversation-handling"

const channelIcons = {
  voice: Phone,
  chat: MessageSquare,
  email: Mail,
  whatsapp: MessageCircle,
}

const channelColors = {
  voice: "bg-blue-500",
  chat: "bg-emerald-500",
  email: "bg-amber-500",
  whatsapp: "bg-green-500",
}

const sentimentIcons = {
  positive: ThumbsUp,
  neutral: Minus,
  negative: ThumbsDown,
}

const sentimentColors = {
  positive: "text-emerald-500",
  neutral: "text-blue-500",
  negative: "text-red-500",
}

interface ConversationListProps {
  conversations: Conversation[]
  selectedId?: string
  onSelect: (conversation: Conversation) => void
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  const router = useRouter()

  const handleConversationClick = (e: React.MouseEvent, conversation: Conversation) => {
    // Allow Ctrl/Cmd+Click to open detail page in new tab
    if (e.ctrlKey || e.metaKey) {
      window.open(`/conversations/${conversation.id}?tab=messages`, '_blank')
      return
    }
    // Regular click: just select the conversation (don't navigate)
    // The onSelect callback will update the right panel
    e.preventDefault()
    e.stopPropagation()
  }

  const parseTimestamp = (value: Date | string | null | undefined) => {
    if (!value) return null
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const getConversationTime = (conversation: Conversation) => {
    const lastMessageTime = parseTimestamp(conversation.lastMessageTime)
    if (lastMessageTime) return lastMessageTime
    const messageTimes = (conversation.messages || [])
      .map((msg) => parseTimestamp(msg.timestamp))
      .filter((ts): ts is Date => !!ts)
    if (messageTimes.length > 0) {
      return new Date(Math.max(...messageTimes.map((ts) => ts.getTime())))
    }
    return parseTimestamp(conversation.startTime)
  }

  const formatTime = (date: Date | string | null | undefined) => {
    const formatted = formatConversationTime(date)
    return formatted || 'Unknown time'
  }

  return (
    <div className="w-80 border-r border-border bg-card flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search conversations..." className="pl-9 bg-muted/50 border-0" />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => {
          const channelKey = conversation.channel && channelIcons[conversation.channel] ? conversation.channel : "chat"
          const sentimentKey =
            conversation.sentiment && sentimentIcons[conversation.sentiment] ? conversation.sentiment : "neutral"
          const ChannelIcon = channelIcons[channelKey]
          const SentimentIcon = sentimentIcons[sentimentKey]

          return (
            <button
              key={conversation.id}
              onClick={(e) => {
                // Select the conversation to show in the right panel
                onSelect(conversation)
                // Handle special cases (Ctrl/Cmd+Click for new tab)
                handleConversationClick(e, conversation)
              }}
              className={cn(
                "w-full text-left p-4 border-b border-border hover:bg-muted/50 transition-colors relative group cursor-pointer",
                selectedId === conversation.id && "bg-muted",
              )}
            >
              <div className="flex items-start gap-3">
                {/* Avatar with channel indicator */}
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={conversation.customer?.avatar || "/placeholder.svg"}
                      alt={conversation.customer?.name || 'Unknown Customer'}
                    />
                    <AvatarFallback>
                      {(conversation.customer?.name || 'Unknown')
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center",
                      channelColors[channelKey],
                    )}
                  >
                    <ChannelIcon className="h-2.5 w-2.5 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{conversation.customer?.name || 'Unknown Customer'}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(getConversationTime(conversation))}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground truncate mb-2">{conversation.lastMessage}</p>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* SLA Badge */}
                    {(() => {
                      const deadline = parseTimestamp(conversation.sla?.deadline)
                      const remaining = typeof conversation.sla?.remaining === "number"
                        ? conversation.sla.remaining
                        : deadline
                          ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 60000))
                          : null
                      return (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 gap-1",
                            conversation.sla?.status === "healthy" &&
                              "bg-emerald-500/10 text-emerald-600 border-emerald-200",
                            conversation.sla?.status === "warning" && "bg-amber-500/10 text-amber-600 border-amber-200",
                            conversation.sla?.status === "breached" && "bg-red-500/10 text-red-600 border-red-200",
                          )}
                        >
                          <Clock className="h-2.5 w-2.5" />
                          {remaining !== null ? (remaining > 0 ? `${remaining}m` : "Breached") : "N/A"}
                        </Badge>
                      )
                    })()}

                    {/* Sentiment Badge */}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                      <SentimentIcon className={cn("h-2.5 w-2.5", sentimentColors[sentimentKey])} />
                    </Badge>

                    {/* Escalation Risk */}
                    {conversation.escalationRisk && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 gap-1 bg-red-500/10 text-red-600 border-red-200"
                      >
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Risk
                      </Badge>
                    )}

                    {/* Language Badge (if not English) */}
                    {conversation.customer?.preferredLanguage !== "en" && conversation.customer?.preferredLanguage && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase">
                        {conversation.customer.preferredLanguage}
                      </Badge>
                    )}

                    {/* Priority Badge */}
                    {(conversation.priority === "urgent" || conversation.priority === "high") && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 capitalize",
                          conversation.priority === "urgent"
                            ? "bg-red-500/10 text-red-600 border-red-200"
                            : "bg-orange-500/10 text-orange-600 border-orange-200",
                        )}
                      >
                        {conversation.priority}
                      </Badge>
                    )}

                    {/* Handling Status Badge */}
                    {(() => {
                      const handlingStatus = getHandlingStatus(conversation);
                      const HandlingIcon = 
                        handlingStatus === 'ai-handled' ? Bot :
                        handlingStatus === 'human-handling-needed' ? AlertTriangle :
                        UserCheck;
                      
                      return (
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0 gap-1", getHandlingColor(handlingStatus))}
                        >
                          <HandlingIcon className="h-2.5 w-2.5" />
                          {getHandlingLabel(handlingStatus)}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              </div>
              {/* View Details indicator */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
