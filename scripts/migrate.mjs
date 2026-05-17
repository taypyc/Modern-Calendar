import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "@neondatabase/serverless"

const __dirname = dirname(fileURLToPath(import.meta.url))
const url = process.env.DATABASE_URL

if (!url?.trim()) {
  console.error("DATABASE_URL is required (Neon connection string).")
  process.exit(1)
}

const dir = join(__dirname, "../db/migrations")
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()

const client = new Client(url)
await client.connect()
try {
  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8")
    await client.query(sql)
    console.log(`Applied db/migrations/${file}`)
  }
} finally {
  await client.end()
}
