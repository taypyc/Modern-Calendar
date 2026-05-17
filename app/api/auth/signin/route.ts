import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { CUSTOMER_SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/auth/constants"
import { createSessionToken, hasAuthSecretConfigured } from "@/lib/auth/session"
import { signInSchema } from "@/lib/auth/validation"
import { getSql } from "@/lib/db"

function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  }
}

export async function POST(request: Request) {
  if (!hasAuthSecretConfigured()) {
    return NextResponse.json(
      { error: "Server is not configured: set AUTH_SECRET (32+ random characters) in .env.local." },
      { status: 503 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = signInSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password } = parsed.data

  try {
    const sql = getSql()
    const rows = await sql`
      SELECT id, email, name, password_hash
      FROM customer_accounts
      WHERE email = ${email}
    `
    const row = (rows as { id: string; email: string; name: string | null; password_hash: string }[])[0]
    if (!row) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })
    }

    const ok = await bcrypt.compare(password, row.password_hash)
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })
    }

    const token = await createSessionToken({
      userId: row.id,
      email: row.email,
      name: row.name,
    })

    const res = NextResponse.json({
      user: { id: row.id, email: row.email, name: row.name },
    })
    res.cookies.set(CUSTOMER_SESSION_COOKIE, token, sessionCookieOptions())
    return res
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
