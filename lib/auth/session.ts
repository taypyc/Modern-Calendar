import { SignJWT, jwtVerify } from "jose"
import { SESSION_MAX_AGE_SEC } from "@/lib/auth/constants"

function getSecretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET?.trim()
  if (!s || s.length < 32) {
    throw new Error(
      "AUTH_SECRET must be set to a random string of at least 32 characters (use .env.local).",
    )
  }
  return new TextEncoder().encode(s)
}

export function hasAuthSecretConfigured(): boolean {
  const s = process.env.AUTH_SECRET?.trim()
  return Boolean(s && s.length >= 32)
}

export type SessionPayload = {
  userId: string
  email: string
  name: string | null
}

export async function createSessionToken(user: SessionPayload): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(getSecretKey())
}

export async function readSessionToken(token: string): Promise<SessionPayload | null> {
  let key: Uint8Array
  try {
    key = getSecretKey()
  } catch {
    return null
  }
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] })
    const sub = payload.sub
    if (!sub || typeof sub !== "string") return null
    const email = payload.email
    if (typeof email !== "string" || !email) return null
    const name = payload.name
    return {
      userId: sub,
      email,
      name: typeof name === "string" && name.length > 0 ? name : null,
    }
  } catch {
    return null
  }
}
