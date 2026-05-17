import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "@neondatabase/serverless"

const __dirname = dirname(fileURLToPath(import.meta.url))
const url = process.env.DATABASE_URL

if (!url?.trim()) {
  console.error("DATABASE_URL is required (Neon connection string).")
  process.exit(1)
}

const file = join(__dirname, "../db/migrations/001_create_customers.sql")
const sql = readFileSync(file, "utf8")

const client = new Client(url)
await client.connect()
try {
  await client.query(sql)
  console.log("Applied db/migrations/001_create_customers.sql")
} finally {
  await client.end()
}
