"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createStoneShape,
  deleteStoneShape,
  listStoneShapes,
  presignLibraryUpload,
  updateStoneShape,
} from "@/lib/admin-api";
import { getAdminTokenFromStorage } from "@/lib/admin-auth";
import AdminShell from "@/components/AdminShell";

async function putToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}

type StoneShape = Awaited<ReturnType<typeof listStoneShapes>>["stoneShapes"][number];

export default function StoneShapesPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [stoneShapes, setStoneShapes] = useState<StoneShape[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailImage, setThumbnailImage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh(currentToken: string) {
    const data = await listStoneShapes({ token: currentToken });
    setStoneShapes(data.stoneShapes);
  }

  useEffect(() => {
    const t = getAdminTokenFromStorage();
    if (!t) router.replace("/login");
    else setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    void refresh(token);
  }, [token]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setDisplayOrder(0);
    setIsActive(true);
    setThumbnailFile(null);
    setThumbnailImage("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let imageUrl = thumbnailImage.trim();
      if (thumbnailFile) {
        const presigned = await presignLibraryUpload({
          token,
          fileName: thumbnailFile.name,
          contentType: thumbnailFile.type || "application/octet-stream",
        });
        await putToPresignedUrl(presigned.uploadUrl, thumbnailFile);
        imageUrl = presigned.publicUrl;
      }
      if (!imageUrl) throw new Error("Thumbnail image is required");

      if (editingId) {
        await updateStoneShape({
          token,
          id: editingId,
          name: name.trim(),
          displayOrder,
          isActive,
          thumbnailImage: imageUrl,
        });
      } else {
        await createStoneShape({
          token,
          name: name.trim(),
          displayOrder,
          isActive,
          thumbnailImage: imageUrl,
        });
      }
      await refresh(token);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Stone Shapes">
      <div className="grid gap-8 lg:grid-cols-5">
        <form onSubmit={onSubmit} className="space-y-3 rounded-xl border bg-white p-5 lg:col-span-2">
          <input className="w-full rounded border px-3 py-2" placeholder="Stone shape name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full rounded border px-3 py-2" type="number" placeholder="Display order" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
          <input className="w-full rounded border px-3 py-2" placeholder="Thumbnail image URL (optional if uploading)" value={thumbnailImage} onChange={(e) => setThumbnailImage(e.target.value)} />
          <input className="w-full rounded border px-3 py-2" type="file" accept="image/*" onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-white">{saving ? "Saving..." : editingId ? "Update shape" : "Create shape"}</button>
        </form>
        <div className="space-y-3 lg:col-span-3">
          {stoneShapes.map((shape) => (
            <div key={shape._id} className="flex items-center justify-between rounded-xl border bg-white p-3">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shape.thumbnailImage} alt={shape.name} className="h-10 w-10 rounded object-cover" />
                <div>
                  <p className="text-sm font-semibold">{shape.name}</p>
                  <p className="text-xs text-slate-500">Order: {shape.displayOrder}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => {
                  setEditingId(shape._id);
                  setName(shape.name);
                  setDisplayOrder(shape.displayOrder);
                  setIsActive(shape.isActive);
                  setThumbnailImage(shape.thumbnailImage);
                  setThumbnailFile(null);
                }}>Edit</button>
                <button type="button" className="rounded border border-red-200 px-2 py-1 text-xs text-red-600" onClick={async () => {
                  if (!token) return;
                  await deleteStoneShape({ token, id: shape._id });
                  await refresh(token);
                }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

