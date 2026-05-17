import { z } from "zod"

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
})

export const signUpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(128, "Password is too long"),
  name: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === undefined || v === null) return null
      const t = v.trim().slice(0, 120)
      return t.length > 0 ? t : null
    }),
})
