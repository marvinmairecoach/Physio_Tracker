import { NextRequest, NextResponse } from "next/server"

// Simple in-memory error log (last 100 entries)
const MAX_LOG = 100
const errorLog: Array<{
  timestamp: string
  error: string
  stack: string | undefined
  componentStack: string | undefined
  url: string
}> = []

export const dynamic = "force-dynamic"

/** POST /physio-data/api/debug/log — log a client error */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const entry = {
      timestamp: body.timestamp || new Date().toISOString(),
      error: body.error || "(no message)",
      stack: body.stack,
      componentStack: body.componentStack,
      url: body.url || "(unknown)",
    }
    errorLog.unshift(entry)
    // Keep only last MAX_LOG entries
    if (errorLog.length > MAX_LOG) {
      errorLog.length = MAX_LOG
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Debug log error:", e)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

/** GET /physio-data/api/debug/log — view recent errors */
export async function GET() {
  return NextResponse.json({ entries: errorLog })
}