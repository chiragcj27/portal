"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bulkUploadProducts,
  createProduct,
  deleteProduct,
  listCategories,
  listProducts,
  listSubcategoryProfiles,
  listSubcategories,
  updateProduct,
} from "@/lib/admin-api";
import { getAdminTokenFromStorage } from "@/lib/admin-auth";
import AdminShell from "@/components/AdminShell";
import { AlertCircle, PackagePlus, Pencil, RefreshCw, Trash2, Upload, X } from "lucide-react";

type Category = Awaited<ReturnType<typeof listCategories>>["categories"][number];
type SubcategoryProfile = Awaited<ReturnType<typeof listSubcategoryProfiles>>["subcategoryProfiles"][number];
type Subcategory = Awaited<ReturnType<typeof listSubcategories>>["subcategories"][number];
type Product = Awaited<ReturnType<typeof listProducts>>["products"][number];
type FilterField = Subcategory["filterSchema"][number];

/** Stable fallback so `useEffect(..., [filterSchema])` does not see a new `[]` every render. */
const EMPTY_FILTER_SCHEMA: FilterField[] = [];

type DiamondInput = {
  shape: string;
  sieveSize: string;
  mmSize: string;
  pcs: number;
  avgPointer: number;
  ctWeight: number;
};

export default function ProductsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategoryProfiles, setSubcategoryProfiles] = useState<SubcategoryProfile[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryProfileId, setSelectedSubcategoryProfileId] = useState("unassigned");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [styleNo, setStyleNo] = useState("");
  const [makeType, setMakeType] = useState("");
  const [description, setDescription] = useState("");
  const [remarks, setRemarks] = useState("");
  const [diamonds, setDiamonds] = useState<DiamondInput[]>([
    { shape: "", sieveSize: "", mmSize: "", pcs: 0, avgPointer: 0, ctWeight: 0 },
  ]);
  const [totalDiamondPcs, setTotalDiamondPcs] = useState(0);
  const [totalDiamondWeightCt, setTotalDiamondWeightCt] = useState(0);
  const [pointer, setPointer] = useState(0);
  const [gold10KLabel, setGold10KLabel] = useState("Gold 10K");
  const [gold10K, setGold10K] = useState(0);
  const [gold14KLabel, setGold14KLabel] = useState("Gold 14K");
  const [gold14K, setGold14K] = useState(0);
  const [gold18KLabel, setGold18KLabel] = useState("Gold 18K");
  const [gold18K, setGold18K] = useState(0);
  const [silverLabel, setSilverLabel] = useState("Silver");
  const [silver, setSilver] = useState(0);
  const [platinumLabel, setPlatinumLabel] = useState("Platinum");
  const [platinum, setPlatinum] = useState(0);
  const [imagesCsv, setImagesCsv] = useState("");
  const [embeddingCsv, setEmbeddingCsv] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isReadyToShip, setIsReadyToShip] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string | string[]>>({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    created: number;
    errors: Array<{ row: number; styleNo?: string; error: string }>;
  } | null>(null);

  function addDiamondRow() {
    setDiamonds((prev) => [
      ...prev,
      { shape: "", sieveSize: "", mmSize: "", pcs: 0, avgPointer: 0, ctWeight: 0 },
    ]);
  }

  function removeDiamondRow(index: number) {
    setDiamonds((prev) => prev.filter((_, i) => i !== index));
  }

  function updateDiamondRow(index: number, patch: Partial<DiamondInput>) {
    setDiamonds((prev) => prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  function resetForm() {
    setEditingProductId(null);
    setStyleNo("");
    setMakeType("");
    setDescription("");
    setRemarks("");
    setDiamonds([{ shape: "", sieveSize: "", mmSize: "", pcs: 0, avgPointer: 0, ctWeight: 0 }]);
    setTotalDiamondPcs(0);
    setTotalDiamondWeightCt(0);
    setPointer(0);
    setGold10KLabel("Gold 10K");
    setGold10K(0);
    setGold14KLabel("Gold 14K");
    setGold14K(0);
    setGold18KLabel("Gold 18K");
    setGold18K(0);
    setSilverLabel("Silver");
    setSilver(0);
    setPlatinumLabel("Platinum");
    setPlatinum(0);
    setImagesCsv("");
    setEmbeddingCsv("");
    setDisplayOrder(0);
    setIsActive(true);
    setIsBestSeller(false);
    setIsReadyToShip(false);
    setSelectedFilters({});
  }

  useEffect(() => {
    const existing = getAdminTokenFromStorage();
    if (!existing) router.replace("/login");
    else setToken(existing);
  }, [router]);

  const selectedSubcategory = useMemo(
    () => subcategories.find((s) => s._id === selectedSubcategoryId),
    [subcategories, selectedSubcategoryId]
  );

  const filterSchema = useMemo(
    () => selectedSubcategory?.filterSchema ?? EMPTY_FILTER_SCHEMA,
    [selectedSubcategory],
  );

  const canCreate = useMemo(
    () =>
      Boolean(
        token &&
          selectedCategoryId &&
          selectedSubcategoryId &&
          styleNo.trim() &&
          !saving
      ),
    [token, selectedCategoryId, selectedSubcategoryId, styleNo, saving]
  );

  async function refreshCategoriesAndProducts(t: string) {
    const categoryData = await listCategories({ token: t });
    setCategories(categoryData.categories);
    const nextCategoryId = selectedCategoryId || categoryData.categories[0]?._id || "";
    setSelectedCategoryId(nextCategoryId);
    if (!nextCategoryId) {
      setSubcategoryProfiles([]);
      setSubcategories([]);
      setProducts([]);
      return;
    }

    const profileData = await listSubcategoryProfiles({ token: t, categoryId: nextCategoryId });
    setSubcategoryProfiles(profileData.subcategoryProfiles);
    const nextSubcategoryProfileId =
      selectedSubcategoryProfileId || profileData.subcategoryProfiles[0]?._id || "unassigned";
    setSelectedSubcategoryProfileId(nextSubcategoryProfileId);

    const subcategoryData = await listSubcategories({
      token: t,
      categoryId: nextCategoryId,
      subcategoryProfileId:
        nextSubcategoryProfileId && nextSubcategoryProfileId !== "unassigned"
          ? nextSubcategoryProfileId
          : undefined,
    });
    setSubcategories(subcategoryData.subcategories);
    const nextSubcategoryId = selectedSubcategoryId || subcategoryData.subcategories[0]?._id || "";
    setSelectedSubcategoryId(nextSubcategoryId);

    const productData = await listProducts({
      token: t,
      categoryId: nextCategoryId,
      subcategoryId: nextSubcategoryId || undefined,
    });
    setProducts(productData.products);
  }

  useEffect(() => {
    if (!token) return;
    setError(null);
    setLoading(true);
    void (async () => {
      try {
        await refreshCategoriesAndProducts(token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || !selectedCategoryId) return;
    setError(null);
    void (async () => {
      try {
        const profileData = await listSubcategoryProfiles({ token, categoryId: selectedCategoryId });
        setSubcategoryProfiles(profileData.subcategoryProfiles);
        const firstProfileId = profileData.subcategoryProfiles[0]?._id || "unassigned";
        setSelectedSubcategoryProfileId(firstProfileId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    })();
  }, [token, selectedCategoryId]);

  useEffect(() => {
    if (!token || !selectedCategoryId) return;
    setError(null);
    void (async () => {
      try {
        const subcategoryData = await listSubcategories({
          token,
          categoryId: selectedCategoryId,
          subcategoryProfileId:
            selectedSubcategoryProfileId && selectedSubcategoryProfileId !== "unassigned"
              ? selectedSubcategoryProfileId
              : undefined,
        });
        setSubcategories(subcategoryData.subcategories);
        const firstSubcategoryId = subcategoryData.subcategories[0]?._id || "";
        setSelectedSubcategoryId(firstSubcategoryId);
        const productData = await listProducts({
          token,
          categoryId: selectedCategoryId,
          subcategoryId: firstSubcategoryId || undefined,
        });
        setProducts(productData.products);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    })();
  }, [token, selectedCategoryId, selectedSubcategoryProfileId]);

  useEffect(() => {
    if (!token || !selectedCategoryId) return;
    setError(null);
    void (async () => {
      try {
        const productData = await listProducts({
          token,
          categoryId: selectedCategoryId,
          subcategoryId: selectedSubcategoryId || undefined,
        });
        setProducts(productData.products);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    })();
  }, [token, selectedCategoryId, selectedSubcategoryId]);

  useEffect(() => {
    const defaults: Record<string, string | string[]> = {};
    for (const field of filterSchema) {
      defaults[field.key] = field.type === "multi_chips" ? [] : "";
    }
    setSelectedFilters(defaults);
  }, [selectedSubcategoryId, filterSchema]);

  async function onCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedCategoryId || !selectedSubcategoryId || !styleNo.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const parsedDiamonds = diamonds
        .map((entry) => ({
          shape: entry.shape.trim() || undefined,
          sieveSize: entry.sieveSize.trim() || undefined,
          mmSize: entry.mmSize.trim() || undefined,
          pcs: Number.isFinite(entry.pcs) ? Number(entry.pcs) : undefined,
          avgPointer: Number.isFinite(entry.avgPointer) ? Number(entry.avgPointer) : undefined,
          ctWeight: Number.isFinite(entry.ctWeight) ? Number(entry.ctWeight) : undefined,
        }))
        .filter(
          (entry) =>
            Boolean(entry.shape) ||
            Boolean(entry.sieveSize) ||
            Boolean(entry.mmSize) ||
            entry.pcs !== undefined ||
            entry.avgPointer !== undefined ||
            entry.ctWeight !== undefined
        );

      const embedding = embeddingCsv
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v));

      const filterPayload = filterSchema
        .map((field) => {
          const value = selectedFilters[field.key];
          return {
            filterName: field.label || field.key,
            filterValue: value,
          };
        })
        .filter((entry) => {
          if (Array.isArray(entry.filterValue)) return entry.filterValue.length > 0;
          return Boolean(entry.filterValue);
        });

      const payload = {
        token,
        styleNo: styleNo.trim(),
        categoryId: selectedCategoryId,
        subcategoryProfileId:
          selectedSubcategoryProfileId && selectedSubcategoryProfileId !== "unassigned"
            ? selectedSubcategoryProfileId
            : undefined,
        subcategoryId: selectedSubcategoryId,
        makeType: makeType.trim() || undefined,
        description: description.trim() || undefined,
        remarks: remarks.trim() || undefined,
        diamonds: parsedDiamonds,
        totalDiamondPcs,
        totalDiamondWeightCt,
        pointer,
        metalWeights: {
          gold10K: { label: gold10KLabel.trim() || "Gold 10K", value: gold10K },
          gold14K: { label: gold14KLabel.trim() || "Gold 14K", value: gold14K },
          gold18K: { label: gold18KLabel.trim() || "Gold 18K", value: gold18K },
          silver: { label: silverLabel.trim() || "Silver", value: silver },
          platinum: { label: platinumLabel.trim() || "Platinum", value: platinum },
        },
        images: imagesCsv
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean),
        embedding,
        displayOrder,
        isActive,
        isBestSeller,
        isReadyToShip,
        filter: filterPayload,
      };

      if (editingProductId) {
        await updateProduct({ ...payload, id: editingProductId });
      } else {
        await createProduct(payload);
      }

      resetForm();
      const productData = await listProducts({
        token,
        categoryId: selectedCategoryId,
        subcategoryId: selectedSubcategoryId,
      });
      setProducts(productData.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  async function onEditProduct(product: Product) {
    setEditingProductId(product._id);
    setSelectedCategoryId(product.categoryId);
    setSelectedSubcategoryProfileId(product.subcategoryProfileId ?? "unassigned");
    setSelectedSubcategoryId(product.subcategoryId);
    setStyleNo(product.styleNo);
    setMakeType(product.makeType ?? "");
    setDescription(product.description ?? "");
    setRemarks(product.remarks ?? "");
    setDiamonds(
      product.diamonds?.length
        ? product.diamonds.map((d) => ({
            shape: d.shape ?? "",
            sieveSize: d.sieveSize ?? "",
            mmSize: d.mmSize ?? "",
            pcs: d.pcs ?? 0,
            avgPointer: d.avgPointer ?? 0,
            ctWeight: d.ctWeight ?? 0,
          }))
        : [{ shape: "", sieveSize: "", mmSize: "", pcs: 0, avgPointer: 0, ctWeight: 0 }]
    );
    setTotalDiamondPcs(product.totalDiamondPcs ?? 0);
    setTotalDiamondWeightCt(product.totalDiamondWeightCt ?? 0);
    setPointer(product.pointer ?? 0);
    setGold10KLabel(product.metalWeights?.gold10K?.label ?? "Gold 10K");
    setGold10K(product.metalWeights?.gold10K?.value ?? 0);
    setGold14KLabel(product.metalWeights?.gold14K?.label ?? "Gold 14K");
    setGold14K(product.metalWeights?.gold14K?.value ?? 0);
    setGold18KLabel(product.metalWeights?.gold18K?.label ?? "Gold 18K");
    setGold18K(product.metalWeights?.gold18K?.value ?? 0);
    setSilverLabel(product.metalWeights?.silver?.label ?? "Silver");
    setSilver(product.metalWeights?.silver?.value ?? 0);
    setPlatinumLabel(product.metalWeights?.platinum?.label ?? "Platinum");
    setPlatinum(product.metalWeights?.platinum?.value ?? 0);
    setImagesCsv((product.images ?? []).join(", "));
    setEmbeddingCsv((product.embedding ?? []).join(", "));
    setDisplayOrder(product.displayOrder ?? 0);
    setIsActive(product.isActive ?? true);
    setIsBestSeller(product.isBestSeller ?? false);
    setIsReadyToShip(product.isReadyToShip ?? false);

    const nextFilters: Record<string, string | string[]> = {};
    for (const f of product.filter ?? []) {
      nextFilters[f.filterName] = f.filterValue;
    }
    setSelectedFilters(nextFilters);
  }

  async function onDeleteProduct(product: Product) {
    if (!token) return;
    const ok = confirm(`Delete product "${product.styleNo}"?`);
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      await deleteProduct({ token, id: product._id });
      if (editingProductId === product._id) resetForm();
      const productData = await listProducts({
        token,
        categoryId: selectedCategoryId,
        subcategoryId: selectedSubcategoryId || undefined,
      });
      setProducts(productData.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  async function onBulkUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !bulkFile) return;
    setBulkUploading(true);
    setError(null);
    setBulkResult(null);
    try {
      const result = await bulkUploadProducts({ token, file: bulkFile });
      setBulkResult(result);
      setBulkFile(null);
      const productData = await listProducts({
        token,
        categoryId: selectedCategoryId,
        subcategoryId: selectedSubcategoryId || undefined,
      });
      setProducts(productData.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk upload failed");
    } finally {
      setBulkUploading(false);
    }
  }

  function renderFilterField(field: FilterField) {
    if (field.type === "multi_chips") {
      const current = Array.isArray(selectedFilters[field.key]) ? (selectedFilters[field.key] as string[]) : [];
      return (
        <div className="flex flex-wrap gap-2">
          {field.options.map((option) => {
            const checked = current.includes(option.value);
            return (
              <label
                key={option.value}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  checked
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <input
                  type="checkbox"
                  className="mr-1.5"
                  checked={checked}
                  onChange={(e) => {
                    setSelectedFilters((prev) => {
                      const base = Array.isArray(prev[field.key]) ? (prev[field.key] as string[]) : [];
                      const next = e.target.checked
                        ? [...base, option.value]
                        : base.filter((v) => v !== option.value);
                      return { ...prev, [field.key]: next };
                    });
                  }}
                />
                {option.label}
              </label>
            );
          })}
        </div>
      );
    }

    return (
      <select
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
        value={typeof selectedFilters[field.key] === "string" ? (selectedFilters[field.key] as string) : ""}
        onChange={(e) => setSelectedFilters((prev) => ({ ...prev, [field.key]: e.target.value }))}
      >
        <option value="">Select {field.label}</option>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <AdminShell title="Products">
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {editingProductId ? "Edit product" : "Create product"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Choose a subcategory and assign filter values from its filter schema.
            </p>
          </div>

          <form
            onSubmit={onBulkUpload}
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-2">
              <Upload className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Bulk upload (Excel)</h3>
                <p className="mt-1 text-xs text-slate-500">
                  <span className="font-medium text-slate-800">Category</span>,{" "}
                  <span className="font-medium text-slate-800">subcategory</span>, and optional{" "}
                  <span className="font-medium text-slate-800">subcategoryProfile</span> must already exist in Admin
                  (Categories / Subcategories) and be <span className="font-medium text-slate-800">active</span> — names
                  in Excel must match (case-insensitive). Nothing is created from the sheet. One{" "}
                  <span className="font-medium text-slate-700">Style No</span> = one product. Put category, subcategory,
                  and main details on that row. For more diamonds or metal lines, add the next row(s) with
                  the same columns but leave <span className="font-medium text-slate-700">styleNo</span> empty — those
                  lines attach to the style above (like a classic inventory sheet). A new SKU on a new row starts a new
                  product. Diamond columns per row:{" "}
                  <span className="font-medium text-slate-700">diamond_item_code</span>,{" "}
                  <span className="font-medium text-slate-700">diamond_shape</span>,{" "}
                  <span className="font-medium text-slate-700">diamond_size</span>,{" "}
                  <span className="font-medium text-slate-700">diamond_pcs</span>,{" "}
                  <span className="font-medium text-slate-700">diamond_avg_pointer</span>,{" "}
                  <span className="font-medium text-slate-700">diamond_wt</span>. Metal:{" "}
                  <span className="font-medium text-slate-700">metal_item_code</span> +{" "}
                  <span className="font-medium text-slate-700">metal_wt</span> (e.g. G14KT), or use the gold/silver columns.
                  Optional column <span className="font-medium text-slate-700">filters</span>: plain text{" "}
                  <span className="font-medium text-slate-700">Label: value; Label2: value2</span> (match admin filter
                  labels).{" "}
                  <a
                    href="/sample-product-bulk-upload.xlsx"
                    download="sample-product-bulk-upload.xlsx"
                    className="font-medium text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-800"
                  >
                    Download sample Excel
                  </a>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="text-sm text-slate-700 file:mr-2 file:rounded-lg file:border file:border-slate-200 file:bg-slate-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
                disabled={!token || bulkUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setBulkFile(f ?? null);
                  setBulkResult(null);
                }}
              />
              <button
                type="submit"
                disabled={!token || !bulkFile || bulkUploading}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkUploading ? "Uploading…" : "Upload & import"}
              </button>
            </div>
            {bulkResult && (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-800">
                  Created {bulkResult.created} product{bulkResult.created === 1 ? "" : "s"}
                  {bulkResult.errors.length > 0 ? (
                    <span className="font-normal text-slate-600">
                      {" "}
                      · {bulkResult.errors.length} row{bulkResult.errors.length === 1 ? "" : "s"} failed
                    </span>
                  ) : null}
                </p>
                {bulkResult.errors.length > 0 && (
                  <ul className="mt-2 max-h-40 list-inside list-disc space-y-1 overflow-y-auto text-xs text-red-700">
                    {bulkResult.errors.map((err, idx) => (
                      <li key={`${err.row}-${idx}-${err.error}`}>
                        Row {err.row}
                        {err.styleNo ? ` (${err.styleNo})` : ""}: {err.error}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </form>

          <form onSubmit={onCreateProduct} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Category</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                required
              >
                <option value="" disabled>Select category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Subcategory profile</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                value={selectedSubcategoryProfileId}
                onChange={(e) => setSelectedSubcategoryProfileId(e.target.value)}
              >
                <option value="unassigned">No subcategory profile (legacy)</option>
                {subcategoryProfiles.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Subcategory</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                value={selectedSubcategoryId}
                onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                required
              >
                <option value="" disabled>Select subcategory</option>
                {subcategories.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Style no</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                value={styleNo}
                onChange={(e) => setStyleNo(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Make type</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                value={makeType}
                onChange={(e) => setMakeType(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Remarks</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Diamonds</label>
                <button
                  type="button"
                  onClick={addDiamondRow}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Add diamond
                </button>
              </div>
              <div className="space-y-2">
                {diamonds.map((entry, index) => (
                  <div key={index} className="rounded-lg border border-slate-200 bg-white p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-500">Diamond {index + 1}</p>
                      {diamonds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDiamondRow(index)}
                          className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">Shape</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 shadow-sm"
                          placeholder="Round"
                          value={entry.shape}
                          onChange={(e) => updateDiamondRow(index, { shape: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">Sieve size</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 shadow-sm"
                          placeholder="1.0"
                          value={entry.sieveSize}
                          onChange={(e) => updateDiamondRow(index, { sieveSize: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">MM size</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 shadow-sm"
                          placeholder="1.2"
                          value={entry.mmSize}
                          onChange={(e) => updateDiamondRow(index, { mmSize: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">PCS</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 shadow-sm"
                          type="number"
                          placeholder="0"
                          value={entry.pcs}
                          onChange={(e) => updateDiamondRow(index, { pcs: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">Avg pointer</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 shadow-sm"
                          type="number"
                          step="0.001"
                          placeholder="0"
                          value={entry.avgPointer}
                          onChange={(e) => updateDiamondRow(index, { avgPointer: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">CT weight</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 shadow-sm"
                          type="number"
                          step="0.001"
                          placeholder="0"
                          value={entry.ctWeight}
                          onChange={(e) => updateDiamondRow(index, { ctWeight: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Total Diamond Pcs</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                  type="number"
                  value={totalDiamondPcs}
                  onChange={(e) => setTotalDiamondPcs(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Total Weight Ct</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                  type="number"
                  step="0.001"
                  value={totalDiamondWeightCt}
                  onChange={(e) => setTotalDiamondWeightCt(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Pointer</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                  type="number"
                  step="0.001"
                  value={pointer}
                  onChange={(e) => setPointer(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Metal Weights</p>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Gold 10K label</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                      value={gold10KLabel}
                      onChange={(e) => setGold10KLabel(e.target.value)}
                      placeholder="Gold 10K"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Gold 10K value</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                      type="number"
                      step="0.001"
                      placeholder="0"
                      value={gold10K}
                      onChange={(e) => setGold10K(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Gold 14K label</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                      value={gold14KLabel}
                      onChange={(e) => setGold14KLabel(e.target.value)}
                      placeholder="Gold 14K"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Gold 14K value</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                      type="number"
                      step="0.001"
                      placeholder="0"
                      value={gold14K}
                      onChange={(e) => setGold14K(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Gold 18K label</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                      value={gold18KLabel}
                      onChange={(e) => setGold18KLabel(e.target.value)}
                      placeholder="Gold 18K"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Gold 18K value</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                      type="number"
                      step="0.001"
                      placeholder="0"
                      value={gold18K}
                      onChange={(e) => setGold18K(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Silver label</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                      value={silverLabel}
                      onChange={(e) => setSilverLabel(e.target.value)}
                      placeholder="Silver"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Silver value</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                      type="number"
                      step="0.001"
                      placeholder="0"
                      value={silver}
                      onChange={(e) => setSilver(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Platinum label</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                      value={platinumLabel}
                      onChange={(e) => setPlatinumLabel(e.target.value)}
                      placeholder="Platinum"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Platinum value</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                      type="number"
                      step="0.001"
                      placeholder="0"
                      value={platinum}
                      onChange={(e) => setPlatinum(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Image URLs (comma-separated)
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                value={imagesCsv}
                onChange={(e) => setImagesCsv(e.target.value)}
                placeholder="https://.../1.jpg, https://.../2.jpg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Embedding vector (comma-separated numbers)
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                value={embeddingCsv}
                onChange={(e) => setEmbeddingCsv(e.target.value)}
                placeholder="0.021, -0.33, 1.2"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Display order</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
              />
            </div>

            {filterSchema.length > 0 && (
              <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filters</p>
                {filterSchema.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">{field.label}</label>
                    {renderFilterField(field)}
                  </div>
                ))}
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={isBestSeller} onChange={(e) => setIsBestSeller(e.target.checked)} />
              Best seller
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={isReadyToShip} onChange={(e) => setIsReadyToShip(e.target.checked)} />
              Ready to ship
            </label>

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
              disabled={!canCreate}
              type="submit"
            >
              <PackagePlus className="h-4 w-4" />
              {saving ? "Saving..." : editingProductId ? "Update product" : "Create product"}
            </button>
            {editingProductId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Cancel edit
              </button>
            )}
          </form>
        </div>

        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Products</h2>
              <p className="text-sm text-slate-500">
                {loading ? "Loading..." : `${products.length} product${products.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => token && refreshCategoriesAndProducts(token)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {products.map((product) => (
              <div key={product._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{product.styleNo}</span>
                    {!product.isActive && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Inactive</span>
                    )}
                    {product.isBestSeller && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Best seller</span>
                    )}
                    {product.isReadyToShip && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">Ready to ship</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEditProduct(product)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteProduct(product)}
                      className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 shadow-sm hover:bg-red-100"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {product.makeType || "No make type"} · {product.images.length} image{product.images.length === 1 ? "" : "s"}
                </p>
                {product.filter?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {product.filter.map((f) => (
                      <span
                        key={`${product._id}-${f.filterName}`}
                        className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                      >
                        {f.filterName}: {Array.isArray(f.filterValue) ? f.filterValue.join(", ") : f.filterValue}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!loading && products.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
                No products yet for selected subcategory.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
