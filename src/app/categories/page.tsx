"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelUpload,
  createCategory,
  createSubcategoryProfile,
  deleteCategory,
  deleteSubcategoryProfile,
  listCategories,
  listSubcategoryProfiles,
  presignCategoryUpload,
  updateCategory,
  updateSubcategoryProfile,
} from "@/lib/admin-api";
import { getAdminTokenFromStorage } from "@/lib/admin-auth";
import AdminShell from "@/components/AdminShell";
import {
  PlusCircle,
  RefreshCw,
  AlertCircle,
  ImageIcon,
  LayoutGrid,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

type Category = Awaited<ReturnType<typeof listCategories>>["categories"][number];
type SubcategoryProfile = Awaited<ReturnType<typeof listSubcategoryProfiles>>["subcategoryProfiles"][number];

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

export default function CategoriesPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategoryProfilesByCategoryId, setSubcategoryProfilesByCategoryId] = useState<
    Record<string, SubcategoryProfile[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subcategory profile creation
  const [addingProfileCategoryId, setAddingProfileCategoryId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileDisplayOrder, setProfileDisplayOrder] = useState<number>(0);
  const [profileIsActive, setProfileIsActive] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [bannerFiles, setBannerFiles] = useState<File[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const canSubmit = useMemo(() => !!token && !loading, [token, loading]);

  useEffect(() => {
    const existing = getAdminTokenFromStorage();
    if (!existing) router.replace("/login");
    else setToken(existing);
  }, [router]);

  async function refresh(t: string) {
    const data = await listCategories({ token: t });
    setCategories(data.categories);

    const profilesData = await listSubcategoryProfiles({ token: t });
    const grouped: Record<string, SubcategoryProfile[]> = {};
    for (const p of profilesData.subcategoryProfiles) {
      (grouped[p.categoryId] ||= []).push(p);
    }
    setSubcategoryProfilesByCategoryId(grouped);
  }

  useEffect(() => {
    if (!token) return;
    void refresh(token).catch((err) => {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
    });
  }, [token]);

  function resetCategoryForm() {
    setEditingCategoryId(null);
    setName("");
    setDisplayOrder(0);
    setIsActive(true);
    setFile(null);
    setBannerFiles([]);
  }

  function resetProfileForm() {
    setEditingProfileId(null);
    setAddingProfileCategoryId(null);
    setProfileName("");
    setProfileDisplayOrder(0);
    setProfileIsActive(true);
    setProfileError(null);
  }

  async function onSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!editingCategoryId && !file) {
      setError("Please choose an image file");
      return;
    }

    setLoading(true);
    setError(null);

    let tmpKey: string | null = null;
    const bannerTmpKeys: string[] = [];
    try {
      if (file) {
        const presigned = await presignCategoryUpload({
          token,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
        });
        tmpKey = presigned.key;
        await putToPresignedUrl(presigned.uploadUrl, file);
      }

      for (const bannerFile of bannerFiles) {
        const bannerPresigned = await presignCategoryUpload({
          token,
          fileName: bannerFile.name,
          contentType: bannerFile.type || "application/octet-stream",
        });
        bannerTmpKeys.push(bannerPresigned.key);
        await putToPresignedUrl(bannerPresigned.uploadUrl, bannerFile);
      }

      if (editingCategoryId) {
        await updateCategory({
          token,
          id: editingCategoryId,
          name,
          displayOrder,
          isActive,
          tmpKey: tmpKey ?? undefined,
          categoryBannerTmpKeys: bannerTmpKeys,
        });
      } else {
        await createCategory({
          token,
          name,
          displayOrder,
          isActive,
          tmpKey: tmpKey as string,
          categoryBannerTmpKeys: bannerTmpKeys,
        });
      }

      resetCategoryForm();
      await refresh(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
      if (tmpKey) {
        try { await cancelUpload({ token, key: tmpKey }); } catch { /* ignore */ }
      }
      for (const bannerTmpKey of bannerTmpKeys) {
        try { await cancelUpload({ token, key: bannerTmpKey }); } catch { /* ignore */ }
      }
    } finally {
      setLoading(false);
    }
  }

  async function onSaveSubcategoryProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !addingProfileCategoryId) return;

    const trimmedName = profileName.trim();
    if (!trimmedName) {
      setProfileError("Please enter a profile name");
      return;
    }

    setProfileSaving(true);
    setProfileError(null);
    try {
      if (editingProfileId) {
        await updateSubcategoryProfile({
          token,
          id: editingProfileId,
          name: trimmedName,
          displayOrder: profileDisplayOrder,
          isActive: profileIsActive,
        });
      } else {
        await createSubcategoryProfile({
          token,
          categoryId: addingProfileCategoryId,
          name: trimmedName,
          displayOrder: profileDisplayOrder,
          isActive: profileIsActive,
        });
      }

      resetProfileForm();
      await refresh(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setProfileError(message);
    } finally {
      setProfileSaving(false);
    }
  }

  function onEditCategory(category: Category) {
    setEditingCategoryId(category._id);
    setName(category.name);
    setDisplayOrder(category.displayOrder);
    setIsActive(category.isActive);
    setFile(null);
    setBannerFiles([]);
    setError(null);
  }

  async function onDeleteCategory(category: Category) {
    if (!token) return;
    const ok = confirm(`Delete category "${category.name}"?`);
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      await deleteCategory({ token, id: category._id });
      if (editingCategoryId === category._id) resetCategoryForm();
      await refresh(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function onEditProfile(categoryId: string, profile: SubcategoryProfile) {
    setAddingProfileCategoryId(categoryId);
    setEditingProfileId(profile._id);
    setProfileName(profile.name);
    setProfileDisplayOrder(profile.displayOrder);
    setProfileIsActive(profile.isActive);
    setProfileError(null);
  }

  async function onDeleteProfile(profile: SubcategoryProfile) {
    if (!token) return;
    const ok = confirm(`Delete profile "${profile.name}"?`);
    if (!ok) return;
    setProfileSaving(true);
    setProfileError(null);
    try {
      await deleteSubcategoryProfile({ token, id: profile._id });
      if (editingProfileId === profile._id) resetProfileForm();
      await refresh(token);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <AdminShell title="Categories">
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Form column */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              {editingCategoryId ? "Edit category" : "Add category"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Create a new category with a thumbnail and optional banners.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <form onSubmit={onSaveCategory} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rings"
                  required
                />
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
                <label className="block text-sm font-medium text-slate-700">Thumbnail image</label>
                <div className="relative">
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 shadow-sm"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    required={!editingCategoryId}
                  />
                </div>
                {file && (
                  <p className="text-xs text-slate-500">{file.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Banner images <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-slate-600 hover:file:bg-slate-200 shadow-sm"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setBannerFiles(Array.from(e.target.files ?? []))}
                />
                {bannerFiles.length > 0 && (
                  <p className="text-xs text-slate-500">{bannerFiles.length} file{bannerFiles.length > 1 ? "s" : ""} selected</p>
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
                {loading ? "Saving…" : editingCategoryId ? "Update category" : "Create category"}
              </button>
              {editingCategoryId && (
                <button
                  type="button"
                  onClick={resetCategoryForm}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  Cancel edit
                </button>
              )}
            </form>
          </div>
        </div>

        {/* List column */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">All categories</h2>
              <p className="mt-0.5 text-sm text-slate-500">{categories.length} categor{categories.length === 1 ? "y" : "ies"}</p>
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
            {categories.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
                <LayoutGrid className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">No categories yet. Create one to get started.</p>
              </div>
            )}

            {categories.map((c) => (
              <div key={c._id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {c.thumbnailImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumbnailImage} alt={c.name} className="h-36 w-full object-cover" />
                )}
                {!c.thumbnailImage && (
                  <div className="flex h-24 items-center justify-center bg-slate-50">
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{c.name}</h3>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        <span>Order: {c.displayOrder}</span>
                        <span>Products: {c.productCount}</span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
                      disabled={loading}
                      onClick={() => onEditCategory(c)}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-100 disabled:opacity-60"
                      disabled={loading}
                      onClick={() => onDeleteCategory(c)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>

                  {c.categoryBannerImages.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {c.categoryBannerImages.map((imageUrl) => (
                        <div key={imageUrl} className="overflow-hidden rounded-lg border border-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageUrl} alt={`${c.name} banner`} className="h-16 w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Subcategory profiles
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {(subcategoryProfilesByCategoryId[c._id] ?? []).length} profile
                          {(subcategoryProfilesByCategoryId[c._id] ?? []).length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
                        disabled={!token || profileSaving}
                        onClick={() => {
                          setAddingProfileCategoryId((prev) => (prev === c._id ? null : c._id));
                          setEditingProfileId(null);
                          setProfileName("");
                          setProfileDisplayOrder(0);
                          setProfileIsActive(true);
                          setProfileError(null);
                        }}
                      >
                        <PlusCircle className="h-4 w-4" />
                        Add profile
                      </button>
                    </div>

                    {(subcategoryProfilesByCategoryId[c._id] ?? []).length === 0 && (
                      <p className="text-sm text-slate-400">No profiles yet.</p>
                    )}

                    {(subcategoryProfilesByCategoryId[c._id] ?? []).length > 0 && (
                      <div className="space-y-2">
                        {(subcategoryProfilesByCategoryId[c._id] ?? []).map((p) => (
                          <div
                            key={p._id}
                            className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                              <p className="mt-0.5 text-xs text-slate-500">Order: {p.displayOrder}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  p.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {p.isActive ? "Active" : "Inactive"}
                              </span>
                              <button
                                type="button"
                                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
                                onClick={() => onEditProfile(c._id, p)}
                                disabled={profileSaving}
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </button>
                              <button
                                type="button"
                                className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-100 disabled:opacity-60"
                                onClick={() => onDeleteProfile(p)}
                                disabled={profileSaving}
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {addingProfileCategoryId === c._id && (
                      <form onSubmit={onSaveSubcategoryProfile} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-slate-700">Profile name</label>
                          <input
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="e.g. Wedding filters"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">Display order</label>
                            <input
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                              type="number"
                              value={profileDisplayOrder}
                              onChange={(e) => setProfileDisplayOrder(Number(e.target.value))}
                            />
                          </div>
                          <div className="flex items-end pb-1">
                            <label className="flex cursor-pointer items-center gap-3">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  className="peer sr-only"
                                  checked={profileIsActive}
                                  onChange={(e) => setProfileIsActive(e.target.checked)}
                                />
                                <div className="h-5 w-9 rounded-full bg-slate-200 transition-colors peer-checked:bg-indigo-600" />
                                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                              </div>
                              <span className="text-sm font-medium text-slate-700">Active</span>
                            </label>
                          </div>
                        </div>

                        {profileError && (
                          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" strokeWidth={2} />
                            <p className="text-sm text-red-700">{profileError}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
                            disabled={!token || profileSaving || !profileName.trim()}
                          >
                            {profileSaving ? "Saving…" : editingProfileId ? "Update profile" : "Create profile"}
                          </button>
                          <button
                            type="button"
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                            onClick={resetProfileForm}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
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
