import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin" && session.role !== "coach") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { recipientIds, subject, body: emailBody, attachment } = body;

    if (
      !Array.isArray(recipientIds) ||
      recipientIds.length === 0 ||
      !subject ||
      !emailBody
    ) {
      return NextResponse.json(
        { error: "Paramètres manquants : recipientIds, subject et body sont requis" },
        { status: 400 }
      );
    }

    // Fetch all recipients
    const dirigeants = await prisma.dirigeant.findMany({
      where: { id: { in: recipientIds } },
    });

    // Prepare optional attachment
    const attachments =
      attachment && attachment.filename && attachment.content
        ? [
            {
              filename: attachment.filename,
              content: Buffer.from(attachment.content, "base64"),
            },
          ]
        : undefined;

    const results: {
      dirigeantId: string;
      email: string | null;
      success: boolean;
      message: string;
    }[] = [];

    for (const dirigeant of dirigeants) {
      if (!dirigeant.email) {
        results.push({
          dirigeantId: dirigeant.id,
          email: null,
          success: false,
          message: "Aucun email renseigné",
        });
        continue;
      }

      try {
        const res = await sendEmail({
          to: dirigeant.email,
          subject,
          html: emailBody,
          attachments,
        });
        results.push({
          dirigeantId: dirigeant.id,
          email: dirigeant.email,
          success: res.success,
          message: res.message,
        });
      } catch (err) {
        console.error(`Erreur envoi email à ${dirigeant.email}:`, err);
        results.push({
          dirigeantId: dirigeant.id,
          email: dirigeant.email,
          success: false,
          message: "Erreur d'envoi",
        });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const skipped = results.filter((r) => !r.email).length;

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      results,
      message: `${sent} email(s) envoyé(s)${
        skipped ? `, ${skipped} ignoré(s) (sans adresse email)` : ""
      }`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("POST /api/dirigeants/email error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}