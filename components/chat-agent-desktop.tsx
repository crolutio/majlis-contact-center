"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  User,
  MessageSquare,
  Video,
  MonitorPlay,
  Send,
  Search,
  Copy,
  Check,
  Users,
  Package,
  Sparkles,
  X,
  ChevronDown,
  Phone,
} from "lucide-react"
// Role switching is handled via the left sidebar user menu (demo)
import { ChatInbox } from "@/components/chat-inbox"
import { SentimentIndicator } from "@/components/sentiment-indicator"
import { ChatWrapUpView } from "@/components/chat-wrap-up"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useConversationMessages } from "@/lib/hooks/useConversationMessages"
import type { DbMessage } from "@/lib/types"
import { MessageContent } from "@/components/ui/message-content"
import { useAuth } from "@/contexts/auth-context"
import { getConversationDetails, getConversationMessages, type ConversationDetails } from "@/lib/chat-queries"
import { Loader2 } from "lucide-react"

interface ChatAgentDesktopProps {
  onCloseChat: () => void
  onSwitchToVoice?: () => void // Chat agents shouldn't switch to voice, but keeping for compatibility
  agentStatus: "ready" | "busy" | "break" | "offline"
  onStatusChange: (status: "ready" | "busy" | "break" | "offline") => void
  autoAccept: boolean
  onAutoAcceptToggle: () => void
}

export function ChatAgentDesktop({
  onCloseChat,
  onSwitchToVoice,
  agentStatus,
  onStatusChange,
  autoAccept,
  onAutoAcceptToggle,
}: ChatAgentDesktopProps) {
  const { user } = useAuth()
  // Default to demo agent ID if not authenticated
  const agentId = user?.id || "e66fa391-28b5-44ec-b3a9-4397c2f2d225"

  // Use UUID strings for conversation IDs
  const [activeConversationId, setActiveConversationId] = useState<string>("")
  const [activeConvo, setActiveConvo] = useState<ConversationDetails | null>(null)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [conversationError, setConversationError] = useState<string | null>(null)

  // Fetch conversation details when activeConversationId changes
  useEffect(() => {
    async function loadConversation() {
      if (!activeConversationId) {
        setActiveConvo(null)
        return
      }

      setIsLoadingConversation(true)
      setConversationError(null)

      try {
        const [details, messages] = await Promise.all([
          getConversationDetails(activeConversationId),
          getConversationMessages(activeConversationId),
        ])

        if (details) {
          details.messages = messages
          setActiveConvo(details)
        } else {
          setConversationError("Conversation not found")
          setActiveConvo(null)
        }
      } catch (err) {
        console.error("Failed to load conversation:", err)
        setConversationError("Failed to load conversation")
        setActiveConvo(null)
      } finally {
        setIsLoadingConversation(false)
      }
    }

    loadConversation()
  }, [activeConversationId])

  // Use realtime hook for message updates
  const { messages: dbMessages, send: sendMessage } = useConversationMessages({
    conversationId: activeConversationId || null,
    agentId,
  })

  // Convert DbMessage format to display format
  const convertDbMessageToDisplay = (msg: DbMessage) => {
    const isAgent = msg.sender_type === "agent"
    const isAI = msg.sender_type === "ai"
    const isSystem = msg.sender_type === "system"
    const isWhisper = isAgent && msg.is_internal
    const timestamp = new Date(msg.created_at).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })

    return {
      id: msg.id,
      sender: isWhisper
        ? "whisper"
        : isAI
          ? "ai"
          : isAgent
            ? "agent"
            : isSystem
              ? "system"
              : "customer",
      type: "text" as const,
      content: msg.content,
      timestamp,
    }
  }

  // Use realtime messages if available, otherwise use loaded messages from conversation
  const messages = dbMessages.length > 0
    ? dbMessages.map(convertDbMessageToDisplay)
    : (activeConvo?.messages || [])

  const [message, setMessage] = useState("")
  const [whisperMode, setWhisperMode] = useState(false)
  const [copiedDNI, setCopiedDNI] = useState(false)
  const [copiedProductId, setCopiedProductId] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [showTransferDropdown, setShowTransferDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showVideoRequest, setShowVideoRequest] = useState(false)
  const [showScreenShareRequest, setShowScreenShareRequest] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showWrapUp, setShowWrapUp] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const statusDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setShowVideoRequest(false)
    setShowScreenShareRequest(false)
  }, [activeConversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTransferDropdown(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const copyToClipboard = (text: string, type: "dni" | "product") => {
    navigator.clipboard.writeText(text)
    if (type === "dni") {
      setCopiedDNI(true)
      setTimeout(() => setCopiedDNI(false), 2000)
    } else {
      setCopiedProductId(true)
      setTimeout(() => setCopiedProductId(false), 2000)
    }
  }

  const handleSendMessage = async () => {
    const trimmed = message.trim()
    if (!trimmed) return

    // If we have a real conversation ID, use the API
    if (activeConversationId) {
      try {
        await sendMessage(trimmed, whisperMode)
        setMessage("") // clear input
      } catch (error) {
        console.error("Failed to send message:", error)
        // Optionally show error toast
      }
    } else {
      // If no conversation ID, can't send message
      console.warn("Cannot send message: no active conversation")
      setMessage("")
    }
  }

  const handleSmartReplyClick = (reply: string) => {
    setMessage(reply)
    // Small delay to ensure state update, then send
    setTimeout(() => handleSendMessage(), 100)
  }

  const handleVideoRequest = () => {
    setShowVideoRequest(true)
    // In demo mode, we just show the UI state. In production, this would send a system message via API.
  }

  const handleScreenShareRequest = () => {
    setShowScreenShareRequest(true)
    // In demo mode, we just show the UI state. In production, this would send a system message via API.
  }

  const handleTransfer = (department: string) => {
    // In demo mode, we just show the UI state. In production, this would send a system message via API.
    setShowTransferDropdown(false)
  }

  const handleEndChat = () => {
    setShowWrapUp(true)
  }

  if (showWrapUp) {
    if (!activeConvo) {
      return null
    }
    return (
      <ChatWrapUpView
        onComplete={onCloseChat}
        conversationData={{
          customerName: activeConvo.customerName,
          channel: activeConvo.channel,
          loyaltyStatus: activeConvo.loyaltyStatus || "Standard Banking",
        }}
      />
    )
  }

  const suggestedSolutions = [
    {
      title: "Order #ORD-2024-1547 Status",
      description: "In transit - Expected delivery Dec 24",
      type: "order",
    },
    {
      title: "Router Configuration Guide",
      description: "Step-by-step setup for Premium Fiber",
      type: "kb",
    },
    {
      title: "Premium Fiber Troubleshooting",
      description: "Common issues and solutions",
      type: "kb",
    },
  ]

    return (
      <div className="h-full min-h-0 flex flex-col bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-30">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Digital Channels Desktop</h1>
                <p className="text-sm text-muted-foreground">Omnichannel conversation hub</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {onSwitchToVoice && (
                <Button variant="outline" onClick={onSwitchToVoice} size="sm">
                  <Phone className="w-4 h-4 mr-2" />
                  Switch to Voice
                </Button>
              )}
              <Button variant="outline" onClick={handleEndChat} size="sm">
                <X className="w-4 h-4 mr-2" />
                End Chat & Wrap Up
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Status Dropdown */}
            <div className="relative" ref={statusDropdownRef}>
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
              >
                <span className="text-sm">
                  {agentStatus === "ready" && "🟢 Ready"}
                  {agentStatus === "busy" && "🔴 Busy"}
                  {agentStatus === "break" && "🟡 Break"}
                  {agentStatus === "offline" && "⚪ Offline"}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              {showStatusDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50"
                >
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onStatusChange("ready")
                        setShowStatusDropdown(false)
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors",
                        agentStatus === "ready" && "bg-muted"
                      )}
                    >
                      <span>🟢</span> Ready
                    </button>
                    <button
                      onClick={() => {
                        onStatusChange("busy")
                        setShowStatusDropdown(false)
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors",
                        agentStatus === "busy" && "bg-muted"
                      )}
                    >
                      <span>🔴</span> Busy
                    </button>
                    <button
                      onClick={() => {
                        onStatusChange("break")
                        setShowStatusDropdown(false)
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors",
                        agentStatus === "break" && "bg-muted"
                      )}
                    >
                      <span>🟡</span> Break
                    </button>
                    <button
                      onClick={() => {
                        onStatusChange("offline")
                        setShowStatusDropdown(false)
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors",
                        agentStatus === "offline" && "bg-muted"
                      )}
                    >
                      <span>⚪</span> Offline
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            <Badge variant="outline" className="gap-2 bg-background">
              <span className="text-xs text-muted-foreground">Chats in Queue:</span>
              <span className="font-bold text-foreground">3</span>
            </Badge>

            {onAutoAcceptToggle && (
              <button
                onClick={onAutoAcceptToggle}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
              >
                Auto-accept: <Badge variant={autoAccept ? "default" : "secondary"}>{autoAccept ? "ON" : "OFF"}</Badge>
              </button>
            )}

            {/* Transfer Button in Header */}
            <div className="relative ml-auto" ref={dropdownRef}>
              <Button variant="outline" size="sm" onClick={() => setShowTransferDropdown(!showTransferDropdown)}>
                <Users className="w-4 h-4 mr-2" />
                Transfer to Dept/Supervisor
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              {showTransferDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-50"
                >
                  <div className="py-1">
                    <button
                      onClick={() => handleTransfer("Sales Department")}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      Sales Department
                    </button>
                    <button
                      onClick={() => handleTransfer("Billing Department")}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      Billing Department
                    </button>
                    <button
                      onClick={() => handleTransfer("Technical Support")}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      Technical Support
                    </button>
                    <button
                      onClick={() => handleTransfer("Supervisor")}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors border-t border-border"
                    >
                      Supervisor
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: Omni-channel inbox (KB is accessible from the global left sidebar) */}
        <ChatInbox 
          activeConversationId={activeConversationId || ""} 
          onConversationSelect={(id) => setActiveConversationId(id)} 
        />

        {/* Column 2: Interaction Hub */}
        <div className="flex-1 flex flex-col border-r border-border min-h-0">
          {/* Chat Header */}
          <div className="bg-card border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isLoadingConversation ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading conversation...</span>
                  </div>
                ) : conversationError ? (
                  <div className="text-sm text-destructive">{conversationError}</div>
                ) : activeConvo ? (
                  <>
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        activeConvo.channelColor === "green" && "bg-green-500/10",
                        activeConvo.channelColor === "pink" && "bg-pink-500/10",
                        activeConvo.channelColor === "blue" && "bg-blue-500/10",
                      )}
                    >
                      <MessageSquare
                        className={cn(
                          "w-5 h-5",
                          activeConvo.channelColor === "green" && "text-green-600",
                          activeConvo.channelColor === "pink" && "text-pink-600",
                          activeConvo.channelColor === "blue" && "text-blue-600",
                        )}
                      />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">{activeConvo.customerName}</h2>
                      <p className="text-xs text-muted-foreground capitalize">{activeConvo.channel} • Active</p>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Select a conversation to start</div>
                )}
              </div>
              {/* Transfer button also available in chat header for convenience */}
              <div className="relative">
                <Button variant="outline" size="sm" onClick={() => setShowTransferDropdown(!showTransferDropdown)}>
                  <Users className="w-4 h-4 mr-2" />
                  Transfer to Dept/Supervisor
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto bg-muted/10">
            <div className="p-6 space-y-4">
              {/* Show video/screen share request overflows */}
              <AnimatePresence>
                {showVideoRequest && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center"
                  >
                    <Video className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-blue-600">Waiting for customer to accept video call...</p>
                  </motion.div>
                )}
                {showScreenShareRequest && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 text-center"
                  >
                    <MonitorPlay className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-purple-600">Initializing secure co-browsing session...</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex",
                    msg.sender === "customer"
                      ? "justify-start"
                      : msg.sender === "system"
                        ? "justify-center"
                        : "justify-end",
                  )}
                >
                  {msg.sender === "system" ? (
                    <div className="bg-muted/50 px-4 py-2 rounded-full text-xs text-muted-foreground border border-border">
                      {msg.content}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "max-w-[70%]",
                        msg.sender === "agent" || msg.sender === "whisper" || msg.sender === "ai"
                          ? "items-start"
                          : "items-end",
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2.5",
                          msg.sender === "agent" && "bg-muted text-foreground rounded-tl-sm",
                          msg.sender === "ai" && "bg-primary/10 text-foreground rounded-tl-sm border border-primary/20",
                          msg.sender === "whisper" &&
                            "bg-amber-500/10 text-foreground rounded-tl-sm border-2 border-amber-500/30",
                          msg.sender === "customer" && "bg-primary text-primary-foreground rounded-tr-sm",
                        )}
                      >
                        {msg.type === "text" ? (
                          <MessageContent content={msg.content} />
                        ) : (
                          <div className="space-y-2">
                            <img
                              src={msg.content || "/placeholder.svg"}
                              alt="Sent media"
                              className="rounded-lg max-w-full h-auto"
                            />
                            {(msg as any).caption && (
                              <p className="text-sm leading-relaxed">{(msg as any).caption}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <p className="text-xs text-muted-foreground">{msg.timestamp}</p>
                        {msg.sender === "customer" && (
                          <Badge variant="outline" className="text-xs">
                            Customer
                          </Badge>
                        )}
                        {msg.sender === "agent" && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                        {msg.sender === "ai" && (
                          <Badge variant="outline" className="text-xs">
                            AI
                          </Badge>
                        )}
                        {msg.sender === "whisper" && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                            Internal Note
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {isTyping && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                  <div className="max-w-[70%]">
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5">
                      <div className="flex gap-1">
                        <div
                          className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <div
                          className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <div
                          className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 px-1">Customer is typing...</p>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Visual Support Tools */}
          <div className="bg-card border-t border-b border-border px-6 py-3">
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent"
                onClick={handleVideoRequest}
                disabled={showVideoRequest}
              >
                <Video className="w-4 h-4 mr-2" />
                Request Video Call
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent"
                onClick={handleScreenShareRequest}
                disabled={showScreenShareRequest}
              >
                <MonitorPlay className="w-4 h-4 mr-2" />
                Start Screen Sharing (Co-browsing)
              </Button>
              <Button variant="destructive" size="sm" className="ml-auto" onClick={handleEndChat}>
                End Chat
              </Button>
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-card px-6 py-4">
            <div className="mb-3 flex gap-2 flex-wrap">
              {activeConvo?.smartReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSmartReplyClick(reply)}
                  className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3" />
                  {reply}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whisperMode}
                      onChange={(e) => setWhisperMode(e.target.checked)}
                      className="rounded"
                    />
                    Internal Note (Whisper Mode)
                  </label>
                </div>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder={whisperMode ? "Add internal note (customer won't see this)..." : "Type your message..."}
                  className={`resize-none ${whisperMode ? "bg-amber-500/5 border-amber-500/30" : ""}`}
                  rows={3}
                />
              </div>
              <Button size="lg" className="mb-px" onClick={handleSendMessage}>
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </div>

        <div className="w-96 overflow-y-auto bg-muted/30 p-4 space-y-4">
          {/* Identity & History */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Identity & History</CardTitle>
                  <CardDescription className="text-xs">Verified customer</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Full Name</p>
                  <p className="font-semibold text-sm text-foreground">{activeConvo?.customerName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">DNI / ID</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">{activeConvo?.dni || "N/A"}</p>
                    {activeConvo?.dni && (
                      <button
                        onClick={() => copyToClipboard(activeConvo.dni!.replace(/\./g, ""), "dni")}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedDNI ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Loyalty Status</p>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                    {activeConvo?.loyaltyStatus || "Standard"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground">Previous Interactions</h4>
                <div className="relative space-y-3 pl-4">
                  <div className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />
                  {activeConvo?.history.map((item, idx) => (
                    <div key={idx} className="relative">
                      <div
                        className={cn(
                          "absolute -left-[13px] top-1 w-2 h-2 rounded-full border-2 border-background",
                          idx === 0 ? "bg-primary" : "bg-muted-foreground",
                        )}
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-foreground">
                            {item.date} • {item.channel}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products & CRM */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Products & CRM</CardTitle>
                  <CardDescription className="text-xs">Active subscriptions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeConvo?.products.map((product, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
                      <button
                        onClick={() => copyToClipboard(product.id, "product")}
                        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                        title="Copy Product ID"
                      >
                        {copiedProductId ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Renewal: {product.renewal}</p>
                  </div>
                  <Badge
                    className={cn(
                      "text-xs flex-shrink-0",
                      product.status === "Active"
                        ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/10",
                    )}
                  >
                    {product.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Sentiment Analysis */}
          <SentimentIndicator />

          {/* Knowledge Base & AI Assistant */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Knowledge Base & AI</CardTitle>
                  <CardDescription className="text-xs">Smart solutions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search knowledge base..."
                  className="pl-9 bg-background"
                />
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground">Suggested Solutions</h4>
                {suggestedSolutions.map((solution, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left p-2.5 bg-muted/50 hover:bg-muted rounded-lg border border-border transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground mb-0.5">{solution.title}</p>
                    <p className="text-xs text-muted-foreground">{solution.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
