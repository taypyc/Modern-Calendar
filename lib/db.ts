import { neon } from "@neondatabase/serverless"

type NeonSql = ReturnType<typeof neon>

let cached: NeonSql | null = null

export function getSql(): NeonSql {
  const url = process.env.DATABASE_URL
  if (!url?.trim()) {
    throw new Error(
      "DATABASE_URL is missing. Create a database at https://neon.tech, copy the connection string, and set DATABASE_URL in .env.local.",
    )
  }
  if (!cached) {
    cached = neon(url)
  }
  return cached
}
