import { NextResponse } from "next/server"
import { destroySession } from "@/lib/auth-physio"

export async function GET() {
  await destroySession()
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"))
}