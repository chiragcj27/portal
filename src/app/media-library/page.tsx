"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteLibraryMedia,
  listLibraryMedia,
  presignLibraryUpload,
  type LibraryMediaItem,
} from "@/lib/admin-api";
import { getAdminTokenFromStorage } from "@/lib/admin-auth";
import AdminShell from "@/components/AdminShell";
import {
  AlertCircle,
  Copy,
  ImageIcon,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";

async function putToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  try {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        "Image upload failed before reaching S3. This is usually a bucket CORS issue. Allow your admin portal origin for PUT/OPTIONS on S3."
      );
    }
    throw err;
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibraryPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<LibraryMediaItem[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const canUpload = useMemo(() => !!token && !loading, [token, loading]);

  useEffect(() => {
    const existing = getAdminTokenFromStorage();
    if (!existing) router.replace("/login");
    else setToken(existing);
  }, [router]);

  const loadPage = useCallback(
    async (t: string, append: boolean, continuationToken?: string) => {
      setListLoading(true);
      setError(null);
      try {
        const data = await listLibraryMedia({ token: t, continuationToken });
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setNextToken(data.nextContinuationToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed";
        setError(message);
      } finally {
        setListLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!token) return;
    void loadPage(token, false);
  }, [token, loadPage]);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!file) {
      setError("Please choose an image file");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const presigned = await presignLibraryUpload({
        token,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      });
      await putToPresignedUrl(presigned.uploadUrl, file);
      setFile(null);
      await loadPage(token, false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function copyUrl(url: string, key: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  async function onDelete(item: LibraryMediaItem) {
    if (!token) return;
    const ok = confirm("Delete this image from S3? This cannot be undone.");
    if (!ok) return;

    setLoading(true);
    setError(null);
    try {
      await deleteLibraryMedia({ token, key: item.key });
      await loadPage(token, false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell title="Media library">
      <div className="space-y-8">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Upload to S3</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Images are stored under <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">media/admin-library/</code>.
            Copy the public URL for use in products or elsewhere.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={onUpload} className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Image file</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 shadow-sm"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && <p className="text-xs text-slate-500">{file.name}</p>}
            </div>
            <button
              type="submit"
              disabled={!canUpload || !file}
              className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
            >
              <UploadCloud className="h-4 w-4" />
              {loading ? "Uploading…" : "Upload"}
            </button>
          </form>

          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" strokeWidth={2} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Library</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {items.length} image{items.length !== 1 ? "s" : ""}
                {listLoading && " · Loading…"}
              </p>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
              disabled={!token || listLoading || loading}
              onClick={() => token && loadPage(token, false)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {items.length === 0 && !listLoading && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
              <ImageIcon className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-400">No images yet. Upload one above.</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.key}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="relative aspect-video bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.publicUrl}
                    alt=""
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-3 p-4">
                  <p className="truncate font-mono text-xs text-slate-500" title={item.key}>
                    {item.key.replace(/^media\/admin-library\//, "")}
                  </p>
                  <p className="text-xs text-slate-400">
                    {item.lastModified ? new Date(item.lastModified).toLocaleString() : "—"} ·{" "}
                    {formatBytes(item.size)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
                      disabled={loading}
                      onClick={() => copyUrl(item.publicUrl, item.key)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedKey === item.key ? "Copied" : "Copy URL"}
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-100 disabled:opacity-60"
                      disabled={loading}
                      onClick={() => onDelete(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {nextToken && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                disabled={!token || listLoading}
                onClick={() => token && loadPage(token, true, nextToken)}
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
