import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

/**
 * POST /api/conversations/[id]/escalate
 * Escalate a conversation using server credentials (bypasses RLS)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id
    if (!id) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 })
    }

    // Update unified conversations table
    const { error: convError } = await supabaseServer
      .from("conversations")
      .update({
        status: "escalated",
        escalation_risk: true,
        priority: "high",
      })
      .eq("id", id)

    if (convError) {
      return NextResponse.json({ error: convError.message }, { status: 500 })
    }

    // Update banking conversations table if exists
    const { error: ccError } = await supabaseServer
      .from("cc_conversations")
      .update({
        status: "escalated",
        priority: "high",
      })
      .eq("id", id)

    if (ccError) {
      // Do not fail escalation if cc_conversations doesn't have the row
      console.warn("[escalate] cc_conversations update failed:", ccError.message)
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to escalate" }, { status: 500 })
  }
}
