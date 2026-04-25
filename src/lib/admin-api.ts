type AdminLoginResponse = {
  token: string;
};

type CreateClientResponse = {
  clientName: string;
  username: string;
  password: string;
};

type Banner = {
  _id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Category = {
  _id: string;
  name: string;
  thumbnailImage?: string;
  categoryBannerImages: string[];
  productCount: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type SubcategoryProfile = {
  _id: string;
  categoryId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Subcategory = {
  _id: string;
  categoryId: string;
  subcategoryProfileId?: string;
  name: string;
  subtext?: string;
  description?: string;
  thumbnailImage?: string;
  images: string[];
  displayOrder: number;
  isActive: boolean;
  isBestSeller: boolean;
  isReadyToShip: boolean;
  productCount: number;
  infoText?: string;
  specialNotePlaceholderText?: string;
  weightDisplay: "pointer" | "carat" | "both";
  filterSchema: Array<{
    key: string;
    label: string;
    type: "chips" | "multi_chips" | "dropdown";
    displayOrder: number;
    options: Array<{ label: string; value: string }>;
  }>;
  createdAt: string;
  updatedAt: string;
};

type Product = {
  _id: string;
  styleNo: string;
  categoryId: string;
  subcategoryProfileId?: string;
  subcategoryId: string;
  makeType?: string;
  description?: string;
  remarks?: string;
  diamonds: Array<{
    shape?: string;
    sieveSize?: string;
    mmSize?: string;
    pcs?: number;
    avgPointer?: number;
    ctWeight?: number;
  }>;
  totalDiamondPcs: number;
  totalDiamondWeightCt: number;
  pointer: number;
  metalWeights: {
    gold10K?: { label?: string; value?: number };
    gold14K?: { label?: string; value?: number };
    gold18K?: { label?: string; value?: number };
    silver?: { label?: string; value?: number };
    platinum?: { label?: string; value?: number };
  };
  images: string[];
  embedding?: number[];
  displayOrder: number;
  isActive: boolean;
  isBestSeller: boolean;
  isReadyToShip: boolean;
  filter: Array<{ filterName: string; filterValue: string | string[] }>;
  createdAt: string;
  updatedAt: string;
};

type StoneShape = {
  _id: string;
  name: string;
  thumbnailImage: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ErrorResponse = {
  error?: string;
  /** Excel row number (e.g. bulk upload layout errors). */
  row?: number;
};

/** Base URL of the chandra_backend Express API (admin routes, bulk upload, etc.). Not the legacy `backend/` service. */
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") ??
  "http://localhost:3000";

function isHtmlResponse(res: Response, bodyText: string): boolean {
  const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("text/html")) return true;
  return bodyText.trimStart().startsWith("<!DOCTYPE") || bodyText.trimStart().startsWith("<html");
}

async function parseError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (isHtmlResponse(res, text)) {
      return `Received HTML from ${BACKEND_URL}. Check NEXT_PUBLIC_BACKEND_URL and ensure backend API is running on a different port than Next.js.`;
    }
    const data = JSON.parse(text) as ErrorResponse;
    if (data?.error) {
      if (typeof data.row === "number") return `${data.error} (Excel row ${data.row})`;
      return data.error;
    }
  } catch {
    // ignore
  }
  return `${res.status} ${res.statusText}`;
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (isHtmlResponse(res, text)) {
    throw new Error(
      `Received HTML from ${BACKEND_URL}. Check NEXT_PUBLIC_BACKEND_URL and ensure backend API is running on a different port than Next.js.`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response from ${BACKEND_URL}`);
  }
}

export async function adminLogin(params: {
  email: string;
  password: string;
}): Promise<AdminLoginResponse> {
  const res = await fetch(`${BACKEND_URL}/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: params.email,
      password: params.password,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return await parseJsonOrThrow<AdminLoginResponse>(res);
}

export async function createClient(params: {
  token: string;
  clientName: string;
}): Promise<CreateClientResponse> {
  const res = await fetch(`${BACKEND_URL}/admin/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      clientName: params.clientName,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return await parseJsonOrThrow<CreateClientResponse>(res);
}

export async function presignBannerUpload(params: {
  token: string;
  fileName: string;
  contentType: string;
}): Promise<{ key: string; uploadUrl: string }> {
  const res = await fetch(`${BACKEND_URL}/admin/uploads/banner/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({ fileName: params.fileName, contentType: params.contentType }),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ key: string; uploadUrl: string }>(res);
}

export async function presignCategoryUpload(params: {
  token: string;
  fileName: string;
  contentType: string;
}): Promise<{ key: string; uploadUrl: string }> {
  const res = await fetch(`${BACKEND_URL}/admin/uploads/category/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({ fileName: params.fileName, contentType: params.contentType }),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ key: string; uploadUrl: string }>(res);
}

export async function presignSubcategoryUpload(params: {
  token: string;
  fileName: string;
  contentType: string;
}): Promise<{ key: string; uploadUrl: string }> {
  const res = await fetch(`${BACKEND_URL}/admin/uploads/subcategory/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({ fileName: params.fileName, contentType: params.contentType }),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ key: string; uploadUrl: string }>(res);
}

export async function cancelUpload(params: { token: string; key: string }): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/admin/uploads/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({ key: params.key }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export type LibraryMediaItem = {
  key: string;
  publicUrl: string;
  lastModified: string;
  size: number;
};

export async function presignLibraryUpload(params: {
  token: string;
  fileName: string;
  contentType: string;
}): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
  const res = await fetch(`${BACKEND_URL}/admin/uploads/library/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({ fileName: params.fileName, contentType: params.contentType }),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ key: string; uploadUrl: string; publicUrl: string }>(res);
}

export async function listLibraryMedia(params: {
  token: string;
  continuationToken?: string;
}): Promise<{ items: LibraryMediaItem[]; nextContinuationToken?: string }> {
  const searchParams = new URLSearchParams();
  if (params.continuationToken) searchParams.set("continuationToken", params.continuationToken);
  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const res = await fetch(`${BACKEND_URL}/admin/uploads/library${query}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ items: LibraryMediaItem[]; nextContinuationToken?: string }>(res);
}

export async function deleteLibraryMedia(params: { token: string; key: string }): Promise<void> {
  const q = new URLSearchParams({ key: params.key });
  const res = await fetch(`${BACKEND_URL}/admin/uploads/library?${q}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function listBanners(params: { token: string }): Promise<{ banners: Banner[] }> {
  const res = await fetch(`${BACKEND_URL}/admin/banners`, {
    method: "GET",
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ banners: Banner[] }>(res);
}

export async function createBanner(params: {
  token: string;
  title: string;
  linkUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
  tmpKey: string;
}): Promise<{ banner: Banner }> {
  const res = await fetch(`${BACKEND_URL}/admin/banners`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      title: params.title,
      linkUrl: params.linkUrl,
      displayOrder: params.displayOrder,
      isActive: params.isActive,
      tmpKey: params.tmpKey,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ banner: Banner }>(res);
}

export async function updateBanner(params: {
  token: string;
  id: string;
  title?: string;
  linkUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
  tmpKey?: string;
}): Promise<{ banner: Banner }> {
  const res = await fetch(`${BACKEND_URL}/admin/banners/${params.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      title: params.title,
      linkUrl: params.linkUrl,
      displayOrder: params.displayOrder,
      isActive: params.isActive,
      tmpKey: params.tmpKey,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ banner: Banner }>(res);
}

export async function deleteBanner(params: { token: string; id: string }): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/admin/banners/${params.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function listCategories(params: { token: string }): Promise<{ categories: Category[] }> {
  const res = await fetch(`${BACKEND_URL}/admin/categories`, {
    method: "GET",
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ categories: Category[] }>(res);
}

export async function listSubcategories(params: {
  token: string;
  categoryId?: string;
  subcategoryProfileId?: string;
}): Promise<{ subcategories: Subcategory[] }> {
  const searchParams = new URLSearchParams();
  if (params.categoryId) searchParams.set("categoryId", params.categoryId);
  if (params.subcategoryProfileId) searchParams.set("subcategoryProfileId", params.subcategoryProfileId);
  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const res = await fetch(`${BACKEND_URL}/admin/subcategories${query}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ subcategories: Subcategory[] }>(res);
}

export async function listSubcategoryProfiles(params: {
  token: string;
  categoryId?: string;
}): Promise<{ subcategoryProfiles: SubcategoryProfile[] }> {
  const searchParams = new URLSearchParams();
  if (params.categoryId) searchParams.set("categoryId", params.categoryId);
  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const res = await fetch(`${BACKEND_URL}/admin/subcategory-profiles${query}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ subcategoryProfiles: SubcategoryProfile[] }>(res);
}

export async function createSubcategoryProfile(params: {
  token: string;
  categoryId: string;
  name: string;
  displayOrder?: number;
  isActive?: boolean;
}): Promise<{ subcategoryProfile: SubcategoryProfile }> {
  const res = await fetch(`${BACKEND_URL}/admin/subcategory-profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      categoryId: params.categoryId,
      name: params.name,
      displayOrder: params.displayOrder,
      isActive: params.isActive,
    }),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ subcategoryProfile: SubcategoryProfile }>(res);
}

export async function updateSubcategoryProfile(params: {
  token: string;
  id: string;
  name?: string;
  displayOrder?: number;
  isActive?: boolean;
}): Promise<{ subcategoryProfile: SubcategoryProfile }> {
  const res = await fetch(`${BACKEND_URL}/admin/subcategory-profiles/${params.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      name: params.name,
      displayOrder: params.displayOrder,
      isActive: params.isActive,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ subcategoryProfile: SubcategoryProfile }>(res);
}

export async function deleteSubcategoryProfile(params: {
  token: string;
  id: string;
}): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/admin/subcategory-profiles/${params.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function createSubcategory(params: {
  token: string;
  categoryId: string;
  subcategoryProfileId?: string;
  name: string;
  displayOrder?: number;
  isActive?: boolean;
  isBestSeller?: boolean;
  isReadyToShip?: boolean;
  subtext?: string;
  description?: string;
  infoText?: string;
  specialNotePlaceholderText?: string;
  thumbnailTmpKey?: string;
  weightDisplay?: "pointer" | "carat" | "both";
  filterSchema?: Subcategory["filterSchema"];
}): Promise<{ subcategory: Subcategory }> {
  const res = await fetch(`${BACKEND_URL}/admin/subcategories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      categoryId: params.categoryId,
      subcategoryProfileId: params.subcategoryProfileId,
      name: params.name,
      displayOrder: params.displayOrder,
      isActive: params.isActive,
      isBestSeller: params.isBestSeller,
      isReadyToShip: params.isReadyToShip,
      subtext: params.subtext,
      description: params.description,
      infoText: params.infoText,
      specialNotePlaceholderText: params.specialNotePlaceholderText,
      thumbnailTmpKey: params.thumbnailTmpKey,
      weightDisplay: params.weightDisplay,
      filterSchema: params.filterSchema,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ subcategory: Subcategory }>(res);
}

export async function updateSubcategory(params: {
  token: string;
  id: string;
  categoryId?: string;
  subcategoryProfileId?: string;
  name?: string;
  displayOrder?: number;
  isActive?: boolean;
  isBestSeller?: boolean;
  isReadyToShip?: boolean;
  subtext?: string;
  description?: string;
  infoText?: string;
  specialNotePlaceholderText?: string;
  thumbnailTmpKey?: string;
  weightDisplay?: "pointer" | "carat" | "both";
  filterSchema?: Subcategory["filterSchema"];
}): Promise<{ subcategory: Subcategory }> {
  const res = await fetch(`${BACKEND_URL}/admin/subcategories/${params.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      categoryId: params.categoryId,
      subcategoryProfileId: params.subcategoryProfileId,
      name: params.name,
      displayOrder: params.displayOrder,
      isActive: params.isActive,
      isBestSeller: params.isBestSeller,
      isReadyToShip: params.isReadyToShip,
      subtext: params.subtext,
      description: params.description,
      infoText: params.infoText,
      specialNotePlaceholderText: params.specialNotePlaceholderText,
      thumbnailTmpKey: params.thumbnailTmpKey,
      weightDisplay: params.weightDisplay,
      filterSchema: params.filterSchema,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ subcategory: Subcategory }>(res);
}

export async function deleteSubcategory(params: {
  token: string;
  id: string;
}): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/admin/subcategories/${params.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function createCategory(params: {
  token: string;
  name: string;
  displayOrder?: number;
  isActive?: boolean;
  tmpKey: string;
  categoryBannerTmpKeys?: string[];
}): Promise<{ category: Category }> {
  const res = await fetch(`${BACKEND_URL}/admin/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      name: params.name,
      displayOrder: params.displayOrder,
      isActive: params.isActive,
      tmpKey: params.tmpKey,
      categoryBannerTmpKeys: params.categoryBannerTmpKeys,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ category: Category }>(res);
}

export async function updateCategory(params: {
  token: string;
  id: string;
  name?: string;
  displayOrder?: number;
  isActive?: boolean;
  tmpKey?: string;
  categoryBannerTmpKeys?: string[];
}): Promise<{ category: Category }> {
  const res = await fetch(`${BACKEND_URL}/admin/categories/${params.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      name: params.name,
      displayOrder: params.displayOrder,
      isActive: params.isActive,
      tmpKey: params.tmpKey,
      categoryBannerTmpKeys: params.categoryBannerTmpKeys,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ category: Category }>(res);
}

export async function deleteCategory(params: { token: string; id: string }): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/admin/categories/${params.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function listProducts(params: {
  token: string;
  categoryId?: string;
  subcategoryId?: string;
}): Promise<{ products: Product[] }> {
  const searchParams = new URLSearchParams();
  if (params.categoryId) searchParams.set("categoryId", params.categoryId);
  if (params.subcategoryId) searchParams.set("subcategoryId", params.subcategoryId);
  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const res = await fetch(`${BACKEND_URL}/admin/products${query}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ products: Product[] }>(res);
}

export async function createProduct(params: {
  token: string;
  styleNo: string;
  categoryId: string;
  subcategoryProfileId?: string;
  subcategoryId: string;
  makeType?: string;
  description?: string;
  remarks?: string;
  diamonds?: Product["diamonds"];
  totalDiamondPcs?: number;
  totalDiamondWeightCt?: number;
  pointer?: number;
  metalWeights?: Product["metalWeights"];
  images?: string[];
  embedding?: number[];
  displayOrder?: number;
  isActive?: boolean;
  isBestSeller?: boolean;
  isReadyToShip?: boolean;
  filter?: Array<{ filterName: string; filterValue: string | string[] }>;
}): Promise<{ product: Product }> {
  const res = await fetch(`${BACKEND_URL}/admin/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      styleNo: params.styleNo,
      categoryId: params.categoryId,
      subcategoryProfileId: params.subcategoryProfileId,
      subcategoryId: params.subcategoryId,
      makeType: params.makeType,
      description: params.description,
      remarks: params.remarks,
      diamonds: params.diamonds,
      totalDiamondPcs: params.totalDiamondPcs,
      totalDiamondWeightCt: params.totalDiamondWeightCt,
      pointer: params.pointer,
      metalWeights: params.metalWeights,
      images: params.images,
      embedding: params.embedding,
      displayOrder: params.displayOrder,
      isActive: params.isActive,
      isBestSeller: params.isBestSeller,
      isReadyToShip: params.isReadyToShip,
      filter: params.filter,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ product: Product }>(res);
}

export type BulkUploadRowError = { row: number; styleNo?: string; error: string };

export async function bulkUploadProducts(params: {
  token: string;
  file: File;
}): Promise<{ created: number; errors: BulkUploadRowError[] }> {
  const formData = new FormData();
  formData.append("file", params.file);
  const res = await fetch(`${BACKEND_URL}/admin/products/bulk-upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${params.token}` },
    body: formData,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ created: number; errors: BulkUploadRowError[] }>(res);
}

export async function updateProduct(params: {
  token: string;
  id: string;
  styleNo: string;
  categoryId: string;
  subcategoryProfileId?: string;
  subcategoryId: string;
  makeType?: string;
  description?: string;
  remarks?: string;
  diamonds?: Product["diamonds"];
  totalDiamondPcs?: number;
  totalDiamondWeightCt?: number;
  pointer?: number;
  metalWeights?: Product["metalWeights"];
  images?: string[];
  embedding?: number[];
  displayOrder?: number;
  isActive?: boolean;
  isBestSeller?: boolean;
  isReadyToShip?: boolean;
  filter?: Array<{ filterName: string; filterValue: string | string[] }>;
}): Promise<{ product: Product }> {
  const res = await fetch(`${BACKEND_URL}/admin/products/${params.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      styleNo: params.styleNo,
      categoryId: params.categoryId,
      subcategoryProfileId: params.subcategoryProfileId,
      subcategoryId: params.subcategoryId,
      makeType: params.makeType,
      description: params.description,
      remarks: params.remarks,
      diamonds: params.diamonds,
      totalDiamondPcs: params.totalDiamondPcs,
      totalDiamondWeightCt: params.totalDiamondWeightCt,
      pointer: params.pointer,
      metalWeights: params.metalWeights,
      images: params.images,
      embedding: params.embedding,
      displayOrder: params.displayOrder,
      isActive: params.isActive,
      isBestSeller: params.isBestSeller,
      isReadyToShip: params.isReadyToShip,
      filter: params.filter,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ product: Product }>(res);
}

export async function deleteProduct(params: { token: string; id: string }): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/admin/products/${params.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function listStoneShapes(params: { token: string }): Promise<{ stoneShapes: StoneShape[] }> {
  const res = await fetch(`${BACKEND_URL}/admin/stone-shapes`, {
    method: "GET",
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ stoneShapes: StoneShape[] }>(res);
}

export async function createStoneShape(params: {
  token: string;
  name: string;
  thumbnailImage: string;
  displayOrder?: number;
  isActive?: boolean;
}): Promise<{ stoneShape: StoneShape }> {
  const res = await fetch(`${BACKEND_URL}/admin/stone-shapes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ stoneShape: StoneShape }>(res);
}

export async function updateStoneShape(params: {
  token: string;
  id: string;
  name?: string;
  thumbnailImage?: string;
  displayOrder?: number;
  isActive?: boolean;
}): Promise<{ stoneShape: StoneShape }> {
  const res = await fetch(`${BACKEND_URL}/admin/stone-shapes/${params.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      name: params.name,
      thumbnailImage: params.thumbnailImage,
      displayOrder: params.displayOrder,
      isActive: params.isActive,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await parseJsonOrThrow<{ stoneShape: StoneShape }>(res);
}

export async function deleteStoneShape(params: { token: string; id: string }): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/admin/stone-shapes/${params.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

