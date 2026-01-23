"use client"

import { useState } from "react"
import { Search, Bell, Filter, Clock, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

const channels = [
  { id: "all", label: "All Channels" },
  { id: "voice", label: "Voice" },
  { id: "chat", label: "Chat" },
  { id: "email", label: "Email" },
  { id: "whatsapp", label: "WhatsApp" },
]

const notifications = [
  {
    id: "1",
    title: "SLA Breach Warning",
    message: "3 conversations approaching SLA limit",
    time: "2 min ago",
    type: "warning",
  },
  {
    id: "2",
    title: "Escalation Request",
    message: "Agent Sarah needs supervisor assistance",
    time: "5 min ago",
    type: "urgent",
  },
  {
    id: "3",
    title: "New Handover",
    message: "AI transferred conversation #1847 to you",
    time: "12 min ago",
    type: "info",
  },
]

export function AppHeader() {
  const { user } = useAuth()
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["all"])
  const [slaStatus] = useState({ healthy: 45, warning: 8, breached: 2 })

  // If user not loaded yet, render nothing (layout handles auth redirect)
  if (!user) return null

  const toggleChannel = (channelId: string) => {
    if (channelId === "all") {
      setSelectedChannels(["all"])
    } else {
      const newSelection = selectedChannels.filter((c) => c !== "all")
      if (newSelection.includes(channelId)) {
        setSelectedChannels(newSelection.filter((c) => c !== channelId))
      } else {
        setSelectedChannels([...newSelection, channelId])
      }
    }
  }

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations, customers, tickets..."
            className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>

        {/* Channel Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <Filter className="h-4 w-4" />
              Channels
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter by Channel</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {channels.map((channel) => (
              <DropdownMenuCheckboxItem
                key={channel.id}
                checked={selectedChannels.includes(channel.id)}
                onCheckedChange={() => toggleChannel(channel.id)}
              >
                {channel.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* SLA Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">SLA:</span>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
              {slaStatus.healthy}
            </Badge>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
              {slaStatus.warning}
            </Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
              {slaStatus.breached}
            </Badge>
          </div>
        </div>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                {notifications.length}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="p-3 border-b">
              <h4 className="font-semibold text-sm">Notifications</h4>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((notification) => (
                <div key={notification.id} className="p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                        notification.type === "warning" && "bg-amber-500",
                        notification.type === "urgent" && "bg-red-500",
                        notification.type === "info" && "bg-blue-500",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 border-t">
              <Button variant="ghost" className="w-full text-sm">
                View all notifications
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}
