"use client";

import React from "react";
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
  const formatCurrency = (value: number | null | undefined) =>
    `${Number(value || 0).toLocaleString()}₮`;
  const numericSortFields = new Set<keyof Order>([
    "id",
    "total",
    "cargo_fee",
    "delivery_fee",
    "item_count",
    "quantity_total",
    "source_order_id",
  ]);
  const showCargoColumn = orderColumns.some((column) => column.key === "cargo_fee");
  const showDeliveryFeeColumn = orderColumns.some((column) => column.key === "delivery_fee");
  const showDeliveryAddressColumn = orderColumns.some((column) => column.key === "delivery_address");

  const isShippingOrder = (order: Order) => {
    const normalized = String(order.status || "").trim().toLowerCase();
    return normalized === "хүргэлтэнд бүртгэгдсэн" || normalized === "shipping" || normalized === "shipped";
  };

  const sortedOrders = [...orders].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (numericSortFields.has(sortField)) {
      const aNum = Number(aVal ?? 0);
      const bNum = Number(bVal ?? 0);
      return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
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
              <React.Fragment key={order.id}>
                <tr key={order.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{order.id}</td>
                  <td className="p-3">
                    <div className="font-medium">{order.name}</div>
                    <div className="text-xs text-gray-500">
                      {order.email || (order.source_order_id != null && order.source_order_id > 0)
                        ? order.email || `Эх захиалга #${order.source_order_id}`
                        : ""}
                    </div>
                  </td>
                  <td className="p-3">{order.phone1}</td>
                  <td className="p-3">
                    <div>{Number(order.total || 0).toLocaleString()}₮</div>
                    {order.is_delivery_order ? (
                      <div className="mt-1 text-[11px] text-gray-500">
                        Карго {formatCurrency(order.cargo_fee)} • Хүргэлт {formatCurrency(order.delivery_fee)}
                        {order.item_count ? ` • ${order.item_count} мөр` : ""}
                      </div>
                    ) : null}
                  </td>
                  {showCargoColumn ? (
                    <td className="p-3">
                      {order.is_delivery_order ? formatCurrency(order.cargo_fee) : "—"}
                    </td>
                  ) : null}
                  {showDeliveryFeeColumn ? (
                    <td className="p-3">
                      {order.is_delivery_order ? formatCurrency(order.delivery_fee) : "—"}
                    </td>
                  ) : null}
                  {showDeliveryAddressColumn ? (
                    <td className="max-w-[260px] p-3">
                      <div
                        className="line-clamp-2 cursor-help text-sm text-gray-700"
                        title={order.is_delivery_order ? order.delivery_address || "—" : "—"}
                      >
                        {order.is_delivery_order ? order.delivery_address || "—" : "—"}
                      </div>
                    </td>
                  ) : null}
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
                      {!deletedOnly && !order.is_delivery_order ? (
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
                {isShippingOrder(order) && Array.isArray(order.delivery_groups) && order.delivery_groups.length > 0 ? (
                  <tr className="border-t bg-sky-50/40">
                    <td colSpan={orderColSpan} className="p-3">
                      <div className="rounded-xl border border-sky-100 bg-white p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">Хүргэлтийн QPay-д орсон бараанууд</div>
                            <div className="text-xs text-gray-500">
                              Энэ захиалгад {order.delivery_groups.reduce((sum, group) => sum + group.itemCount, 0)} мөр,
                              нийт {order.delivery_groups.reduce((sum, group) => sum + group.totalQuantity, 0)}ш бараа байна.
                            </div>
                          </div>
                          <div className="text-right text-xs text-gray-500">
                            <div>Карго: {formatCurrency(order.delivery_groups.reduce((sum, group) => sum + group.totalCargo, 0))}</div>
                            <div>Хүргэлт: {formatCurrency(order.delivery_groups.reduce((sum, group) => sum + group.totalDelivery, 0))}</div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {order.delivery_groups.map((group) => (
                            <div key={group.groupKey} className="rounded-xl border border-gray-200 p-3">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                                    {group.invoiceId ? "Grouped Delivery QPay" : "Хүргэлтийн бүртгэл"}
                                  </div>
                                  <div className="text-sm font-medium text-gray-900">{group.label}</div>
                                  <div className="text-xs text-gray-500">
                                    {group.orderCount > 1
                                      ? `${group.orderCount} захиалгын ${group.itemCount} мөр багтсан`
                                      : `${group.itemCount} мөр багтсан`}
                                  </div>
                                </div>
                                <div className="text-right text-xs text-gray-600">
                                  <div>Карго: {formatCurrency(group.totalCargo)}</div>
                                  <div>Хүргэлт: {formatCurrency(group.totalDelivery)}</div>
                                  <div className="font-semibold text-gray-900">Нийт: {formatCurrency(group.totalFee)}</div>
                                </div>
                              </div>

                              <div className="grid gap-2 md:grid-cols-2">
                                {group.items.map((item) => (
                                  <div key={item.itemId} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                                    <div className="text-sm font-medium text-gray-900">
                                      {item.productName}
                                      {item.variantLabel ? ` · ${item.variantLabel}` : ""}
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                                      <span>Захиалга #{item.orderId}</span>
                                      <span>Тоо: {item.quantity}ш</span>
                                      <span>Карго: {formatCurrency(item.cargoFee)}</span>
                                      {item.deliveryFee > 0 ? <span>Хүргэлт: {formatCurrency(item.deliveryFee)}</span> : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
