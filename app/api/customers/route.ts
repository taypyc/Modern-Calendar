import { NextResponse } from "next/server"
import { NeonDbError } from "@neondatabase/serverless"
import { createCustomerSchema } from "@/lib/customers/validation"
import { getSql } from "@/lib/db"
import type { Customer } from "@/lib/customers/types"

export async function GET() {
  try {
    const sql = getSql()
    const rows = await sql`
      SELECT id, name, email, phone, company, notes, created_at, updated_at
      FROM customers
      ORDER BY created_at DESC
    `
    return NextResponse.json(rows as Customer[])
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = createCustomerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 })
  }

  const { name, email, phone, company, notes } = parsed.data

  try {
    const sql = getSql()
    const inserted = await sql`
      INSERT INTO customers (name, email, phone, company, notes)
      VALUES (${name}, ${email}, ${phone ?? null}, ${company ?? null}, ${notes ?? null})
      RETURNING id, name, email, phone, company, notes, created_at, updated_at
    `
    const row = (inserted as Customer[])[0]
    return NextResponse.json(row, { status: 201 })
  } catch (e) {
    if (e instanceof NeonDbError && e.code === "23505") {
      return NextResponse.json({ error: "A customer with this email already exists." }, { status: 409 })
    }
    const message = e instanceof Error ? e.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
