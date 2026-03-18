import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const toDay = (date: Date) => date.toISOString().slice(0, 10);

export async function GET() {
  const [productsCount, ordersCount, categoriesCount, brandsCount, usersCount] =
    await Promise.all([
      prisma.adminProduct.count(),
      prisma.adminOrder.count(),
      prisma.adminCategory.count(),
      prisma.adminBrand.count(),
      prisma.user.count(),
    ]);

  const since = new Date();
  since.setDate(since.getDate() - 29);

  const [orders, products] = await Promise.all([
    prisma.adminOrder.findMany({
      where: { created_at: { gte: since } },
      select: { created_at: true },
    }),
    prisma.adminProduct.findMany({
      where: { created_at: { gte: since } },
      select: { created_at: true },
    }),
  ]);

  const orderMap = new Map<string, number>();
  orders.forEach((o) => {
    const day = toDay(o.created_at);
    orderMap.set(day, (orderMap.get(day) ?? 0) + 1);
  });

  const productMap = new Map<string, number>();
  products.forEach((p) => {
    const day = toDay(p.created_at);
    productMap.set(day, (productMap.get(day) ?? 0) + 1);
  });

  const ordersByDay = Array.from(orderMap.entries()).map(([day, count]) => ({
    day,
    count,
  }));
  const productsByDay = Array.from(productMap.entries()).map(([day, count]) => ({
    day,
    count,
  }));

  return NextResponse.json({
    counts: {
      products: productsCount,
      orders: ordersCount,
      categories: categoriesCount,
      brands: brandsCount,
      users: usersCount,
    },
    ordersByDay,
    productsByDay,
  });
}
