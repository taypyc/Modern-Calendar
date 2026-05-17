import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { CUSTOMER_SESSION_COOKIE } from "@/lib/auth/constants"
import { readSessionToken } from "@/lib/auth/session"
import { getSql } from "@/lib/db"

export async function GET() {
  const jar = await cookies()
  const token = jar.get(CUSTOMER_SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ user: null })
  }

  const session = await readSessionToken(token)
  if (!session) {
    const res = NextResponse.json({ user: null })
    res.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    })
    return res
  }

  try {
    const sql = getSql()
    const rows = await sql`
      SELECT id, email, name
      FROM customer_accounts
      WHERE id = ${session.userId}::uuid
    `
    const row = (rows as { id: string; email: string; name: string | null }[])[0]
    if (!row) {
      const res = NextResponse.json({ user: null })
      res.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      })
      return res
    }
    return NextResponse.json({ user: row })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
