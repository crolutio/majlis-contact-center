"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ConversationList } from "@/components/inbox/conversation-list"
import { ConversationPanel } from "@/components/inbox/conversation-panel"
import { QueueSidebar } from "@/components/inbox/queue-sidebar"
import { ConversationDrawer } from "@/components/inbox/conversation-drawer"
import { IndustrySelector } from "@/components/inbox/industry-selector"
import { HandlingStatusFilter } from "@/components/inbox/handling-status-filter"
import { 
  sampleConversations, 
  getConversationsByIndustry,
  type Conversation,
  type Industry 
} from "@/lib/sample-data"
import { filterByHandlingStatus, getHandlingLabel, type HandlingStatus } from "@/lib/conversation-handling"
import { supabase } from "@/lib/supabase"

export default function InboxPage() {
  const router = useRouter()
  const { user } = useAuth()
  const role = user?.role

  // Redirect agents to their agent desktop (they shouldn't see all conversations)
  useEffect(() => {
    if (role === "agent") {
      router.push("/chat-agent") // Redirect to chat agent view
    }
  }, [role, router])
  const [selectedIndustry, setSelectedIndustry] = useState<Industry>("banking")
  const [selectedHandlingStatus, setSelectedHandlingStatus] = useState<HandlingStatus | 'all'>('all')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Store all fetched conversations (before filtering)
  const [allFetchedConversations, setAllFetchedConversations] = useState<Conversation[]>([])

  // Filter state from QueueSidebar
  const [selectedQueue, setSelectedQueue] = useState<string>("all")
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
  const [selectedSentiments, setSelectedSentiments] = useState<string[]>([])
  const [selectedSLA, setSelectedSLA] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])

  const parseTimestamp = (value: Date | string | null | undefined) => {
    if (!value) return null
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const getConversationLastActivityMs = (conv: Conversation) => {
    const lastMessageTime = parseTimestamp(conv.lastMessageTime)
    if (lastMessageTime) return lastMessageTime.getTime()
    const messageTimes = (conv.messages || [])
      .map((msg) => parseTimestamp(msg.timestamp))
      .filter((ts): ts is Date => !!ts)
      .map((ts) => ts.getTime())
    if (messageTimes.length > 0) return Math.max(...messageTimes)
    const startTime = parseTimestamp(conv.startTime)
    return startTime ? startTime.getTime() : 0
  }

  // Calculate counts for queues and channels
  const queueCounts = useMemo(() => {
    const counts = {
      all: allFetchedConversations.length,
      enterprise: 0,
      sales: 0,
      billing: 0,
      technical: 0,
    }
    allFetchedConversations.forEach(conv => {
      const queueName = conv.queue?.toLowerCase() || '';
      if (queueName.includes("enterprise")) counts.enterprise++;
      if (queueName.includes("sales")) counts.sales++;
      if (queueName.includes("billing")) counts.billing++;
      if (queueName.includes("technical") || queueName.includes("tech")) counts.technical++;
    })
    return counts
  }, [allFetchedConversations])

  const channelCounts = useMemo(() => {
    const counts = { voice: 0, chat: 0, email: 0, whatsapp: 0 }
    allFetchedConversations.forEach(conv => {
      if (Object.prototype.hasOwnProperty.call(counts, conv.channel)) {
        counts[conv.channel as keyof typeof counts]++
      }
    })
    return counts
  }, [allFetchedConversations])

  const languageCounts = useMemo(() => {
    const counts = { en: 0, es: 0, fr: 0, de: 0 }
    allFetchedConversations.forEach(conv => {
      let lang = conv.customer.preferredLanguage?.toLowerCase();
      
      // If not available, try to map language name to code
      if (!lang && conv.customer.language) {
        const langName = conv.customer.language.toLowerCase();
        const langMap: Record<string, string> = {
          'english': 'en',
          'spanish': 'es',
          'french': 'fr',
          'german': 'de',
          'portuguese': 'pt',
          'italian': 'it',
          'chinese': 'zh',
          'japanese': 'ja',
          'korean': 'ko',
        };
        lang = langMap[langName] || langName.substring(0, 2);
      }
      
      lang = lang || 'en';
      if (Object.prototype.hasOwnProperty.call(counts, lang)) {
        counts[lang as keyof typeof counts]++
      }
    })
    return counts
  }, [allFetchedConversations])

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/conversations?industry=${selectedIndustry}`);
      
      // Check if response is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      // Get response as text first to check if it's valid JSON
      const responseText = await response.text();
      console.log('API response text (first 500 chars):', responseText.substring(0, 500));
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError: any) {
        console.error('JSON parse error:', parseError);
        console.error('Response text:', responseText);
        throw new Error(`Failed to parse JSON: ${parseError.message}`);
      }
      
      if (data.success) {
        const allConversations = (data.conversations || []).map((conv: any) => ({
          ...conv,
          // Convert date strings back to Date objects
          lastMessageTime: new Date(conv.lastMessageTime),
          startTime: new Date(conv.startTime),
          sla: {
            ...conv.sla,
            deadline: new Date(conv.sla.deadline),
          },
          messages: conv.messages?.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })) || [],
        }));
        
        // Store all conversations
        setAllFetchedConversations(allConversations);
      } else {
        setAllFetchedConversations([]);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      // Fallback to demo data
      const demoConversations = getConversationsByIndustry(selectedIndustry);
      setAllFetchedConversations(demoConversations);
      setIsLoading(false);
    }
  }, [selectedIndustry]);

  // Fetch conversations from API (only when industry changes)
  useEffect(() => {
    fetchConversations();

    // Poll for updates (faster for banking escalations)
    const intervalMs = selectedIndustry === "banking" ? 5000 : 30000;
    const interval = setInterval(fetchConversations, intervalMs);

    return () => clearInterval(interval);
  }, [fetchConversations]); // Only refetch when industry changes

  // Real-time subscription for instant updates (Supabase)
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchConversations])

  // Apply all filters client-side (when filters or fetched data changes)
  useEffect(() => {
    console.log('[Inbox] Applying filters:', {
      totalConversations: allFetchedConversations.length,
      handlingStatus: selectedHandlingStatus,
      industry: selectedIndustry,
      queue: selectedQueue,
      channels: selectedChannels,
      priorities: selectedPriorities,
      sentiments: selectedSentiments,
      sla: selectedSLA,
      languages: selectedLanguages,
    });
    
    let filtered = filterByHandlingStatus(allFetchedConversations, selectedHandlingStatus);

    // Filter out deleted conversations
    filtered = filtered.filter((conv) => conv.status !== 'deleted');

    // Only show banking conversations after handover is complete (handling_mode = "human")
    filtered = filtered.filter((conv) => {
      if (conv.metadata?.source !== "banking") return true
      return conv.metadata?.handlingMode === "human"
    })
    
    // Apply queue filter
    if (selectedQueue !== "all") {
      filtered = filtered.filter(conv => {
        const queueName = conv.queue?.toLowerCase() || '';
        switch (selectedQueue) {
          case "enterprise":
            return queueName.includes("enterprise");
          case "sales":
            return queueName.includes("sales");
          case "billing":
            return queueName.includes("billing");
          case "technical":
            return queueName.includes("technical") || queueName.includes("tech");
          default:
            return true;
        }
      });
    }
    
    // Apply channel filter
    if (selectedChannels.length > 0) {
      filtered = filtered.filter(conv => selectedChannels.includes(conv.channel));
    }
    
    // Apply priority filter
    if (selectedPriorities.length > 0) {
      filtered = filtered.filter(conv => selectedPriorities.includes(conv.priority));
    }
    
    // Apply sentiment filter
    if (selectedSentiments.length > 0) {
      filtered = filtered.filter(conv => selectedSentiments.includes(conv.sentiment));
    }
    
    // Apply SLA status filter
    if (selectedSLA.length > 0) {
      filtered = filtered.filter(conv => selectedSLA.includes(conv.sla.status));
    }
    
    // Apply language filter
    if (selectedLanguages.length > 0) {
      filtered = filtered.filter(conv => {
        // Try preferredLanguage first (should be language code like 'en', 'es', etc.)
        let lang = conv.customer.preferredLanguage?.toLowerCase();
        
        // If not available, try to map language name to code
        if (!lang && conv.customer.language) {
          const langName = conv.customer.language.toLowerCase();
          const langMap: Record<string, string> = {
            'english': 'en',
            'spanish': 'es',
            'french': 'fr',
            'german': 'de',
            'portuguese': 'pt',
            'italian': 'it',
            'chinese': 'zh',
            'japanese': 'ja',
            'korean': 'ko',
          };
          lang = langMap[langName] || langName.substring(0, 2); // Fallback to first 2 chars
        }
        
        // Default to 'en' if nothing found
        lang = lang || 'en';
        
        return selectedLanguages.includes(lang);
      });
    }
    
    console.log('[Inbox] Filtered conversations:', filtered.length);
    
    const sorted = [...filtered].sort((a, b) => getConversationLastActivityMs(b) - getConversationLastActivityMs(a))
    setConversations(sorted);
    
    // Update selected conversation - only if current selection is not in filtered list
    if (sorted.length > 0) {
      const currentSelectedId = selectedConversation?.id
      if (!currentSelectedId || !sorted.find(c => c.id === currentSelectedId)) {
        // Current selection is not in filtered list, select first one
        console.log('[Inbox] Selecting first conversation from filtered list');
        setSelectedConversation(sorted[0]);
      } else {
        // Current selection is still valid, update it with latest data
        const updated = sorted.find(c => c.id === currentSelectedId);
        if (updated) {
          setSelectedConversation(updated);
        }
      }
    } else {
      console.log('[Inbox] No conversations match filter, clearing selection');
      setSelectedConversation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFetchedConversations, selectedHandlingStatus, selectedQueue, selectedChannels, selectedPriorities, selectedSentiments, selectedSLA, selectedLanguages])

  return (
    <div className="flex h-full flex-col">
      {/* Industry Selector Header */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Conversations</h2>
            <p className="text-sm text-muted-foreground">
              {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'} 
              {` in ${selectedIndustry}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <HandlingStatusFilter
              selectedStatus={selectedHandlingStatus}
              onStatusChange={setSelectedHandlingStatus}
            />
            <IndustrySelector 
              selectedIndustry={selectedIndustry} 
              onIndustryChange={setSelectedIndustry} 
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Queue Sidebar */}
        <QueueSidebar
          selectedQueue={selectedQueue}
          onQueueChange={setSelectedQueue}
          selectedChannels={selectedChannels}
          onChannelsChange={setSelectedChannels}
          selectedPriorities={selectedPriorities}
          onPrioritiesChange={setSelectedPriorities}
          selectedSentiments={selectedSentiments}
          onSentimentsChange={setSelectedSentiments}
          selectedSLA={selectedSLA}
          onSLAChange={setSelectedSLA}
          selectedLanguages={selectedLanguages}
          onLanguagesChange={setSelectedLanguages}
          conversationCounts={queueCounts}
          channelCounts={channelCounts}
          languageCounts={languageCounts}
        />

      {/* Conversation List */}
      <ConversationList
        conversations={conversations}
        selectedId={selectedConversation?.id}
        onSelect={(conv) => setSelectedConversation(conv)}
      />

      {/* Conversation Panel */}
      <ConversationPanel 
        conversation={selectedConversation} 
        onOpenDrawer={() => setDrawerOpen(true)}
        onEscalated={fetchConversations}
        onDelete={(conversationId) => {
          // Remove from list and clear selection
          setConversations(conversations.filter(c => c.id !== conversationId));
          if (selectedConversation?.id === conversationId) {
            setSelectedConversation(null);
          }
        }}
      />

      {/* Customer Detail Drawer */}
      <ConversationDrawer conversation={selectedConversation} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    </div>
  )
}
