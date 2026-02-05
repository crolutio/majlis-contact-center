"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Phone,
  MessageSquare,
  Mail,
  MessageCircle,
  ChevronDown,
  Filter,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react"

const channels = [
  { id: "voice", label: "Voice", icon: Phone, count: 8 },
  { id: "chat", label: "Chat", icon: MessageSquare, count: 23 },
  { id: "email", label: "Email", icon: Mail, count: 15 },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, count: 9 },
]

const priorities = [
  { id: "urgent", label: "Urgent", color: "bg-red-500" },
  { id: "high", label: "High", color: "bg-orange-500" },
  { id: "medium", label: "Medium", color: "bg-amber-500" },
  { id: "low", label: "Low", color: "bg-green-500" },
]

const sentiments = [
  { id: "positive", label: "Positive", icon: ThumbsUp, color: "text-emerald-500" },
  { id: "neutral", label: "Neutral", icon: Minus, color: "text-blue-500" },
  { id: "negative", label: "Negative", icon: ThumbsDown, color: "text-red-500" },
]



interface QueueSidebarProps {
  selectedChannels?: string[]
  onChannelsChange?: (channels: string[]) => void
  selectedPriorities?: string[]
  onPrioritiesChange?: (priorities: string[]) => void
  selectedSentiments?: string[]
  onSentimentsChange?: (sentiments: string[]) => void
  channelCounts?: {
    voice?: number
    chat?: number
    email?: number
    whatsapp?: number
  }
}

export function QueueSidebar({
  selectedChannels: externalSelectedChannels,
  onChannelsChange,
  selectedPriorities: externalSelectedPriorities,
  onPrioritiesChange,
  selectedSentiments: externalSelectedSentiments,
  onSentimentsChange,
  channelCounts,
}: QueueSidebarProps = {}) {

  const channelsWithCounts = channels.map(ch => ({
    ...ch,
    count: channelCounts?.[ch.id as keyof typeof channelCounts] ?? ch.count
  }))
  // Internal state as fallback if not controlled externally
  const [internalChannels, setInternalChannels] = useState<string[]>([])
  const [internalPriorities, setInternalPriorities] = useState<string[]>([])
  const [internalSentiments, setInternalSentiments] = useState<string[]>([])

  // Use external state if provided, otherwise use internal state
  const selectedChannels = externalSelectedChannels ?? internalChannels
  const selectedPriorities = externalSelectedPriorities ?? internalPriorities
  const selectedSentiments = externalSelectedSentiments ?? internalSentiments

  const setSelectedChannels = onChannelsChange || setInternalChannels
  const setSelectedPriorities = onPrioritiesChange || setInternalPriorities
  const setSelectedSentiments = onSentimentsChange || setInternalSentiments

  const toggleFilter = (current: string[], setter: (val: string[]) => void, value: string) => {
    if (current.includes(value)) {
      setter(current.filter((v) => v !== value))
    } else {
      setter([...current, value])
    }
  }

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full overflow-hidden">

      {/* Filters */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filters
        </div>

        {/* Channel Filter */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium py-1">
            Channel
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            {channelsWithCounts.map((channel) => (
              <div key={channel.id} className="flex items-center gap-2">
                <Checkbox
                  id={`channel-${channel.id}`}
                  checked={selectedChannels.includes(channel.id)}
                  onCheckedChange={() => toggleFilter(selectedChannels, setSelectedChannels, channel.id)}
                />
                <Label
                  htmlFor={`channel-${channel.id}`}
                  className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                >
                  {(() => {
                    const Icon = channel.icon
                    return <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  })()}
                  {channel.label}
                  <span className="ml-auto text-muted-foreground text-xs">{channel.count}</span>
                </Label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Priority Filter */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium py-1">
            Priority
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            {priorities.map((priority) => (
              <div key={priority.id} className="flex items-center gap-2">
                <Checkbox
                  id={`priority-${priority.id}`}
                  checked={selectedPriorities.includes(priority.id)}
                  onCheckedChange={() => toggleFilter(selectedPriorities, setSelectedPriorities, priority.id)}
                />
                <Label htmlFor={`priority-${priority.id}`} className="flex items-center gap-2 text-sm cursor-pointer">
                  <span className={cn("w-2 h-2 rounded-full", priority.color)} />
                  {priority.label}
                </Label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>


        {/* Sentiment Filter */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium py-1">
            Sentiment
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            {sentiments.map((sentiment) => (
              <div key={sentiment.id} className="flex items-center gap-2">
                <Checkbox
                  id={`sentiment-${sentiment.id}`}
                  checked={selectedSentiments.includes(sentiment.id)}
                  onCheckedChange={() => toggleFilter(selectedSentiments, setSelectedSentiments, sentiment.id)}
                />
                <Label htmlFor={`sentiment-${sentiment.id}`} className="flex items-center gap-2 text-sm cursor-pointer">
                  {(() => {
                    const Icon = sentiment.icon
                    return <Icon className={cn("h-3.5 w-3.5", sentiment.color)} />
                  })()}
                  {sentiment.label}
                </Label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

      </div>
    </aside>
  )
}
