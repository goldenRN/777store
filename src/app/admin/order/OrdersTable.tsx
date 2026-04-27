"use client";

import { CheckCircle, MoreVertical, Trash2 } from "lucide-react";
import type { Order, OrderColumn } from "./types";

type OrdersTableProps = {
  orders: Order[];
  loading: boolean;
  orderColumns: OrderColumn[];
  orderColSpan: number;
  deletedOnly: boolean;
  isPending: boolean;
  sortField: keyof Order;
  sortOrder: "asc" | "desc";
  page: number;
  onSort: (field: keyof Order) => void;
  onSelect: (order: Order) => void;
  onDelete: (order: Order) => void;
  onStatusChange: (orderId: number, status: string) => void;
};

export default function OrdersTable({
  orders,
  loading,
  orderColumns,
  orderColSpan,
  deletedOnly,
  isPending,
  sortField,
  sortOrder,
  onSort,
  onSelect,
  onDelete,
  onStatusChange,
}: OrdersTableProps) {
  const sortedOrders = [...orders].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }
    return sortOrder === "asc"
      ? String(aVal ?? "").localeCompare(String(bVal ?? ""))
      : String(bVal ?? "").localeCompare(String(aVal ?? ""));
  });

  return (
    <div className="overflow-x-auto rounded bg-white shadow">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {orderColumns.map((column) => (
              <th
                key={column.key}
                onClick={() => (column.sortable === false ? undefined : onSort(column.key as keyof Order))}
                className={`whitespace-nowrap p-3 text-left ${
                  column.sortable === false ? "cursor-default" : "cursor-pointer hover:bg-gray-100"
                }`}
              >
                {column.label}{" "}
                {column.sortable === false
                  ? null
                  : sortField === column.key && (sortOrder === "asc" ? "▲" : "▼")}
              </th>
            ))}
            <th className="p-3 text-left">Үйлдэл</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={orderColSpan} className="p-4 text-center">Уншиж байна...</td>
            </tr>
          ) : orders.length === 0 ? (
            <tr>
              <td colSpan={orderColSpan} className="p-4 text-center">Захиалга хоосон байна</td>
            </tr>
          ) : (
            sortedOrders.map((order) => (
              <tr key={order.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{order.id}</td>
                <td className="p-3">
                  <div className="font-medium">{order.name}</div>
                  <div className="text-xs text-gray-500">{order.email}</div>
                </td>
                <td className="p-3">{order.phone1}</td>
                <td className="p-3">{Number(order.total || 0).toLocaleString()}₮</td>
                <td className="p-3">
                  {order.payment_method_name
                    ? order.payment_method_name
                    : order.payment_provider
                      ? order.payment_provider.toUpperCase()
                      : "—"}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        order.payment_status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : order.payment_status === "CANCELLED"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {order.payment_status || "UNPAID"}
                    </span>
                    {order.qpay_qr_image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`data:image/png;base64,${order.qpay_qr_image}`}
                        alt="QPay QR"
                        className="h-10 w-10 rounded border"
                      />
                    )}
                  </div>
                </td>
                <td className="p-3">{new Date(order.created_at).toLocaleString()}</td>

                {deletedOnly ? (
                  <>
                    <td className="p-3">
                      <div className="text-sm">{order.deleted_by_name || "—"}</div>
                      <div className="text-xs text-gray-500">{order.deleted_by_phone || ""}</div>
                    </td>
                    <td className="max-w-[360px] p-3">
                      <div className="line-clamp-2 text-sm text-gray-700">{order.deleted_reason || "—"}</div>
                    </td>
                    <td className="p-3">
                      {order.deleted_at ? new Date(order.deleted_at).toLocaleString() : "—"}
                    </td>
                  </>
                ) : null}

                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelect(order)}
                      className="flex h-9 w-9 items-center justify-center rounded border bg-white"
                      title="Дэлгэрэнгүй"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {!deletedOnly ? (
                      <button
                        onClick={() => onDelete(order)}
                        className="flex h-9 w-9 items-center justify-center rounded border bg-white text-red-600 hover:bg-red-50"
                        title="Устгах"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                    {isPending ? (
                      <button
                        className="relative flex h-9 w-9 items-center justify-center rounded border bg-white"
                        title="Төлөв солих"
                      >
                        <CheckCircle size={16} />
                        <select
                          value={order.status}
                          onChange={(e) => onStatusChange(order.id, e.target.value)}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        >
                          <option value="Бараа ирсэн">Бараа ирсэн</option>
                          <option value="Захиалга цуцлагдсан">Захиалга цуцлагдсан</option>
                        </select>
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
