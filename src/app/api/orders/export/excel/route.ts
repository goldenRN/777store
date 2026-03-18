import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const escapeCsv = (value: string | number | null | undefined) => {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export async function GET() {
  const orders = await prisma.adminOrder.findMany({
    include: { items: true },
    orderBy: { created_at: "desc" },
  });

  const header = [
    "ID",
    "Name",
    "Phone",
    "Status",
    "Total",
    "Created At",
    "Items",
  ];

  const rows = orders.map((order) => {
    const items = order.items
      .map((i) => `${i.product_name} x${i.quantity}`)
      .join(" | ");
    return [
      escapeCsv(order.id),
      escapeCsv(order.name),
      escapeCsv(order.phone1),
      escapeCsv(order.status),
      escapeCsv(order.total),
      escapeCsv(order.created_at.toISOString()),
      escapeCsv(items),
    ].join(",");
  });

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": "attachment; filename=orders.xls",
    },
  });
}
