"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { getAdminTokenFromStorage } from "@/lib/admin-auth";
import {
  cancelAdminOrder,
  listAdminOrders,
  type AdminOrder,
  type OrderStatus,
  updateAdminOrderStatus,
} from "@/lib/admin-api";
import { AlertCircle, Loader2 } from "lucide-react";

const STATUS_LABELS: Record<OrderStatus, string> = {
  order_received: "Order Received",
  order_confirmed: "Order Confirmed",
  order_in_production: "Order in Production",
  order_shipped: "Order Shipped",
  order_delivered: "Order Delivered",
  order_cancelled: "Order Cancelled",
};

const NEXT_STATUS: Partial<Record<OrderStatus, Exclude<OrderStatus, "order_cancelled">>> = {
  order_received: "order_confirmed",
  order_confirmed: "order_in_production",
  order_in_production: "order_shipped",
  order_shipped: "order_delivered",
};

function statusBadgeClass(status: OrderStatus): string {
  if (status === "order_cancelled") return "bg-red-100 text-red-700 border-red-200";
  if (status === "order_delivered") return "bg-green-100 text-green-700 border-green-200";
  if (status === "order_shipped") return "bg-sky-100 text-sky-700 border-sky-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export default function OrdersPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOnOrderId, setActingOnOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shipmentModalOrder, setShipmentModalOrder] = useState<AdminOrder | null>(null);
  const [shipmentForm, setShipmentForm] = useState({
    sourceCity: "",
    destinationCity: "",
    logisticsName: "",
    logisticsId: "",
    awbNo: "",
    noOfPcs: "",
  });

  useEffect(() => {
    const existing = getAdminTokenFromStorage();
    if (!existing) {
      router.replace("/login");
      return;
    }
    setToken(existing);
  }, [router]);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listAdminOrders({ token });
      setOrders(res.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  async function onMoveToNextStatus(order: AdminOrder) {
    if (!token) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    if (next === "order_shipped") {
      setShipmentModalOrder(order);
      setShipmentForm({
        sourceCity: "",
        destinationCity: "",
        logisticsName: "",
        logisticsId: "",
        awbNo: "",
        noOfPcs: "",
      });
      return;
    }
    setActingOnOrderId(order._id);
    setError(null);
    try {
      const res = await updateAdminOrderStatus({
        token,
        id: order._id,
        status: next,
      });
      setOrders((current) => current.map((item) => (item._id === res.order._id ? res.order : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order status");
    } finally {
      setActingOnOrderId(null);
    }
  }

  async function onSubmitShipmentTracking() {
    if (!token || !shipmentModalOrder) return;
    const noOfPcs = Number(shipmentForm.noOfPcs);
    if (
      !shipmentForm.sourceCity.trim() ||
      !shipmentForm.destinationCity.trim() ||
      !shipmentForm.logisticsName.trim() ||
      !shipmentForm.logisticsId.trim() ||
      !shipmentForm.awbNo.trim() ||
      !Number.isFinite(noOfPcs) ||
      noOfPcs < 1
    ) {
      setError("Please fill all shipment tracking fields before moving to Order Shipped.");
      return;
    }

    setActingOnOrderId(shipmentModalOrder._id);
    setError(null);
    try {
      const res = await updateAdminOrderStatus({
        token,
        id: shipmentModalOrder._id,
        status: "order_shipped",
        shipmentTracking: {
          sourceCity: shipmentForm.sourceCity.trim(),
          destinationCity: shipmentForm.destinationCity.trim(),
          logisticsName: shipmentForm.logisticsName.trim(),
          logisticsId: shipmentForm.logisticsId.trim(),
          awbNo: shipmentForm.awbNo.trim(),
          noOfPcs,
        },
      });
      setOrders((current) => current.map((item) => (item._id === res.order._id ? res.order : item)));
      setShipmentModalOrder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order status");
    } finally {
      setActingOnOrderId(null);
    }
  }

  async function onCancel(order: AdminOrder) {
    if (!token) return;
    if (order.status !== "order_received") return;
    setActingOnOrderId(order._id);
    setError(null);
    try {
      const res = await cancelAdminOrder({
        token,
        id: order._id,
      });
      setOrders((current) => current.map((item) => (item._id === res.order._id ? res.order : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setActingOnOrderId(null);
    }
  }

  const hasOrders = useMemo(() => orders.length > 0, [orders]);

  return (
    <AdminShell title="Orders">
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Client Orders</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage lifecycle stages manually and track each status update timestamp.
          </p>
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
            Loading orders...
          </div>
        ) : !hasOrders ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            No orders yet.
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isActing = actingOnOrderId === order._id;
              const next = NEXT_STATUS[order.status];
              const latestTimeline = order.timeline[order.timeline.length - 1];
              return (
                <div key={order._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{order.orderNumber}</p>
                      <p className="text-xs text-slate-500">
                        {order.clientName} ({order.clientUsername})
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(order.status)}`}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                    <p>Items: {order.items.length}</p>
                    <p>Created: {formatDate(order.createdAt)}</p>
                    <p>
                      Last update: {latestTimeline ? formatDate(latestTimeline.changedAt) : formatDate(order.updatedAt)}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/orders/${order._id}`)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      View details
                    </button>
                    {next && (
                      <button
                        type="button"
                        onClick={() => void onMoveToNextStatus(order)}
                        disabled={isActing}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {isActing ? "Updating..." : `Move to ${STATUS_LABELS[next]}`}
                      </button>
                    )}
                    {order.status === "order_received" && (
                      <button
                        type="button"
                        onClick={() => void onCancel(order)}
                        disabled={isActing}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        {isActing ? "Cancelling..." : "Cancel order"}
                      </button>
                    )}
                  </div>

                  <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-700">Status timeline</p>
                    <div className="mt-2 space-y-1">
                      {order.timeline.map((entry, idx) => (
                        <p key={`${entry.status}-${entry.changedAt}-${idx}`} className="text-xs text-slate-600">
                          {STATUS_LABELS[entry.status]} - {formatDate(entry.changedAt)}
                          {entry.note ? ` (${entry.note})` : ""}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {shipmentModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-slate-900">Shipment Tracking Details</h3>
            <p className="mt-1 text-xs text-slate-500">
              Required before moving order <span className="font-medium">{shipmentModalOrder.orderNumber}</span> to
              Order Shipped.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Source City"
                value={shipmentForm.sourceCity}
                onChange={(e) => setShipmentForm((prev) => ({ ...prev, sourceCity: e.target.value }))}
              />
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Destination City"
                value={shipmentForm.destinationCity}
                onChange={(e) => setShipmentForm((prev) => ({ ...prev, destinationCity: e.target.value }))}
              />
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Logistics Name"
                value={shipmentForm.logisticsName}
                onChange={(e) => setShipmentForm((prev) => ({ ...prev, logisticsName: e.target.value }))}
              />
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Logistics ID"
                value={shipmentForm.logisticsId}
                onChange={(e) => setShipmentForm((prev) => ({ ...prev, logisticsId: e.target.value }))}
              />
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
                placeholder="AWB No."
                value={shipmentForm.awbNo}
                onChange={(e) => setShipmentForm((prev) => ({ ...prev, awbNo: e.target.value }))}
              />
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
                placeholder="No of Pcs"
                type="number"
                min={1}
                value={shipmentForm.noOfPcs}
                onChange={(e) => setShipmentForm((prev) => ({ ...prev, noOfPcs: e.target.value }))}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShipmentModalOrder(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onSubmitShipmentTracking()}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Save & Move to Order Shipped
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
