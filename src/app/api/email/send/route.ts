import { NextRequest, NextResponse } from "next/server"
import * as nodemailer from "nodemailer"
import * as fs from "fs"
import * as path from "path"

export const dynamic = "force-dynamic"

const LOG_DIR = path.join(process.cwd(), "_email_log")

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, attachment } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
    }

    const transporter =
      process.env.SMTP_HOST
        ? nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || "587"),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
              user: process.env.SMTP_USER || "",
              pass: process.env.SMTP_PASS || "",
            },
          } as nodemailer.TransportOptions)
        : null

    if (transporter) {
      try {
        const mailOptions: Record<string, unknown> = {
          from: process.env.SMTP_FROM || `"PP Tracker" <${process.env.SMTP_USER || "noreply@pptracker.fr"}>`,
          to,
          subject,
          html,
          text: html.replace(/<[^>]*>/g, ""),
        }

        if (attachment) {
          mailOptions.attachments = [
            {
              filename: attachment.filename,
              content: Buffer.from(attachment.content, "base64"),
            },
          ]
        }

        await transporter.sendMail(mailOptions)
        return NextResponse.json({ success: true, message: "Email envoyé via SMTP" })
      } catch (err) {
        console.error("SMTP error:", err)
        // Fall through to log mode
      }
    }

    // Simulation mode
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true })
    }

    const dateStr = new Date().toISOString().split("T")[0]
    const logFile = path.join(LOG_DIR, `${dateStr}-bilan.log`)

    const logEntry = [
      `=== Email avec PDF ${new Date().toISOString()} ===`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Attachment: ${attachment?.filename ?? "none"}`,
      `---`,
      html.replace(/<[^>]*>/g, ""),
      `\n`,
    ].join("\n")

    fs.appendFileSync(logFile, logEntry)

    if (attachment) {
      const pdfDir = path.join(LOG_DIR, "pdfs")
      if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true })
      fs.writeFileSync(path.join(pdfDir, attachment.filename), Buffer.from(attachment.content, "base64"))
    }

    return NextResponse.json({
      success: true,
      message: `Email simulé — log: ${logFile}${
        attachment ? `, PDF: ${path.join("_email_log/pdfs", attachment.filename)}` : ""
      }`,
    })
  } catch (error) {
    console.error("/api/email/send error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}