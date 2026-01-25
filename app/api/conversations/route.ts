import { NextRequest, NextResponse } from 'next/server';
import { getAllConversations } from '@/lib/store-adapter';
import { getAllBankingConversations } from '@/lib/banking-store';
import { getConversationsByIndustry, type Industry } from '@/lib/sample-data';

/**
 * API endpoint to get all conversations
 * GET /api/conversations?industry=banking
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const industry = searchParams.get('industry') as Industry | null;

    console.log('📥 GET /api/conversations:', { industry });

    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    console.log('🔧 Using Supabase:', useSupabase);
    
    // Get stored conversations from data store (Supabase or in-memory)
    // If using Supabase and industry is specified, filter at database level
    // If industry is null/undefined, get all conversations (including those without industry)
    const storedConversations = await getAllConversations(industry || undefined);

    // For banking, also pull cc_conversations to ensure escalations show immediately
    let bankingConversations: any[] = [];
    if (industry === 'banking') {
      bankingConversations = await getAllBankingConversations();
    }

    // If using Supabase, we already have the data from database (including demo data seeded)
    // If using in-memory, merge with demo data
    let conversations = storedConversations;

    if (!useSupabase) {
      // Only merge demo data if NOT using Supabase (in-memory mode)
      if (industry) {
        const industryConversations = getConversationsByIndustry(industry);
        conversations = [...storedConversations, ...industryConversations];
      } else {
        // Include all industry demo data for "all" view
        const allIndustryConversations = getConversationsByIndustry('healthcare')
          .concat(getConversationsByIndustry('ecommerce'))
          .concat(getConversationsByIndustry('banking'))
          .concat(getConversationsByIndustry('saas'));
        conversations = [...storedConversations, ...allIndustryConversations];
      }
    }

    let allConversations = [...conversations, ...bankingConversations];

    // Dedupe by id when combining sources
    const seen = new Set<string>();
    allConversations = allConversations.filter((conv: any) => {
      if (!conv?.id) return false;
      if (seen.has(conv.id)) return false;
      seen.add(conv.id);
      return true;
    });

    // Sort by last message time (most recent first)
    allConversations.sort((a, b) => {
      const timeA = a.lastMessageTime instanceof Date ? a.lastMessageTime.getTime() : new Date(a.lastMessageTime).getTime();
      const timeB = b.lastMessageTime instanceof Date ? b.lastMessageTime.getTime() : new Date(b.lastMessageTime).getTime();
      return timeB - timeA;
    });

    // Serialize Date objects to ISO strings for JSON response
    const serializedConversations = allConversations.map(conv => ({
      ...conv,
      lastMessageTime: conv.lastMessageTime instanceof Date
        ? conv.lastMessageTime.toISOString()
        : conv.lastMessageTime,
      startTime: conv.startTime instanceof Date
        ? conv.startTime.toISOString()
        : conv.startTime,
      sla: {
        ...conv.sla,
        deadline: conv.sla.deadline instanceof Date
          ? conv.sla.deadline.toISOString()
          : conv.sla.deadline,
      },
      messages: conv.messages?.map((msg: any) => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date
          ? msg.timestamp.toISOString()
          : msg.timestamp,
      })) || [],
    }));

    // Test JSON serialization before sending
    try {
      JSON.stringify(serializedConversations);
    } catch (serializeError: any) {
      console.error('JSON serialization error:', serializeError);
      console.error('Problematic conversation:', serializeError.message);
      // Return empty array if serialization fails
      return NextResponse.json({
        success: true,
        conversations: [],
        count: 0,
        storedCount: 0,
        error: 'Serialization error',
      });
    }
    
    return NextResponse.json({
      success: true,
      conversations: serializedConversations,
      count: serializedConversations.length,
      storedCount: storedConversations.length,
    });
  } catch (error: any) {
    console.error('❌ Top-level error in GET /api/conversations:', error);
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch conversations',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

