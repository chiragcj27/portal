"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/admin-api";
import {
  getAdminTokenFromStorage,
} from "@/lib/admin-auth";
import AdminShell from "@/components/AdminShell";
import { UserPlus, Copy, Check, AlertCircle } from "lucide-react";

type CreateClientResult = Awaited<ReturnType<typeof createClient>>;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CredRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-green-700">{label}</p>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-white px-3 py-2">
        <span className={`min-w-0 truncate text-sm text-slate-900 ${mono ? "font-mono" : "font-medium"}`}>
          {value}
        </span>
        <CopyButton text={value} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateClientResult | null>(null);

  useEffect(() => {
    const existing = getAdminTokenFromStorage();
    if (!existing) router.replace("/login");
    else setToken(existing);
  }, [router]);

  const canCreate = useMemo(() => !!token && !loading, [token, loading]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const created = await createClient({ token, clientName });
      setResult(created);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell title="Dashboard">
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Client Credentials</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Generate API credentials for a new client. The password is only shown once — save it immediately.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={onCreate} className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Client name</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Chandra Jewels"
                required
              />
            </div>
            <button
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
              disabled={!canCreate}
              type="submit"
            >
              <UserPlus className="h-4 w-4" />
              {loading ? "Creating…" : "Create client"}
            </button>
          </form>

          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" strokeWidth={2} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {result && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6">
            <p className="mb-4 text-sm font-medium text-green-800">
              Credentials created — save the password now, it won&apos;t be shown again.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <CredRow label="Client name" value={result.clientName} />
              <CredRow label="Username" value={result.username} />
              <div className="sm:col-span-2">
                <CredRow label="Password" value={result.password} mono />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
