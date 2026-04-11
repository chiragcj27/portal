"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelUpload,
  createSubcategory,
  deleteSubcategory,
  listCategories,
  listSubcategoryProfiles,
  listSubcategories,
  presignSubcategoryUpload,
  updateSubcategory,
} from "@/lib/admin-api";
import { getAdminTokenFromStorage } from "@/lib/admin-auth";
import AdminShell from "@/components/AdminShell";
import {
  PlusCircle,
  RefreshCw,
  AlertCircle,
  Pencil,
  Trash2,
  Layers,
  X,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react";

type Category = Awaited<ReturnType<typeof listCategories>>["categories"][number];
type Subcategory = Awaited<ReturnType<typeof listSubcategories>>["subcategories"][number];
type SubcategoryProfile = Awaited<ReturnType<typeof listSubcategoryProfiles>>["subcategoryProfiles"][number];
type FilterField = Subcategory["filterSchema"][number];
type FilterOption = FilterField["options"][number];

// ─── Filter Schema Editor ────────────────────────────────────────────────────

function OptionTag({
  opt,
  onRemove,
}: {
  opt: FilterOption;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
      {opt.label}
      <span className="text-slate-400">({opt.value})</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-500"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function FilterFieldCard({
  field,
  index,
  onChange,
  onRemove,
}: {
  field: FilterField;
  index: number;
  onChange: (updated: FilterField) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [optLabel, setOptLabel] = useState("");
  const [optValue, setOptValue] = useState("");

  function addOption() {
    const l = optLabel.trim();
    const v = optValue.trim();
    if (!l || !v) return;
    onChange({ ...field, options: [...field.options, { label: l, value: v }] });
    setOptLabel("");
    setOptValue("");
  }

  function removeOption(i: number) {
    onChange({ ...field, options: field.options.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Field header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">
            {field.label || <span className="text-slate-400 italic">Untitled field</span>}
          </p>
          <p className="text-xs text-slate-400">
            key: <code className="font-mono">{field.key || "—"}</code> · {field.type} · order {field.displayOrder}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-red-400 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
          {/* Field meta */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Key</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm font-mono"
                value={field.key}
                onChange={(e) => onChange({ ...field, key: e.target.value })}
                placeholder="e.g. material"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Label</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm"
                value={field.label}
                onChange={(e) => onChange({ ...field, label: e.target.value })}
                placeholder="e.g. Material"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Type</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm"
                value={field.type}
                onChange={(e) =>
                  onChange({ ...field, type: e.target.value as FilterField["type"] })
                }
              >
                <option value="chips">Chips</option>
                <option value="multi_chips">Multi Chips</option>
                <option value="dropdown">Dropdown</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Order</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm"
                type="number"
                value={field.displayOrder}
                onChange={(e) =>
                  onChange({ ...field, displayOrder: Number(e.target.value) })
                }
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">
              Options <span className="text-slate-400">({field.options.length})</span>
            </p>
            {field.options.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {field.options.map((opt, i) => (
                  <OptionTag key={i} opt={opt} onRemove={() => removeOption(i)} />
                ))}
              </div>
            )}
            {field.options.length === 0 && (
              <p className="text-xs text-slate-400 italic">No options yet.</p>
            )}

            {/* Add option row */}
            <div className="flex items-center gap-2 pt-1">
              <input
                className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs placeholder-slate-400 shadow-sm"
                placeholder="Label"
                value={optLabel}
                onChange={(e) => setOptLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
              />
              <input
                className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs placeholder-slate-400 shadow-sm font-mono"
                placeholder="Value"
                value={optValue}
                onChange={(e) => setOptValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
              />
              <button
                type="button"
                onClick={addOption}
                disabled={!optLabel.trim() || !optValue.trim()}
                className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function putToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SubcategoriesPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // Basic fields
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [subcategoryProfiles, setSubcategoryProfiles] = useState<SubcategoryProfile[]>([]);
  const [selectedSubcategoryProfileId, setSelectedSubcategoryProfileId] = useState<string>("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [subcategoryName, setSubcategoryName] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [subcategorySubtext, setSubcategorySubtext] = useState("");
  const [subcategoryDescription, setSubcategoryDescription] = useState("");
  const [subcategoryDisplayOrder, setSubcategoryDisplayOrder] = useState(0);
  const [subcategoryIsActive, setSubcategoryIsActive] = useState(true);
  const [subcategoryIsBestSeller, setSubcategoryIsBestSeller] = useState(false);
  const [subcategoryIsReadyToShip, setSubcategoryIsReadyToShip] = useState(false);
  const [subcategoryInfoText, setSubcategoryInfoText] = useState("");
  const [specialNotePlaceholderText, setSpecialNotePlaceholderText] = useState("");
  const [subcategoryWeightDisplay, setSubcategoryWeightDisplay] = useState<
    "pointer" | "carat" | "both"
  >("pointer");

  // Filter schema
  const [filterFields, setFilterFields] = useState<FilterField[]>([]);
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [newFilterKey, setNewFilterKey] = useState("");
  const [newFilterLabel, setNewFilterLabel] = useState("");
  const [newFilterType, setNewFilterType] = useState<FilterField["type"]>("chips");
  const [newFilterOrder, setNewFilterOrder] = useState(0);

  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [subcategorySaving, setSubcategorySaving] = useState(false);
  const [subcategoryError, setSubcategoryError] = useState<string | null>(null);
  const [subcategoryLoading, setSubcategoryLoading] = useState(false);

  function selectedProfileFilterId(): string | undefined {
    return selectedSubcategoryProfileId && selectedSubcategoryProfileId !== "unassigned"
      ? selectedSubcategoryProfileId
      : undefined;
  }

  useEffect(() => {
    const existing = getAdminTokenFromStorage();
    if (!existing) router.replace("/login");
    else setToken(existing);
  }, [router]);

  const canSave = useMemo(
    () =>
      !!token &&
      !subcategorySaving &&
      !!selectedCategoryId &&
      (!!editingSubcategoryId || !!selectedSubcategoryProfileId) &&
      subcategoryName.trim().length > 0,
    [token, subcategorySaving, selectedCategoryId, subcategoryName, editingSubcategoryId, selectedSubcategoryProfileId]
  );

  async function refreshCategories(t: string) {
    const data = await listCategories({ token: t });
    setCategories(data.categories);
    if (!selectedCategoryId && data.categories.length > 0) {
      setSelectedCategoryId(data.categories[0]._id);
    }
  }

  async function refreshSubcategories(
    t: string,
    categoryId?: string,
    subcategoryProfileId?: string
  ) {
    const data = await listSubcategories({ token: t, categoryId, subcategoryProfileId });
    setSubcategories(data.subcategories);
  }

  async function refreshProfiles(t: string, categoryId?: string) {
    const data = await listSubcategoryProfiles({ token: t, categoryId });
    setSubcategoryProfiles(data.subcategoryProfiles);
    const unassignedValue = "unassigned";
    setSelectedSubcategoryProfileId(
      (prev) => {
        if (prev === unassignedValue) return unassignedValue;
        if (prev && data.subcategoryProfiles.some((p) => p._id === prev)) return prev;
        return data.subcategoryProfiles[0]?._id ?? unassignedValue;
      }
    );
  }

  useEffect(() => {
    if (!token) return;
    setSubcategoryError(null);
    setSubcategoryLoading(true);
    void (async () => {
      try {
        await refreshCategories(token);
      } catch (err) {
        setSubcategoryError(err instanceof Error ? err.message : "Request failed");
      } finally {
        setSubcategoryLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || !selectedCategoryId) return;
    setSubcategoryError(null);
    setProfileLoading(true);
    void (async () => {
      try {
        await refreshProfiles(token, selectedCategoryId);
      } catch (err) {
        setSubcategoryError(err instanceof Error ? err.message : "Request failed");
      } finally {
        setProfileLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedCategoryId]);

  useEffect(() => {
    if (!token || !selectedCategoryId) return;

    setSubcategoryError(null);
    setSubcategoryLoading(true);
    void (async () => {
      try {
        await refreshSubcategories(token, selectedCategoryId, selectedProfileFilterId());
      } catch (err) {
        setSubcategoryError(err instanceof Error ? err.message : "Request failed");
      } finally {
        setSubcategoryLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedCategoryId, selectedSubcategoryProfileId]);

  function resetForm() {
    setEditingSubcategoryId(null);
    setSubcategoryName("");
    setThumbnailFile(null);
    setThumbnailPreviewUrl(null);
    setSubcategorySubtext("");
    setSubcategoryDescription("");
    setSubcategoryDisplayOrder(0);
    setSubcategoryIsActive(true);
    setSubcategoryIsBestSeller(false);
    setSubcategoryIsReadyToShip(false);
    setSubcategoryInfoText("");
    setSpecialNotePlaceholderText("");
    setSubcategoryWeightDisplay("pointer");
    setFilterFields([]);
    setShowAddFilter(false);
    resetNewFilter();
  }

  function resetNewFilter() {
    setNewFilterKey("");
    setNewFilterLabel("");
    setNewFilterType("chips");
    setNewFilterOrder(0);
  }

  function addFilterField() {
    const key = newFilterKey.trim();
    const label = newFilterLabel.trim();
    if (!key || !label) return;
    if (filterFields.some((f) => f.key === key)) {
      setSubcategoryError(`A filter with key "${key}" already exists.`);
      return;
    }
    setFilterFields((prev) => [
      ...prev,
      { key, label, type: newFilterType, displayOrder: newFilterOrder, options: [] },
    ]);
    setShowAddFilter(false);
    resetNewFilter();
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedCategoryId || !subcategoryName.trim()) return;
    if (!editingSubcategoryId && !selectedSubcategoryProfileId) return;
    let thumbnailTmpKey: string | null = null;
    setSubcategorySaving(true);
    setSubcategoryError(null);
    try {
      if (thumbnailFile) {
        const presigned = await presignSubcategoryUpload({
          token,
          fileName: thumbnailFile.name,
          contentType: thumbnailFile.type || "application/octet-stream",
        });
        thumbnailTmpKey = presigned.key;
        await putToPresignedUrl(presigned.uploadUrl, thumbnailFile);
      }

      const common = {
        categoryId: selectedCategoryId,
        name: subcategoryName.trim(),
        subtext: subcategorySubtext.trim() || undefined,
        description: subcategoryDescription.trim() || undefined,
        displayOrder: subcategoryDisplayOrder,
        isActive: subcategoryIsActive,
        isBestSeller: subcategoryIsBestSeller,
        isReadyToShip: subcategoryIsReadyToShip,
        infoText: subcategoryInfoText.trim() || undefined,
        specialNotePlaceholderText: specialNotePlaceholderText.trim() || undefined,
        weightDisplay: subcategoryWeightDisplay,
      };

      if (editingSubcategoryId) {
        await updateSubcategory({
          token,
          id: editingSubcategoryId,
          ...common,
          subcategoryProfileId:
            selectedSubcategoryProfileId === "unassigned"
              ? undefined
              : selectedSubcategoryProfileId || undefined,
          filterSchema: filterFields,
          thumbnailTmpKey: thumbnailTmpKey ?? undefined,
        });
      } else {
        await createSubcategory({
          token,
          ...common,
          subcategoryProfileId: selectedProfileFilterId(),
          filterSchema: filterFields,
          thumbnailTmpKey: thumbnailTmpKey ?? undefined,
        });
      }
      await refreshSubcategories(token, selectedCategoryId, selectedProfileFilterId());
      resetForm();
    } catch (err) {
      setSubcategoryError(err instanceof Error ? err.message : "Request failed");
      if (thumbnailTmpKey) {
        try {
          await cancelUpload({ token, key: thumbnailTmpKey });
        } catch {
          // best-effort cleanup
        }
      }
    } finally {
      setSubcategorySaving(false);
    }
  }

  function onEdit(item: Subcategory) {
    setEditingSubcategoryId(item._id);
    setSelectedCategoryId(item.categoryId);
    setSelectedSubcategoryProfileId(item.subcategoryProfileId ?? "unassigned");
    setSubcategoryName(item.name);
    setThumbnailFile(null);
    setThumbnailPreviewUrl(item.thumbnailImage ?? null);
    setSubcategorySubtext(item.subtext ?? "");
    setSubcategoryDescription(item.description ?? "");
    setSubcategoryDisplayOrder(item.displayOrder ?? 0);
    setSubcategoryIsActive(item.isActive);
    setSubcategoryIsBestSeller(item.isBestSeller);
    setSubcategoryIsReadyToShip(item.isReadyToShip);
    setSubcategoryInfoText(item.infoText ?? "");
    setSpecialNotePlaceholderText(item.specialNotePlaceholderText ?? "");
    setSubcategoryWeightDisplay(item.weightDisplay ?? "pointer");
    setFilterFields(item.filterSchema ? [...item.filterSchema.map((f) => ({ ...f, options: [...f.options] }))] : []);
    setShowAddFilter(false);
    resetNewFilter();
  }

  async function onDelete(item: Subcategory) {
    if (!token) return;
    const ok = confirm(`Delete subcategory "${item.name}"?`);
    if (!ok) return;
    setSubcategorySaving(true);
    setSubcategoryError(null);
    try {
      await deleteSubcategory({ token, id: item._id });
      await refreshSubcategories(token, selectedCategoryId, selectedProfileFilterId());
      if (editingSubcategoryId === item._id) resetForm();
    } catch (err) {
      setSubcategoryError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubcategorySaving(false);
    }
  }

  function Toggle({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
  }) {
    return (
      <label className="flex cursor-pointer items-center gap-3">
        <div className="relative">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <div className="h-5 w-9 rounded-full bg-slate-200 transition-colors peer-checked:bg-indigo-600" />
          <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </label>
    );
  }

  return (
    <AdminShell title="Subcategories">
      <div className="grid gap-8 lg:grid-cols-5">
        {/* ── Left: Form ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {editingSubcategoryId ? "Edit subcategory" : "Add subcategory"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {editingSubcategoryId
                ? "Update details and manage filter fields."
                : "Create a new subcategory within a category and profile."}
            </p>
          </div>

          <form onSubmit={onSave} className="space-y-6">
            {/* ── Basic details card ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Details</p>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Category</label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setSelectedSubcategoryProfileId("");
                    resetForm();
                  }}
                  required
                >
                  <option value="" disabled>Select category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Subcategory profile
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                  value={selectedSubcategoryProfileId}
                  onChange={(e) => setSelectedSubcategoryProfileId(e.target.value)}
                  disabled={profileLoading}
                >
                  <option value="" disabled>
                    {profileLoading ? "Loading profiles…" : "Select profile"}
                  </option>
                  <option value="unassigned">All profiles (legacy)</option>
                  {subcategoryProfiles.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm"
                  value={subcategoryName}
                  onChange={(e) => setSubcategoryName(e.target.value)}
                  placeholder="e.g. Bridal Rings"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Thumbnail image <span className="text-slate-400">(optional)</span>
                </label>

                {thumbnailPreviewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailPreviewUrl}
                    alt="Current thumbnail"
                    className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                  />
                )}

                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 shadow-sm"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
                />

                {thumbnailFile && <p className="text-xs text-slate-500">{thumbnailFile.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Subtext <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm"
                  value={subcategorySubtext}
                  onChange={(e) => setSubcategorySubtext(e.target.value)}
                  placeholder="Short supporting line"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Description <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm"
                  value={subcategoryDescription}
                  onChange={(e) => setSubcategoryDescription(e.target.value)}
                  placeholder="Longer admin note"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Info text <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm"
                  value={subcategoryInfoText}
                  onChange={(e) => setSubcategoryInfoText(e.target.value)}
                  placeholder="Shown to customers"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Special note placeholder text <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm"
                  value={specialNotePlaceholderText}
                  onChange={(e) => setSpecialNotePlaceholderText(e.target.value)}
                  placeholder="e.g. Add ring size or engraving request"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Display order</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                    type="number"
                    value={subcategoryDisplayOrder}
                    onChange={(e) => setSubcategoryDisplayOrder(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Weight display</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                    value={subcategoryWeightDisplay}
                    onChange={(e) =>
                      setSubcategoryWeightDisplay(
                        e.target.value as "pointer" | "carat" | "both"
                      )
                    }
                  >
                    <option value="pointer">Pointer</option>
                    <option value="carat">Carat</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Flags card ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Flags</p>
              <Toggle checked={subcategoryIsActive} onChange={setSubcategoryIsActive} label="Active" />
              <Toggle checked={subcategoryIsBestSeller} onChange={setSubcategoryIsBestSeller} label="Best seller" />
              <Toggle checked={subcategoryIsReadyToShip} onChange={setSubcategoryIsReadyToShip} label="Ready to ship" />
            </div>

            {/* ── Filter Schema card ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-indigo-500" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Filter Schema
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                    {filterFields.length} field{filterFields.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Filter field list */}
                <div className="space-y-3">
                  {filterFields.map((field, i) => (
                    <FilterFieldCard
                      key={field.key || i}
                      field={field}
                      index={i}
                      onChange={(updated) =>
                        setFilterFields((prev) =>
                          prev.map((f, idx) => (idx === i ? updated : f))
                        )
                      }
                      onRemove={() =>
                        setFilterFields((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    />
                  ))}

                  {filterFields.length === 0 && !showAddFilter && (
                    <p className="text-xs text-slate-400 italic">
                      No filter fields defined for this subcategory.
                    </p>
                  )}
                </div>

                {/* Add filter field form */}
                {showAddFilter ? (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3">
                    <p className="text-xs font-semibold text-indigo-700">New filter field</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">Key</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm font-mono"
                          placeholder="e.g. material"
                          value={newFilterKey}
                          onChange={(e) => setNewFilterKey(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">Label</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm"
                          placeholder="e.g. Material"
                          value={newFilterLabel}
                          onChange={(e) => setNewFilterLabel(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">Type</label>
                        <select
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm"
                          value={newFilterType}
                          onChange={(e) => setNewFilterType(e.target.value as FilterField["type"])}
                        >
                          <option value="chips">Chips</option>
                          <option value="multi_chips">Multi Chips</option>
                          <option value="dropdown">Dropdown</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">Order</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm"
                          type="number"
                          value={newFilterOrder}
                          onChange={(e) => setNewFilterOrder(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={addFilterField}
                        disabled={!newFilterKey.trim() || !newFilterLabel.trim()}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Plus className="h-3 w-3" />
                        Add field
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddFilter(false); resetNewFilter(); }}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                      >
                        <X className="h-3 w-3" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddFilter(true)}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 w-full justify-center"
                  >
                    <Plus className="h-4 w-4" />
                    Add filter field
                  </button>
                )}
            </div>

            {subcategoryError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" strokeWidth={2} />
                <p className="text-sm text-red-700">{subcategoryError}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
                disabled={!canSave}
                type="submit"
              >
                <PlusCircle className="h-4 w-4" />
                {subcategorySaving ? "Saving…" : editingSubcategoryId ? "Update subcategory" : "Create subcategory"}
              </button>
              {editingSubcategoryId && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                  onClick={resetForm}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── Right: List ────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">All subcategories</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {subcategoryLoading
                  ? "Loading…"
                  : `${subcategories.length} subcategor${subcategories.length === 1 ? "y" : "ies"} in selected profile`}
              </p>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
              disabled={!token || subcategorySaving || subcategoryLoading}
              onClick={() =>
                token && refreshSubcategories(token, selectedCategoryId, selectedProfileFilterId())
              }
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {subcategoryLoading && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center shadow-sm">
                <p className="text-sm text-slate-500">Loading subcategories…</p>
              </div>
            )}

            {!subcategoryLoading && subcategories.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
                <Layers className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-400">No subcategories in the selected profile.</p>
              </div>
            )}

            {subcategories.map((item) => (
              <div
                key={item._id}
                className={`rounded-xl border bg-white p-4 shadow-sm transition-colors ${
                  editingSubcategoryId === item._id
                    ? "border-indigo-300 ring-1 ring-indigo-200"
                    : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                      {item.isBestSeller && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Best seller
                        </span>
                      )}
                      {item.isReadyToShip && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Ready to ship
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      <span>Order: {item.displayOrder}</span>
                      <span>Products: {item.productCount}</span>
                      <span>Weight: {item.weightDisplay}</span>
                      {item.subtext && (
                        <span>
                          &quot;{item.subtext}&quot;
                        </span>
                      )}
                    </div>
                    {item.filterSchema?.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Filter className="h-3 w-3 text-indigo-400" />
                        {item.filterSchema.map((f) => (
                          <span
                            key={f.key}
                            className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600"
                          >
                            {f.label}
                            <span className="ml-1 text-indigo-400">({f.options.length})</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
                      disabled={subcategorySaving}
                      onClick={() => onEdit(item)}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-100 disabled:opacity-60"
                      disabled={subcategorySaving}
                      onClick={() => onDelete(item)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
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
