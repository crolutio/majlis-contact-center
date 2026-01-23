import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

type SmsMessageRow = {
  id: string
  created_at: string
  from_address: string | null
  to_address: string | null
  body_text: string
  provider: string | null
  provider_message_id: string | null
}

function getBaseUrl(req: NextRequest): string {
  // Allow explicit override so local UI can still show public webhook URLs.
  // Recommended: set NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
  const explicit =
    (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").trim().replace(/\/+$/, "")
  if (explicit) return explicit

  // Vercel provides VERCEL_URL without protocol.
  const vercelUrl = (process.env.VERCEL_URL || "").trim().replace(/\/+$/, "")
  if (vercelUrl) return `https://${vercelUrl}`

  // Prefer explicit forwarded headers (Vercel/proxies), else fall back to Next's parsed URL.
  const proto = req.headers.get("x-forwarded-proto")
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host")
  if (proto && host) return `${proto}://${host}`
  return req.nextUrl.origin
}

function maskAddress(addr: string | null): string | null {
  if (!addr) return null
  // Preserve scheme prefix (sms:/whatsapp:) if present, but mask digits.
  const [maybeScheme, rest] = addr.includes(":") ? addr.split(/:(.+)/) : ["", addr]
  const raw = rest ?? addr
  const digits = raw.replace(/[^\d]/g, "")
  const last4 = digits.slice(-4)
  const maskedCore = last4 ? `***${last4}` : "***"
  return maybeScheme ? `${maybeScheme}:${maskedCore}` : maskedCore
}

function extractVerificationCodes(text: string): string[] {
  const t = (text || "").trim()
  if (!t) return []
  const patterns: RegExp[] = [
    /\b(\d{4,8})\b/g, // generic 4-8 digit token
    /code[:\s]*([0-9]{4,8})/gi,
    /verification[:\s]*([0-9]{4,8})/gi,
    /verify[:\s]*([0-9]{4,8})/gi,
  ]
  const found = new Set<string>()
  for (const p of patterns) {
    const matches = t.matchAll(p)
    for (const m of matches) {
      const candidate = (m[1] || m[0] || "").trim()
      if (candidate && candidate.length >= 4 && candidate.length <= 8) found.add(candidate)
    }
  }
  return Array.from(found)
}

/**
 * Connectivity status endpoint for Twilio + Meta (verification via SMS).
 * GET /api/connectivity/twilio
 */
export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request)

  const env = {
    TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: !!process.env.TWILIO_PHONE_NUMBER,
    TWILIO_WHATSAPP_NUMBER: !!process.env.TWILIO_WHATSAPP_NUMBER,
    SUPABASE_CONTACT_CENTER_SECRET_KEY: !!process.env.SUPABASE_CONTACT_CENTER_SECRET_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  }

  const webhooks = {
    voice_incoming_call: `${baseUrl}/api/twilio/incoming-call`,
    voice_status_callback: `${baseUrl}/api/twilio/webhook`,
    whatsapp_incoming_message: `${baseUrl}/api/twilio/whatsapp/incoming`,
    whatsapp_status_callback: `${baseUrl}/api/twilio/whatsapp/webhook`,
    sms_incoming_message: `${baseUrl}/api/twilio/sms/incoming`,
  }

  // If Supabase server creds are missing, skip DB reads but still return URLs + env status.
  if (!env.SUPABASE_CONTACT_CENTER_SECRET_KEY || !env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({
      success: true,
      env,
      webhooks,
      metaVerification: {
        dbEnabled: false,
        recentSms: [],
        recentCodes: [],
      },
    })
  }

  try {
    const { data, error } = await supabaseServer
      .from("cc_messages")
      .select("id,created_at,from_address,to_address,body_text,provider,provider_message_id")
      .eq("channel", "sms")
      .order("created_at", { ascending: false })
      .limit(25)

    if (error) {
      return NextResponse.json(
        {
          success: true,
          env,
          webhooks,
          metaVerification: {
            dbEnabled: true,
            error: error.message,
            recentSms: [],
            recentCodes: [],
          },
        },
        { status: 200 },
      )
    }

    const rows = (data || []) as SmsMessageRow[]
    const recentCodes = rows
      .flatMap((r) => extractVerificationCodes(r.body_text || ""))
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      env,
      webhooks,
      metaVerification: {
        dbEnabled: true,
        recentSms: rows.map((r) => ({
          id: r.id,
          created_at: r.created_at,
          from_address: maskAddress(r.from_address),
          to_address: maskAddress(r.to_address),
          body_preview: (r.body_text || "").slice(0, 140),
          provider: r.provider,
          provider_message_id: r.provider_message_id,
          codes: extractVerificationCodes(r.body_text || ""),
        })),
        recentCodes,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: true,
        env,
        webhooks,
        metaVerification: {
          dbEnabled: true,
          error: error?.message || String(error),
          recentSms: [],
          recentCodes: [],
        },
      },
      { status: 200 },
    )
  }
}


