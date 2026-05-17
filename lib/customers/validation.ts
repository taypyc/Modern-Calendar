import { z } from "zod"

const email = z.string().trim().email("Invalid email address")
const optionalText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === undefined || v === null) return null
    const t = v.trim()
    return t.length === 0 ? null : t
  })

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email,
  phone: optionalText.optional(),
  company: optionalText.optional(),
  notes: optionalText.optional(),
})

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: email.optional(),
  phone: optionalText,
  company: optionalText,
  notes: optionalText,
})
