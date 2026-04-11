"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelUpload,
  createBanner,
  deleteBanner,
  listBanners,
  presignBannerUpload,
  updateBanner,
} from "@/lib/admin-api";
import { clearAdminTokenFromStorage, getAdminTokenFromStorage } from "@/lib/admin-auth";
import AdminShell from "@/components/AdminShell";
import {
  PlusCircle,
  RefreshCw,
  AlertCircle,
  Trash2,
  Eye,
  EyeOff,
  ImageIcon,
  Link2,
} from "lucide-react";

type Banner = Awaited<ReturnType<typeof listBanners>>["banners"][number];

async function putToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}

export default function BannersPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);

  const canSubmit = useMemo(() => !!token && !loading, [token, loading]);

  useEffect(() => {
    const existing = getAdminTokenFromStorage();
    if (!existing) router.replace("/login");
    else setToken(existing);
  }, [router]);

  async function refresh(t: string) {
    const data = await listBanners({ token: t });
    setBanners(data.banners);
  }

  useEffect(() => {
    if (!token) return;
    void refresh(token).catch((err) => {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!file) {
      setError("Please choose an image file");
      return;
    }

    setLoading(true);
    setError(null);

    let tmpKey: string | null = null;
    try {
      const presigned = await presignBannerUpload({
        token,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      });
      tmpKey = presigned.key;
      await putToPresignedUrl(presigned.uploadUrl, file);

      await createBanner({
        token,
        title,
        linkUrl: linkUrl.trim() || undefined,
        displayOrder,
        isActive,
        tmpKey,
      });

      setTitle("");
      setLinkUrl("");
      setDisplayOrder(0);
      setIsActive(true);
      setFile(null);
      await refresh(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
      if (tmpKey) {
        try { await cancelUpload({ token, key: tmpKey }); } catch { /* ignore */ }
      }
    } finally {
      setLoading(false);
    }
  }

  async function onToggleActive(b: Banner) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await updateBanner({ token, id: b._id, isActive: !b.isActive });
      await refresh(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(b: Banner) {
    if (!token) return;
    const ok = confirm(`Delete banner "${b.title}"?`);
    if (!ok) return;

    setLoading(true);
    setError(null);
    try {
      await deleteBanner({ token, id: b._id });
      await refresh(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell title="Banners">
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Form column */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Add banner</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Upload a banner image with an optional link URL.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <form onSubmit={onCreate} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Title</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Homepage banner"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Link URL <span className="text-slate-400">(optional)</span>
                </label>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2} />
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Display order</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex cursor-pointer items-center gap-3">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                      />
                      <div className="h-5 w-9 rounded-full bg-slate-200 transition-colors peer-checked:bg-indigo-600" />
                      <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Image</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 shadow-sm"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                />
                {file && (
                  <p className="text-xs text-slate-500">{file.name}</p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" strokeWidth={2} />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
                disabled={!canSubmit}
                type="submit"
              >
                <PlusCircle className="h-4 w-4" />
                {loading ? "Saving…" : "Create banner"}
              </button>
            </form>
          </div>
        </div>

        {/* List column */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">All banners</h2>
              <p className="mt-0.5 text-sm text-slate-500">{banners.length} banner{banners.length !== 1 ? "s" : ""}</p>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
              disabled={!token || loading}
              onClick={() => token && refresh(token)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <div className="space-y-4">
            {banners.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
                <ImageIcon className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">No banners yet. Create one to get started.</p>
              </div>
            )}

            {banners.map((b) => (
              <div key={b._id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageUrl} alt={b.title} className="h-40 w-full object-cover" />
                  <div className="absolute right-2 top-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${
                        b.isActive
                          ? "bg-green-500 text-white"
                          : "bg-slate-700 text-white"
                      }`}
                    >
                      {b.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{b.title}</p>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                        <span>Order: {b.displayOrder}</span>
                        {b.linkUrl && (
                          <span className="flex items-center gap-1 truncate">
                            <Link2 className="h-3 w-3" />
                            {b.linkUrl}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        title={b.isActive ? "Deactivate" : "Activate"}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-sm transition-colors disabled:opacity-60 ${
                          b.isActive
                            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                        disabled={!token || loading}
                        onClick={() => onToggleActive(b)}
                      >
                        {b.isActive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {b.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-100 disabled:opacity-60"
                        disabled={!token || loading}
                        onClick={() => onDelete(b)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
