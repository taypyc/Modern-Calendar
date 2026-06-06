"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Trash2 } from "lucide-react"

type Customer = {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  })

  const load = useCallback(async () => {
    setError(null)
    const res = await fetch("/api/customers")
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setError(data.error ?? `Request failed (${res.status})`)
      setCustomers([])
      setLoading(false)
      return
    }
    setCustomers((await res.json()) as Customer[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        company: form.company || null,
        notes: form.notes || null,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      setError(data.error ?? `Could not save (${res.status})`)
      setSaving(false)
      return
    }
    setForm({ name: "", email: "", phone: "", company: "", notes: "" })
    await load()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer?")) return
    setError(null)
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" })
    if (!res.ok && res.status !== 204) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setError(data.error ?? `Delete failed (${res.status})`)
      return
    }
    await load()
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Calendar
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        </div>

        <p className="mb-6 text-sm text-zinc-400">
          Data is stored in PostgreSQL on{" "}
          <a
            href="https://neon.tech"
            className="text-sky-400 underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Neon
          </a>
          . Set <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">DATABASE_URL</code> in{" "}
          <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">.env.local</code>, then run{" "}
          <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">npm run db:migrate</code>.
        </p>

        {error && (
          <div className="mb-6 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mb-10 grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
        >
          <h2 className="text-lg font-medium text-white">Add customer</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-zinc-400">Name</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none ring-sky-500/40 focus:ring-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-zinc-400">Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none ring-sky-500/40 focus:ring-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-zinc-400">Phone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none ring-sky-500/40 focus:ring-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-zinc-400">Company</span>
              <input
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none ring-sky-500/40 focus:ring-2"
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="text-zinc-400">Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none ring-sky-500/40 focus:ring-2"
            />
          </label>
          <div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save customer
            </button>
          </div>
        </form>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30">
          <div className="border-b border-zinc-800 px-6 py-4">
            <h2 className="text-lg font-medium text-white">Directory</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : customers.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-zinc-500">No customers yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {customers.map((c) => (
                <li key={c.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-white">{c.name}</p>
                    <p className="text-sm text-zinc-400">{c.email}</p>
                    {(c.phone || c.company) && (
                      <p className="mt-1 text-sm text-zinc-500">
                        {[c.phone, c.company].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {c.notes && <p className="mt-2 max-w-prose text-sm text-zinc-400">{c.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(c.id)}
                    className="inline-flex items-center gap-1 self-start rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-red-900/60 hover:bg-red-950/30 hover:text-red-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
