import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, attachment } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
    }

    const attachments = attachment?.filename && attachment?.content
      ? [{ filename: attachment.filename, content: Buffer.from(attachment.content, "base64") }]
      : undefined

    const result = await sendEmail({ to, subject, html, attachments })
    return NextResponse.json(result)
  } catch (error) {
    console.error("/api/email/send error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}