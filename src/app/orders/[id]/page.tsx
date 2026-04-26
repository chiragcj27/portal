"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import AdminShell from "@/components/AdminShell";
import { getAdminTokenFromStorage } from "@/lib/admin-auth";
import { getAdminOrderById, type AdminOrder, type OrderStatus } from "@/lib/admin-api";

const STATUS_LABELS: Record<OrderStatus, string> = {
  order_received: "Order Received",
  order_confirmed: "Order Confirmed",
  order_in_production: "Order in Production",
  order_shipped: "Order Shipped",
  order_delivered: "Order Delivered",
  order_cancelled: "Order Cancelled",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function LabelValue({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <p>
      <span className="font-medium text-slate-900">{label}:</span> {value ?? "N/A"}
    </p>
  );
}

function ListPills({ values }: { values: string[] }) {
  if (!values.length) return <p className="text-xs text-slate-500">Not available</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span key={value} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
          {value}
        </span>
      ))}
    </div>
  );
}

function ImagePreviewGrid({ images }: { images: string[] }) {
  if (!images.length) return <p className="text-xs text-slate-500">Not available</p>;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {images.map((image, idx) => (
        <a
          key={`${image}-${idx}`}
          href={image}
          target="_blank"
          rel="noreferrer"
          className="group overflow-hidden rounded-lg border border-slate-200 bg-white"
          title="Open full image"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={`Product ${idx + 1}`}
            className="h-24 w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [token, setToken] = useState<string | null>(null);
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existing = getAdminTokenFromStorage();
    if (!existing) {
      router.replace("/login");
      return;
    }
    setToken(existing);
  }, [router]);

  useEffect(() => {
    const run = async () => {
      if (!token || !id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getAdminOrderById({ token, id });
        setOrder(res.order);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch order");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [token, id]);

  const itemCount = useMemo(() => order?.items?.length ?? 0, [order]);

  return (
    <AdminShell title="Order Detail">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Order Details</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Complete snapshot of ordered items and client/order metadata.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/orders")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to orders
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" strokeWidth={2} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading order details...
          </div>
        ) : !order ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Order not found.
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order</p>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  <LabelValue label="Order Number" value={order.orderNumber} />
                  <LabelValue label="Status" value={STATUS_LABELS[order.status]} />
                  <LabelValue label="Created" value={formatDate(order.createdAt)} />
                  <LabelValue label="Updated" value={formatDate(order.updatedAt)} />
                  <LabelValue label="Item Count" value={itemCount} />
                  <LabelValue label="Total Amount" value={`${order.totalAmount ?? "N/A"} ${order.currency || ""}`.trim()} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</p>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  <LabelValue label="Client Name" value={order.clientName} />
                  <LabelValue label="Client Username" value={order.clientUsername} />
                  <LabelValue label="Client Id" value={order.clientId} />
                  <LabelValue label="Shipping Address" value={order.shippingAddress || "N/A"} />
                  <LabelValue label="Billing Address" value={order.billingAddress || "N/A"} />
                  <LabelValue label="Notes" value={order.notes || "N/A"} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</p>
              <div className="mt-3 space-y-2">
                {order.timeline.map((entry, idx) => (
                  <div key={`${entry.status}-${entry.changedAt}-${idx}`} className="rounded-md border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-900">{STATUS_LABELS[entry.status]}</p>
                    <p className="text-xs text-slate-600">{formatDate(entry.changedAt)}</p>
                    <p className="text-xs text-slate-600">
                      By {entry.changedBy.role} ({entry.changedBy.id})
                    </p>
                    {entry.note ? <p className="text-xs text-slate-600">Note: {entry.note}</p> : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={`${item.productId || item.styleNo || idx}`} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Item {idx + 1}</p>
                  <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <LabelValue label="Product Id" value={item.productId || "N/A"} />
                    <LabelValue label="Style No" value={item.styleNo || "N/A"} />
                    <LabelValue label="Title" value={item.title || "N/A"} />
                    <LabelValue label="Quantity" value={item.quantity} />
                    <LabelValue label="Unit Price" value={item.unitPrice ?? "N/A"} />
                    <LabelValue label="Line Total" value={item.lineTotal ?? "N/A"} />
                    <LabelValue label="Remarks" value={item.remarks || "N/A"} />
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-medium text-slate-700">Item Image</p>
                    <ImagePreviewGrid images={item.imageUrl ? [item.imageUrl] : []} />
                  </div>

                  {item.meta?.productSnapshot ? (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product Snapshot</p>
                      <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                        <LabelValue label="Category" value={item.meta.productSnapshot.categoryName || "N/A"} />
                        <LabelValue label="Subcategory" value={item.meta.productSnapshot.subcategoryName || "N/A"} />
                        <LabelValue
                          label="Subcategory Profile"
                          value={item.meta.productSnapshot.subcategoryProfileName || "N/A"}
                        />
                        <LabelValue label="Make Type" value={item.meta.productSnapshot.makeType || "N/A"} />
                        <LabelValue label="Description" value={item.meta.productSnapshot.description || "N/A"} />
                        <LabelValue label="Pointer" value={item.meta.productSnapshot.pointer ?? "N/A"} />
                        <LabelValue
                          label="Diamond Weight (ct)"
                          value={item.meta.productSnapshot.totalDiamondWeightCt ?? "N/A"}
                        />
                        <LabelValue label="Diamond Pcs" value={item.meta.productSnapshot.totalDiamondPcs ?? "N/A"} />
                      </div>

                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="mb-1 text-xs font-medium text-slate-700">Applied Filters</p>
                          <ListPills
                            values={
                              item.meta.productSnapshot.filter?.map(
                                (filter) =>
                                  `${filter.filterName}: ${
                                    Array.isArray(filter.filterValue)
                                      ? filter.filterValue.join(", ")
                                      : filter.filterValue
                                  }`
                              ) || []
                            }
                          />
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-slate-700">Product Images</p>
                          <ImagePreviewGrid images={item.meta.productSnapshot.images || []} />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {"selectedFilters" in (item.meta || {}) ? (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                      <p className="mb-1 text-xs font-medium text-slate-700">Selected Options</p>
                      <ListPills
                        values={Object.entries((item.meta?.selectedFilters as Record<string, unknown>) || {}).map(
                          ([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`
                        )}
                      />
                    </div>
                  ) : null}

                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-700">Additional Details</p>
                    <div className="mt-2 grid gap-2 text-xs text-slate-600 md:grid-cols-3">
                      <LabelValue label="White Qty" value={Number(item.meta?.whiteQty ?? 0)} />
                      <LabelValue label="Yellow Qty" value={Number(item.meta?.yellowQty ?? 0)} />
                      <LabelValue label="Rose Qty" value={Number(item.meta?.roseQty ?? 0)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
