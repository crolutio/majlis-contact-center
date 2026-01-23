"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Phone,
  MessageSquare,
  Mail,
  MessageCircle,
  User,
  Sparkles,
  Send,
  RefreshCw,
  Minus,
  Heart,
  ArrowUpRight,
  CheckCircle,
  Tag,
  MoreHorizontal,
  Bot,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  BookOpen,
  Lightbulb,
  Trash2,
  UserCheck,
  AlertTriangle,
  FileText,
} from "lucide-react"
import type { Conversation, Message } from "@/lib/sample-data"
import { getHandlingStatus, getHandlingLabel, getHandlingColor } from "@/lib/conversation-handling"
import { HandoverModal } from "./handover-modal"
import { knowledgeBaseSuggestions } from "@/lib/sample-data"
import { CallAnalysisDisplay } from "@/components/calls/call-analysis-display"
import { useRouter } from "next/navigation"
import type { CallAnalysisRow } from "@/lib/automation/types"
import { useConversationMessages } from "@/lib/hooks/useConversationMessages"
import type { DbMessage } from "@/lib/types"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const channelIcons = {
  voice: Phone,
  chat: MessageSquare,
  email: Mail,
  whatsapp: MessageCircle,
}

interface ConversationPanelProps {
  conversation: Conversation | null
  onOpenDrawer: () => void
  onDelete?: (conversationId: string) => void
}

export function ConversationPanel({ conversation, onOpenDrawer, onDelete }: ConversationPanelProps) {
  const [message, setMessage] = useState("")
  const [handoverOpen, setHandoverOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [callAnalysis, setCallAnalysis] = useState<CallAnalysisRow | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const router = useRouter()
  
  // Demo agent ID - replace with real agent ID from context/store
  const agentId = "00000000-0000-0000-0000-000000000001" // TODO: Get from auth context

  // Use realtime hook for messages
  const { messages: dbMessages, send: sendMessage } = useConversationMessages({
    conversationId: conversation?.id ?? null,
    agentId,
    source: (conversation?.metadata?.source as 'banking' | 'default') || 'default',
    channel: conversation?.channel,
  })

  // Convert DbMessage to Message format for rendering
  const convertDbMessageToMessage = (msg: DbMessage): Message => {
    const isAgent = msg.sender_type === "agent"
    const isInternal = isAgent && msg.is_internal
    const isAI = msg.sender_type === "ai"

    const messageType = msg.sender_type === "customer"
      ? "customer"
      : isAI
        ? "ai"
        : isInternal
          ? "agent"
          : "agent"

    return {
      id: msg.id,
      type: messageType,
      content: msg.content,
      timestamp: new Date(msg.created_at),
      sentiment: undefined, // Can be added if available in DB
      confidence: undefined,
      isTranscript: false,
    }
  }

  // Use real messages from DB if available, otherwise fall back to conversation.messages
  const messages = conversation?.id && dbMessages.length > 0
    ? dbMessages.map(convertDbMessageToMessage)
    : conversation?.messages || []
  
  // Check if conversation is AI-handled (messages should be blocked)
  const isAIHandled = conversation && getHandlingStatus(conversation) === 'ai-handled'

  // Fetch call analysis for voice conversations
  useEffect(() => {
    if (conversation?.channel === 'voice' && conversation?.id) {
      setLoadingAnalysis(true)
      fetch(`/api/calls/analysis?conversation_id=${conversation.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.items && data.items.length > 0) {
            setCallAnalysis(data.items[0]) // Get most recent analysis
          }
        })
        .catch((e) => {
          console.error("Failed to fetch call analysis:", e)
        })
        .finally(() => {
          setLoadingAnalysis(false)
        })
    } else {
      setCallAnalysis(null)
    }
  }, [conversation?.id, conversation?.channel])

  const handleDelete = async () => {
    if (!conversation || !onDelete) return;
    
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      onDelete(conversation.id);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }
  const [aiSuggestion] = useState(
    "I understand this is frustrating, and I sincerely apologize for the inconvenience. Our engineering team has identified the issue and is actively working on restoring service. I can confirm your account will receive a service credit for the downtime. Would you like me to set up a direct escalation path for updates?",
  )

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No conversation selected</h3>
          <p className="text-sm text-muted-foreground/70">Select a conversation from the list to start</p>
        </div>
      </div>
    )
  }

  const channelKey = conversation.channel && channelIcons[conversation.channel] ? conversation.channel : "chat"
  const ChannelIcon = channelIcons[channelKey]

  const formatTime = (date: Date | string) => {
    // Handle both Date objects and date strings (from API)
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    // Check if date is valid
    if (!dateObj || isNaN(dateObj.getTime())) {
      return 'Just now'
    }
    
    return dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const renderMessage = (msg: Message) => {
    if (msg.type === "system") {
      return (
        <div key={msg.id} className="flex justify-center my-3">
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{msg.content}</span>
        </div>
      )
    }

    const isCustomer = msg.type === "customer"
    const isAI = msg.type === "ai"

    return (
      <div key={msg.id} className={cn("flex gap-3 mb-4", !isCustomer && "flex-row-reverse")}>
        <Avatar className="h-8 w-8 flex-shrink-0">
          {isCustomer ? (
            <>
              <AvatarImage src={conversation.customer.avatar || "/placeholder.svg"} alt={conversation.customer.name} />
              <AvatarFallback>
                {conversation.customer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </>
          ) : (
            <>
              <AvatarFallback className={isAI ? "bg-primary" : "bg-muted"}>
                {isAI ? <Bot className="h-4 w-4 text-primary-foreground" /> : <User className="h-4 w-4" />}
              </AvatarFallback>
            </>
          )}
        </Avatar>

        <div className={cn("flex-1 max-w-[75%]", !isCustomer && "flex flex-col items-end")}>
          <div
            className={cn(
              "rounded-lg px-4 py-2.5",
              isCustomer
                ? "bg-muted text-foreground"
                : isAI
                  ? "bg-primary/10 text-foreground border border-primary/20"
                  : "bg-primary text-primary-foreground",
            )}
          >
            {isAI && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">AI Response</span>
                {msg.confidence && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
                    {Math.round(msg.confidence * 100)}% confidence
                  </Badge>
                )}
              </div>
            )}
            {msg.isTranscript && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Voice Transcript</span>
              </div>
            )}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              className="text-sm leading-relaxed whitespace-pre-wrap [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:px-2 [&_td]:px-2 [&_th]:py-1 [&_td]:py-1"
            >
              {msg.content}
            </ReactMarkdown>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{formatTime(msg.timestamp)}</span>
            {msg.sentiment && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1 py-0",
                  msg.sentiment === "positive" && "text-emerald-500",
                  msg.sentiment === "neutral" && "text-blue-500",
                  msg.sentiment === "negative" && "text-red-500",
                )}
              >
                {msg.sentiment === "positive" && <ThumbsUp className="h-2.5 w-2.5" />}
                {msg.sentiment === "neutral" && <Minus className="h-2.5 w-2.5" />}
                {msg.sentiment === "negative" && <ThumbsDown className="h-2.5 w-2.5" />}
              </Badge>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col bg-background h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={conversation.customer.avatar || "/placeholder.svg"} alt={conversation.customer.name} />
              <AvatarFallback>
                {conversation.customer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{conversation.customer?.name || 'Unknown Customer'}</h2>
                <Badge variant="outline" className="text-xs capitalize">
                  {conversation.customer?.tier || 'standard'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ChannelIcon className="h-3.5 w-3.5" />
                <span className="capitalize">{conversation.channel}</span>
                <span>•</span>
                <span>{conversation.topic}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
                  className={cn("text-xs px-2 py-1 gap-1.5", getHandlingColor(handlingStatus))}
                >
                  <HandlingIcon className="h-3.5 w-3.5" />
                  {getHandlingLabel(handlingStatus)}
                </Badge>
              );
            })()}

            {/* Sentiment Meter */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
              <span className="text-xs text-muted-foreground">Sentiment</span>
              <div className="flex items-center gap-1">
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      (conversation.sentimentScore || 0) >= 0.6 && "bg-emerald-500",
                      (conversation.sentimentScore || 0) >= 0.4 && (conversation.sentimentScore || 0) < 0.6 && "bg-amber-500",
                      (conversation.sentimentScore || 0) < 0.4 && "bg-red-500",
                    )}
                    style={{ width: `${(conversation.sentimentScore || 0) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{Math.round((conversation.sentimentScore || 0) * 100)}%</span>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={onOpenDrawer}>
              <User className="h-4 w-4 mr-1" />
              Profile
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Add to favorites</DropdownMenuItem>
                <DropdownMenuItem>Export conversation</DropdownMenuItem>
                <DropdownMenuItem>View full history</DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete conversation'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* View Summary Button */}
        {conversation && (
          <div className="px-6 pt-4 border-b">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/conversations/${conversation.id}?tab=overview`)}
              className="w-full"
            >
              <FileText className="h-4 w-4 mr-2" />
              View Full Summary & Details
            </Button>
          </div>
        )}

        {/* Call Analysis (for voice calls) - Compact view */}
        {conversation.channel === 'voice' && callAnalysis && (
          <div className="px-6 pt-4 border-b">
            <CallAnalysisDisplay analysis={callAnalysis} />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">{messages.map(renderMessage)}</div>

        {/* AI Suggestion - Hidden for AI-handled conversations */}
        {!isAIHandled && (
          <div className="px-6 pb-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Suggested Response</span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {Math.round((conversation.aiConfidence || 0) * 100)}% match
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{aiSuggestion}</p>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setMessage(aiSuggestion)}>
                  Insert
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Regenerate
                </Button>
                <Button variant="outline" size="sm">
                  <Minus className="h-3.5 w-3.5 mr-1" />
                  Shorten
                </Button>
                <Button variant="outline" size="sm">
                  <Heart className="h-3.5 w-3.5 mr-1" />
                  More empathetic
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge Base Suggestions - Hidden for AI-handled conversations */}
        {!isAIHandled && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Knowledge Base</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {knowledgeBaseSuggestions.map((kb) => (
                <Button key={kb.id} variant="outline" size="sm" className="flex-shrink-0 gap-1.5 text-xs bg-transparent">
                  <Lightbulb className="h-3 w-3" />
                  {kb.title}
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    {Math.round((kb.relevance || 0) * 100)}%
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-card">
          {isAIHandled ? (
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-200 rounded-lg">
              <Bot className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">AI is handling this conversation</p>
                <p className="text-xs text-amber-700 mt-1">
                  Messages are blocked while AI handles this conversation. Use "Human Handover" to take control.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setHandoverOpen(true)} className="border-amber-300 text-amber-700 hover:bg-amber-50 flex-shrink-0">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                Human Handover
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Textarea
                    placeholder="Type your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        const trimmed = message.trim()
                        if (trimmed && conversation?.id) {
                          sendMessage(trimmed, false).then(() => setMessage("")).catch(console.error)
                        }
                      }
                    }}
                    className="min-h-[80px] resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setHandoverOpen(true)}>
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    Human Handover
                  </Button>
                  <Button variant="outline" size="sm">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    Escalate
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Tag className="h-4 w-4 mr-1" />
                        Disposition
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>Resolved - First Contact</DropdownMenuItem>
                      <DropdownMenuItem>Resolved - Follow-up</DropdownMenuItem>
                      <DropdownMenuItem>Transferred</DropdownMenuItem>
                      <DropdownMenuItem>Escalated</DropdownMenuItem>
                      <DropdownMenuItem>No Resolution Needed</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Wrap-up
                  </Button>
                  <Button 
                    size="sm"
                    onClick={async () => {
                      const trimmed = message.trim()
                      if (!trimmed || !conversation?.id) return
                      
                      try {
                        await sendMessage(trimmed, false) // isInternal = false for regular messages
                        setMessage("")
                      } catch (error) {
                        console.error("Failed to send message:", error)
                        // Optionally show error toast
                      }
                    }}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <HandoverModal open={handoverOpen} onClose={() => setHandoverOpen(false)} conversation={conversation} />
    </>
  )
}
