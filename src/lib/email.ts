/**
 * Email service for sending convocation emails.
 * For now: logs emails to console + stores in `_email_log` directory.
 * To enable real SMTP: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env
 */

import * as nodemailer from "nodemailer"
import * as fs from "fs"
import * as path from "path"

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: { filename: string; content: Buffer }[]
}

const LOG_DIR = path.join(process.cwd(), "_email_log")

function getTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    } as nodemailer.TransportOptions)
  }
  return null
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; message: string }> {
  const transporter = getTransporter()

  if (transporter) {
    try {
      const mailOptions: Record<string, unknown> = {
        from: process.env.SMTP_FROM || `"PP Tracker" <${process.env.SMTP_USER || "noreply@pptracker.fr"}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ""),
      }

      if (options.attachments && options.attachments.length > 0) {
        mailOptions.attachments = options.attachments
      }

      await transporter.sendMail(mailOptions)
      return { success: true, message: "Email sent via SMTP" }
    } catch (err) {
      console.error("SMTP error, falling back to log:", err)
      // Fall through to log mode
    }
  }

  // Simulation mode: log to file
  const dateStr = new Date().toISOString().split("T")[0]
  const logFile = path.join(LOG_DIR, `${dateStr}.log`)

  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }

  const logEntry = [
    `=== Email ${new Date().toISOString()} ===`,
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    `Attachments: ${options.attachments?.map((a) => a.filename).join(", ") || "none"}`,
    `---`,
    options.html.replace(/<[^>]*>/g, ""),
    `\n`,
  ].join("\n")

  fs.appendFileSync(logFile, logEntry)

  // Save attachments in simulation mode
  if (options.attachments && options.attachments.length > 0) {
    const pdfDir = path.join(LOG_DIR, "pdfs")
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true })
    for (const attachment of options.attachments) {
      fs.writeFileSync(path.join(pdfDir, attachment.filename), attachment.content)
    }
  }

  return {
    success: true,
    message: `Email logged to ${logFile} (simulation mode)`,
  }
}

export function generateInvitationLink(token: string): string {
  const baseUrl = process.env.APP_URL || "http://localhost:3000"
  return `${baseUrl}/invitation/${token}`
}