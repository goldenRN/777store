"use client";

import React from "react";
import { ChevronDown, ChevronUp, Lock, MoreVertical, Package, Pencil, Tag } from "lucide-react";
import { formatCurrency, getProductRowStatus, getRemainingForProductRow } from "./helpers";
import type { ProductSortField, ProductSummary } from "./types";

type ProductSummaryTableProps = {
  items: ProductSummary[];
  loading: boolean;
  isArrivedTab: boolean;
  isPending: boolean;
  openOnly: boolean;
  arrivedSaving: boolean;
  titleLabel: string;
  expandedProducts: Record<string, boolean>;
  closingProductId: number | null;
  closingVariantId: number | null;
  productSortField: ProductSortField;
  productSortOrder: "asc" | "desc";
  onProductSort: (field: ProductSortField) => void;
  onToggleExpanded: (key: string) => void;
  onCloseProductOrders: (productId: number, productName: string) => void;
  onCloseVariantOrders: (variantId: number, variantLabel: string) => void;
  onOpenArrivedModalForProduct: (product: ProductSummary) => void;
  onOpenArrivedModalForVariant: (
    product: ProductSummary,
    variant: ProductSummary["variants"][number]
  ) => void;
  onOpenEditArrivedForProduct: (product: ProductSummary) => void;
  onOpenEditArrivedForVariant: (
    product: ProductSummary,
    variant: ProductSummary["variants"][number]
  ) => void;
  onOpenProductDetail: (product: ProductSummary) => void;
};

export default function ProductSummaryTable({
  items,
  loading,
  isArrivedTab,
  isPending,
  openOnly,
  arrivedSaving,
  titleLabel,
  expandedProducts,
  closingProductId,
  closingVariantId,
  productSortField,
  productSortOrder,
  onProductSort,
  onToggleExpanded,
  onCloseProductOrders,
  onCloseVariantOrders,
  onOpenArrivedModalForProduct,
  onOpenArrivedModalForVariant,
  onOpenEditArrivedForProduct,
  onOpenEditArrivedForVariant,
  onOpenProductDetail,
}: ProductSummaryTableProps) {
  const colSpan = isArrivedTab ? 10 : 7;

  const sortIcon = (field: ProductSortField) =>
    productSortField === field
      ? productSortOrder === "asc"
        ? <ChevronUp size={14} />
        : <ChevronDown size={14} />
      : null;

  return (
    <div className="overflow-x-auto rounded bg-white shadow">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left">Зураг</th>
            <th className="p-3 text-left">
              <button type="button" onClick={() => onProductSort("product_name")} className="inline-flex items-center gap-1 font-semibold" title="Sort">
                Барааны нэр
                {sortIcon("product_name")}
              </button>
            </th>
            <th className="p-3 text-left">
              <button type="button" onClick={() => onProductSort("total_qty")} className="inline-flex items-center gap-1 font-semibold" title="Sort">
                Нийт захиалсан
                {sortIcon("total_qty")}
              </button>
            </th>
            <th className="p-3 text-left">
              <button type="button" onClick={() => onProductSort("product_stock")} className="inline-flex items-center gap-1 font-semibold" title="Sort">
                Захиалга авах тоо
                {sortIcon("product_stock")}
              </button>
            </th>
            <th className="p-3 text-left">
              <button type="button" onClick={() => onProductSort("remaining")} className="inline-flex items-center gap-1 font-semibold" title="Sort">
                Үлдэгдэл
                {sortIcon("remaining")}
              </button>
            </th>
            {isArrivedTab ? <th className="p-3 text-left">Ирж авсан</th> : null}
            {isArrivedTab ? <th className="p-3 text-left">Хүргэлтээр авсан</th> : null}
            {isArrivedTab ? <th className="p-3 text-left">Карго төлбөр</th> : null}
            <th className="p-3 text-left">
              <Tag size={14} className="text-gray-600" />
            </th>
            <th className="p-3 text-left">Үйлдэл</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={colSpan} className="p-4 text-center">Уншиж байна...</td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="p-4 text-center">Мэдээлэл алга</td>
            </tr>
          ) : (
            items.map((product) => {
              const rowKey = `${product.product_id ?? "x"}-${product.product_name}`;
              const rowStatus = getProductRowStatus(product, titleLabel);

              return (
                <React.Fragment key={rowKey}>
                  <tr className="border-t">
                    <td className="p-3">
                      <div className="h-12 w-12 overflow-hidden rounded border bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.image_url || "/logo.png"}
                          alt={product.product_name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "/logo.png";
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-3 font-medium">{product.product_name}</td>
                    <td className="p-3">{product.total_qty}</td>
                    <td className="p-3">{product.product_stock ?? "-"}</td>
                    <td className="p-3">{getRemainingForProductRow(product) ?? "-"}</td>
                    {isArrivedTab ? <td className="p-3">{product.handed_qty ?? 0}</td> : null}
                    {isArrivedTab ? <td className="p-3">{product.delivery_qty ?? 0}</td> : null}
                    {isArrivedTab ? (
                      <td className="p-3">
                        <div className="font-medium">{formatCurrency(product.cargo_fee)}</div>
                        {product.cargo_note ? (
                          <div className="mt-1 max-w-[180px] truncate text-xs text-gray-500" title={product.cargo_note}>
                            {product.cargo_note}
                          </div>
                        ) : null}
                      </td>
                    ) : null}
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${rowStatus.className}`}>
                        {rowStatus.label}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onToggleExpanded(rowKey)}
                          className="flex h-9 w-9 items-center justify-center rounded border bg-white"
                          title="Төрлүүд"
                        >
                          {expandedProducts[rowKey] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {openOnly && isPending && product.product_id != null && product.order_accept_status !== "CLOSED" ? (
                          <button
                            onClick={() => onCloseProductOrders(product.product_id as number, product.product_name)}
                            className="flex h-9 w-9 items-center justify-center rounded border bg-white text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title="Захиалга хаах"
                            disabled={closingProductId === product.product_id}
                          >
                            <Lock size={16} />
                          </button>
                        ) : null}

                        {isPending && !openOnly && product.product_id != null ? (
                          <button
                            onClick={() => onOpenArrivedModalForProduct(product)}
                            className="flex h-9 w-9 items-center justify-center rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
                            title="Бараа ирсэн"
                            disabled={arrivedSaving}
                          >
                            <Package size={16} />
                          </button>
                        ) : null}

                        {isArrivedTab && product.product_id != null ? (
                          <button
                            onClick={() => onOpenEditArrivedForProduct(product)}
                            className="flex h-9 w-9 items-center justify-center rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
                            title="Карго засах"
                            disabled={arrivedSaving}
                          >
                            <Pencil size={16} />
                          </button>
                        ) : null}

                        <button
                          onClick={() => onOpenProductDetail(product)}
                          className="flex h-9 w-9 items-center justify-center rounded border bg-white"
                          title="Дэлгэрэнгүй"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expandedProducts[rowKey] && (
                    <tr className="border-t bg-gray-50">
                      <td colSpan={colSpan} className="p-3">
                        {product.variants && product.variants.length > 0 ? (
                          <div className="overflow-auto rounded border bg-white">
                            <table className="min-w-full text-xs">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-3 py-2 text-left">Төрөл</th>
                                  <th className="px-3 py-2 text-left">Нийт захиалсан</th>
                                  <th className="px-3 py-2 text-left">Захиалга авах тоо</th>
                                  <th className="px-3 py-2 text-left">Үлдэгдэл</th>
                                  {isArrivedTab ? <th className="px-3 py-2 text-left">Ирж авсан</th> : null}
                                  {isArrivedTab ? <th className="px-3 py-2 text-left">Хүргэлтээр авсан</th> : null}
                                  {isArrivedTab ? <th className="px-3 py-2 text-left">Карго</th> : null}
                                  <th className="px-3 py-2 text-left">Төлөв</th>
                                  {isPending || isArrivedTab ? <th className="px-3 py-2 text-left">Үйлдэл</th> : null}
                                </tr>
                              </thead>
                              <tbody>
                                {product.variants.map((variant) => (
                                  <tr key={variant.variant_id} className="border-t">
                                    <td className="px-3 py-2">{variant.label}</td>
                                    <td className="px-3 py-2">{variant.ordered_qty}</td>
                                    <td className="px-3 py-2">{variant.stock != null ? variant.stock : "-"}</td>
                                    <td className="px-3 py-2">{variant.remaining_qty != null ? variant.remaining_qty : "-"}</td>
                                    {isArrivedTab ? <td className="px-3 py-2">{variant.handed_qty ?? 0}</td> : null}
                                    {isArrivedTab ? <td className="px-3 py-2">{variant.delivery_qty ?? 0}</td> : null}
                                    {isArrivedTab ? (
                                      <td className="px-3 py-2">
                                        <div className="font-medium">{formatCurrency(variant.cargo_fee)}</div>
                                        {variant.cargo_note ? (
                                          <div className="mt-1 max-w-[180px] truncate text-[11px] text-gray-500" title={variant.cargo_note}>
                                            {variant.cargo_note}
                                          </div>
                                        ) : null}
                                      </td>
                                    ) : null}
                                    <td className="px-3 py-2">
                                      <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                          variant.closed ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                                        }`}
                                      >
                                        {variant.closed ? "Хаагдсан" : "Нээлттэй"}
                                      </span>
                                    </td>
                                    {isPending || isArrivedTab ? (
                                      <td className="px-3 py-2">
                                        {isPending && openOnly ? (
                                          <button
                                            type="button"
                                            onClick={() => onCloseVariantOrders(variant.variant_id, variant.label)}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded border bg-white text-red-600 hover:bg-red-50 disabled:opacity-50"
                                            title="Захиалга хаах"
                                            disabled={variant.closed || closingVariantId === variant.variant_id}
                                          >
                                            <Lock size={14} />
                                          </button>
                                        ) : isPending ? (
                                          <button
                                            type="button"
                                            onClick={() => onOpenArrivedModalForVariant(product, variant)}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
                                            title="Бараа ирсэн"
                                            disabled={arrivedSaving}
                                          >
                                            <Package size={14} />
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => onOpenEditArrivedForVariant(product, variant)}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
                                            title="Карго засах"
                                            disabled={arrivedSaving}
                                          >
                                            <Pencil size={14} />
                                          </button>
                                        )}
                                      </td>
                                    ) : null}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">Төрөл мэдээлэл алга.</div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
