import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const toDay = (date: Date) => date.toISOString().slice(0, 10);

const normalizeProductType = (product: {
  duration_hours?: number | null;
  type?: { name?: string | null } | null;
}) => {
  const typeName = String(product.type?.name || "").toLowerCase();
  const hasDuration = Number(product.duration_hours || 0) > 0;
  const isLive = typeName.includes("лайв") || typeName.includes("live");
  const isPreorder =
    hasDuration ||
    typeName.includes("захиал") ||
    typeName.includes("preorder") ||
    typeName.includes("урьдчил");

  if (isLive) return "live";
  if (isPreorder) return "preorder";
  return "ready";
};

const normalizeOrderStatus = (raw?: string | null) => {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return "pending";
  if (value.includes("хүргэлт")) return "shipping";
  if (value.includes("олгосон") || value.includes("delivered") || value.includes("completed")) {
    return "delivered";
  }
  if (value.includes("буца")) return "returned";
  if (value.includes("цуц") || value.includes("cancel")) return "cancelled";
  if (value.includes("ирсэн") || value.includes("confirmed") || value.includes("arrived")) {
    return "arrived";
  }
  return "pending";
};

const normalizeFulfillmentStatus = (raw?: string | null) => {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return null;
  if (value.includes("хүргэлт")) return "shipping";
  if (value.includes("олгосон") || value.includes("deliver") || value.includes("completed")) {
    return "delivered";
  }
  if (value.includes("буца")) return "returned";
  return null;
};

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date(today);
  monthStart.setDate(1);

  const since30 = new Date(today);
  since30.setDate(since30.getDate() - 29);

  const [categoriesCount, brandsCount, usersCount, deletedOrdersCount, products, orders, auditLogs] =
    await Promise.all([
      prisma.adminCategory.count(),
      prisma.adminBrand.count(),
      prisma.user.count(),
      prisma.adminOrder.count({ where: { deleted_at: { not: null } } }),
      prisma.adminProduct.findMany({
        select: {
          id: true,
          name: true,
          price: true,
          discount_price: true,
          stock: true,
          ordered_qty: true,
          created_at: true,
          duration_hours: true,
          order_accept_status: true,
          arrival_status: true,
          cargo_fee: true,
          type: { select: { name: true } },
          variants: {
            select: {
              id: true,
              arrived_qty: true,
              cargo_fee: true,
            },
          },
        },
      }),
      prisma.adminOrder.findMany({
        where: { deleted_at: null },
        select: {
          id: true,
          name: true,
          phone1: true,
          total: true,
          status: true,
          payment_status: true,
          payment_method_name: true,
          order_kind: true,
          created_at: true,
          paid_at: true,
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.adminAuditLog.findMany({
        where: {
          created_at: { gte: today },
          action: {
            in: ["ORDER_ITEMS_BULK_STATUS", "ORDER_ITEM_DELIVERY_REGISTERED"],
          },
        },
        select: {
          action: true,
          details: true,
        },
      }),
    ]);

  const productSummary = {
    total: products.length,
    ready: 0,
    preorder: 0,
    live: 0,
    discounted: 0,
    lowStock: 0,
    openPreorder: 0,
    awaitingArrival: 0,
  };

  const productMap = new Map<string, number>();
  let remainingCargoFee = 0;
  products.forEach((product) => {
    const kind = normalizeProductType(product);
    productSummary[kind as "ready" | "preorder" | "live"] += 1;
    if (Number(product.discount_price || 0) > 0) productSummary.discounted += 1;
    if (kind === "ready" && Number(product.stock || 0) > 0 && Number(product.stock || 0) <= 10) {
      productSummary.lowStock += 1;
    }
    if (kind === "preorder" && String(product.order_accept_status || "OPEN").toUpperCase() === "OPEN") {
      productSummary.openPreorder += 1;
    }
    if (kind === "preorder" && String(product.arrival_status || "").includes("Хүлээгд")) {
      productSummary.awaitingArrival += 1;
    }
    if (product.created_at >= since30) {
      const day = toDay(product.created_at);
      productMap.set(day, (productMap.get(day) ?? 0) + 1);
    }

    const productArrived = String(product.arrival_status || "").toLowerCase().includes("ирсэн");
    const arrivedVariantCargo = product.variants
      .filter((variant) => variant.arrived_qty != null && Number(variant.arrived_qty || 0) > 0)
      .reduce((sum, variant) => sum + Number(variant.cargo_fee || 0), 0);

    if (arrivedVariantCargo > 0) {
      remainingCargoFee += arrivedVariantCargo;
    } else if (productArrived) {
      remainingCargoFee += Number(product.cargo_fee || 0);
    }
  });

  const orderSummary = {
    total: orders.length,
    paid: 0,
    unpaid: 0,
    pending: 0,
    arrived: 0,
    shipping: 0,
    delivered: 0,
    returned: 0,
    cancelled: 0,
  };

  let totalRevenue = 0;
  let monthRevenue = 0;
  let todayRevenue = 0;

  const orderMap = new Map<string, { day: string; orders: number; revenue: number }>();
  const paymentMethodMap = new Map<string, number>();

  orders.forEach((order) => {
    const normalizedStatus = normalizeOrderStatus(order.status);
    const paymentStatus = String(order.payment_status || "").toUpperCase();

    if (paymentStatus === "PAID") {
      orderSummary.paid += 1;
      totalRevenue += Number(order.total || 0);
      if (order.created_at >= monthStart) monthRevenue += Number(order.total || 0);
      if (order.created_at >= today) todayRevenue += Number(order.total || 0);

      const paymentMethod = String(order.payment_method_name || "QPay").trim() || "QPay";
      paymentMethodMap.set(paymentMethod, (paymentMethodMap.get(paymentMethod) ?? 0) + 1);
    } else {
      orderSummary.unpaid += 1;
    }

    orderSummary[normalizedStatus as keyof typeof orderSummary] += 1;

    if (order.created_at >= since30) {
      const day = toDay(order.created_at);
      const existing = orderMap.get(day) ?? { day, orders: 0, revenue: 0 };
      existing.orders += 1;
      if (paymentStatus === "PAID") {
        existing.revenue += Number(order.total || 0);
      }
      orderMap.set(day, existing);
    }
  });

  const chartDays: string[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    chartDays.push(toDay(day));
  }

  const trend = chartDays.map((day) => {
    const orderPoint = orderMap.get(day);
    return {
      day,
      orders: orderPoint?.orders ?? 0,
      revenue: orderPoint?.revenue ?? 0,
      products: productMap.get(day) ?? 0,
    };
  });

  const recentOrders = orders.slice(0, 6).map((order) => ({
    id: order.id,
    name: order.name,
    phone: order.phone1,
    total: Number(order.total || 0),
    status: order.status,
    normalized_status: normalizeOrderStatus(order.status),
    payment_status: order.payment_status,
    order_kind: order.order_kind,
    created_at: order.created_at,
  }));

  const paymentBreakdown = Array.from(paymentMethodMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topOrderedProducts = products
    .filter((product) => Number(product.ordered_qty || 0) > 0)
    .sort((a, b) => Number(b.ordered_qty || 0) - Number(a.ordered_qty || 0))
    .slice(0, 5)
    .map((product) => ({
      id: product.id,
      name: product.name,
      orderedQty: Number(product.ordered_qty || 0),
      kind: normalizeProductType(product),
    }));

  const todayActivity = auditLogs.reduce(
    (acc, log) => {
      const details = (log.details ?? {}) as Record<string, unknown>;
      if (log.action === "ORDER_ITEM_DELIVERY_REGISTERED") {
        acc.shipping += 1;
        return acc;
      }

      const status = normalizeFulfillmentStatus(String(details.status ?? ""));
      const itemCount = Array.isArray(details.itemIds)
        ? details.itemIds.filter((value) => Number.isFinite(Number(value))).length
        : 0;

      if (status === "delivered") {
        acc.delivered += itemCount;
      } else if (status === "returned") {
        acc.returned += itemCount;
      }

      return acc;
    },
    { shipping: 0, returned: 0, delivered: 0 }
  );

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    counts: {
      products: productSummary.total,
      readyProducts: productSummary.ready,
      preorderProducts: productSummary.preorder,
      liveProducts: productSummary.live,
      discountedProducts: productSummary.discounted,
      lowStockProducts: productSummary.lowStock,
      openPreorderProducts: productSummary.openPreorder,
      awaitingArrivalProducts: productSummary.awaitingArrival,
      orders: orderSummary.total,
      paidOrders: orderSummary.paid,
      unpaidOrders: orderSummary.unpaid,
      deletedOrders: deletedOrdersCount,
      categories: categoriesCount,
      brands: brandsCount,
      users: usersCount,
    },
    sales: {
      totalRevenue,
      monthRevenue,
      todayRevenue,
      averageOrderValue: orderSummary.paid > 0 ? Math.round(totalRevenue / orderSummary.paid) : 0,
    },
    cargo: {
      remainingFee: remainingCargoFee,
    },
    pipeline: {
      pending: orderSummary.pending,
      arrived: orderSummary.arrived,
      shipping: orderSummary.shipping,
      delivered: orderSummary.delivered,
      returned: orderSummary.returned,
      cancelled: orderSummary.cancelled,
    },
    todayActivity,
    topOrderedProducts,
    trend,
    paymentBreakdown,
    recentOrders,
  });
}
