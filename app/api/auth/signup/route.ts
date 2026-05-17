import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { NeonDbError } from "@neondatabase/serverless"
import { CUSTOMER_SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/auth/constants"
import { createSessionToken, hasAuthSecretConfigured } from "@/lib/auth/session"
import { signUpSchema } from "@/lib/auth/validation"
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

  const parsed = signUpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password, name } = parsed.data
  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const sql = getSql()
    const inserted = await sql`
      INSERT INTO customer_accounts (email, password_hash, name)
      VALUES (${email}, ${passwordHash}, ${name})
      RETURNING id, email, name
    `
    const row = inserted as { id: string; email: string; name: string | null }[]
    const user = row[0]
    if (!user) {
      return NextResponse.json({ error: "Could not create account" }, { status: 500 })
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    })

    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    })
    res.cookies.set(CUSTOMER_SESSION_COOKIE, token, sessionCookieOptions())
    return res
  } catch (e) {
    if (e instanceof NeonDbError && e.code === "23505") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 })
    }
    const message = e instanceof Error ? e.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
