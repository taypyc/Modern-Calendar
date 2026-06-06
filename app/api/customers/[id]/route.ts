import { NextResponse } from "next/server"
import { NeonDbError } from "@neondatabase/serverless"
import { z } from "zod"
import { getSql } from "@/lib/db"
import type { Customer } from "@/lib/customers/types"

const idParam = z.string().uuid("Invalid customer id")

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().optional(),
    phone: z.union([z.string(), z.null()]).optional(),
    company: z.union([z.string(), z.null()]).optional(),
    notes: z.union([z.string(), z.null()]).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: "Provide at least one field to update" })

function normalizeNullable(v: string | null | undefined): string | null {
  if (v === undefined) return null
  if (v === null) return null
  const t = v.trim()
  return t.length === 0 ? null : t
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const idResult = idParam.safeParse(id)
  if (!idResult.success) {
    return NextResponse.json({ error: "Invalid customer id" }, { status: 400 })
  }

  try {
    const sql = getSql()
    const rows = await sql`
      SELECT id, name, email, phone, company, notes, created_at, updated_at
      FROM customers
      WHERE id = ${idResult.data}::uuid
    `
    const row = (rows as Customer[])[0]
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json(row)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const idResult = idParam.safeParse(id)
  if (!idResult.success) {
    return NextResponse.json({ error: "Invalid customer id" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 })
  }

  const patch = parsed.data

  try {
    const sql = getSql()
    const existingRows = await sql`
      SELECT id, name, email, phone, company, notes, created_at, updated_at
      FROM customers
      WHERE id = ${idResult.data}::uuid
    `
    const existing = (existingRows as Customer[])[0]
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const name = patch.name ?? existing.name
    const email = patch.email ?? existing.email
    const phone = patch.phone !== undefined ? normalizeNullable(patch.phone) : existing.phone
    const company = patch.company !== undefined ? normalizeNullable(patch.company) : existing.company
    const notes = patch.notes !== undefined ? normalizeNullable(patch.notes) : existing.notes

    const updated = await sql`
      UPDATE customers
      SET
        name = ${name},
        email = ${email},
        phone = ${phone},
        company = ${company},
        notes = ${notes},
        updated_at = now()
      WHERE id = ${idResult.data}::uuid
      RETURNING id, name, email, phone, company, notes, created_at, updated_at
    `
    const row = (updated as Customer[])[0]
    return NextResponse.json(row)
  } catch (e) {
    if (e instanceof NeonDbError && e.code === "23505") {
      return NextResponse.json({ error: "A customer with this email already exists." }, { status: 409 })
    }
    const message = e instanceof Error ? e.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const idResult = idParam.safeParse(id)
  if (!idResult.success) {
    return NextResponse.json({ error: "Invalid customer id" }, { status: 400 })
  }

  try {
    const sql = getSql()
    const deleted = await sql`
      DELETE FROM customers
      WHERE id = ${idResult.data}::uuid
      RETURNING id
    `
    if ((deleted as { id: string }[]).length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
