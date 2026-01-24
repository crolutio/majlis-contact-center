/**
 * Conversation handling status utilities
 * Determines if a conversation is handled by AI, needs human attention, or is handled by human
 */

import { Conversation } from './sample-data';

export type HandlingStatus = 'ai-handled' | 'human-handling-needed' | 'human-handled';

/**
 * Determine the handling status of a conversation
 */
export function getHandlingStatus(conversation: Conversation): HandlingStatus {
  // Human-handled: assigned to an agent
  if (conversation.assignedTo) {
    return 'human-handled';
  }

  // Human-handling needed: escalated, has escalation risk, or is active (has agent interaction)
  if (conversation.escalationRisk || conversation.status === 'escalated' || conversation.status === 'active') {
    return 'human-handling-needed';
  }

  // AI-handled: default (not assigned, no escalation risk)
  return 'ai-handled';
}

/**
 * Get display label for handling status
 */
export function getHandlingLabel(status: HandlingStatus): string {
  switch (status) {
    case 'ai-handled':
      return 'AI Handled';
    case 'human-handling-needed':
      return 'Needs Human';
    case 'human-handled':
      return 'Human Handled';
  }
}

/**
 * Get color for handling status badge
 */
export function getHandlingColor(status: HandlingStatus): string {
  switch (status) {
    case 'ai-handled':
      return 'bg-blue-500/10 text-blue-600 border-blue-200';
    case 'human-handling-needed':
      return 'bg-amber-500/10 text-amber-600 border-amber-200';
    case 'human-handled':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
  }
}

/**
 * Filter conversations by handling status
 */
export function filterByHandlingStatus(
  conversations: Conversation[],
  status: HandlingStatus | 'all'
): Conversation[] {
  if (status === 'all') {
    return conversations;
  }
  return conversations.filter(conv => getHandlingStatus(conv) === status);
}



