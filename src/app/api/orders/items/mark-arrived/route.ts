import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createArrivedNotificationsByOrderItemIds } from "@/lib/userNotifications";

type ProductTypeLike = {
  has_duration?: boolean | null;
  name?: string | null;
} | null;

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action ?? "mark_arrived").trim().toLowerCase();
    const productId = Number(body?.productId);
    const variantIdRaw = body?.variantId;
    const variantId = variantIdRaw === "" || variantIdRaw == null ? null : Number(variantIdRaw);
    const arrived_qty_raw = body?.arrived_qty;
    const arrived_qty =
      arrived_qty_raw == null || arrived_qty_raw === "" ? null : Math.round(Number(arrived_qty_raw));
    const cargo_fee_raw = body?.cargo_fee;
    const cargo_fee =
      cargo_fee_raw == null || cargo_fee_raw === "" ? null : Math.round(Number(cargo_fee_raw));
    const cargo_note = body?.cargo_note != null ? String(body.cargo_note).trim() : null;

    if (!productId) {
      return NextResponse.json({ message: "productId шаардлагатай" }, { status: 400 });
    }
    if (action !== "revert_pending") {
      if (arrived_qty != null && (!Number.isFinite(arrived_qty) || arrived_qty < 0)) {
        return NextResponse.json({ message: "Ирсэн тоо зөв оруулна уу." }, { status: 400 });
      }
      if (cargo_fee == null || !Number.isFinite(cargo_fee) || cargo_fee < 0) {
        return NextResponse.json({ message: "Карго үнэ зөв оруулна уу." }, { status: 400 });
      }
    }
    if (variantId != null && !Number.isFinite(variantId)) {
      return NextResponse.json({ message: "variantId буруу байна" }, { status: 400 });
    }

    const pendingStatus = await prisma.adminStatus.findFirst({ orderBy: { id: "asc" } });
    const pendingName = pendingStatus?.name ?? null;
    const arrivedStatus = await prisma.adminStatus.findFirst({
      where: { name: { contains: "Бараа ирсэн" } },
      orderBy: { id: "asc" },
    });
    const arrivedName = arrivedStatus?.name ?? "Бараа ирсэн";
    const shippingStatus = await prisma.adminStatus.findFirst({
      where: { name: { contains: "Хүргэлт" } },
      orderBy: { id: "asc" },
    });
    const shippingName = shippingStatus?.name ?? pendingName ?? "Хүргэлтэнд бүртгэгдсэн";

    const result = await prisma.$transaction(async (tx) => {
      const finalItemStatuses = ["Бараа ирсэн", "Хүргэлтэнд бүртгэгдсэн", "Бараа олгосон", "Буцаагдсан"];
      const lockedItemStatuses = ["Хүргэлтэнд бүртгэгдсэн", "Бараа олгосон", "Буцаагдсан", "Хүргэгдсэн"];
      const getMatchingOrderItemIds = async (where: Prisma.AdminOrderItemWhereInput) => {
        const rows = await tx.adminOrderItem.findMany({
          where,
          select: { id: true },
        });
        return rows.map((row) => row.id);
      };

      const isPreorderType = (type: ProductTypeLike) => {
        if (type?.has_duration === true) return true;
        const name = String(type?.name ?? "").toLowerCase();
        if (name.includes("захиал") || name.includes("урьдчил") || name.includes("preorder")) return true;
        if (name.includes("лайв") || name.includes("live")) return true;
        return false;
      };

      const updateOrdersIfPreorderArrived = async (orderIds: number[]) => {
        const uniq = Array.from(new Set(orderIds)).filter((x) => Number.isFinite(x));
        if (uniq.length === 0) return 0;

        const orders = await tx.adminOrder.findMany({
          where: {
            id: { in: uniq },
            deleted_at: null,
            payment_status: "PAID",
            ...(pendingName ? { status: pendingName } : {}),
          },
          include: { items: true },
        });
        if (orders.length === 0) return 0;

        const productIds = Array.from(
          new Set(
            orders
              .flatMap((o) => o.items)
              .map((it) => it.product_id)
              .filter((x): x is number => x != null)
          )
        );
        const products = productIds.length
          ? await tx.adminProduct.findMany({
              where: { id: { in: productIds } },
              include: { type: true },
            })
          : [];
        const preorderProductIds = new Set<number>(products.filter((p) => isPreorderType(p.type)).map((p) => p.id));

        let changed = 0;
        for (const o of orders) {
          // Only "preorder" items require arrival; ready items are ignored.
          const preorderItems = (o.items || []).filter((it) => {
            if (it.product_id == null) return true; // safest fallback
            return preorderProductIds.has(it.product_id);
          });
          if (preorderItems.length === 0) continue;
          const allPreorderArrived = preorderItems.every((it) => it.status === "Бараа ирсэн");
          if (!allPreorderArrived) continue;

          const nextStatus =
            o.delivery_method === "delivery" ? shippingName : arrivedName;

          await tx.adminOrder.update({
            where: { id: o.id },
            data: {
              status: nextStatus,
              ...(nextStatus === shippingName
                ? {
                    items: {
                      updateMany: {
                        where: { order_id: o.id },
                        data: { status: nextStatus },
                      },
                    },
                  }
                : {}),
            },
          });
          changed += 1;
        }
        return changed;
      };

      const revertOrdersToPending = async (orderIds: number[]) => {
        const uniq = Array.from(new Set(orderIds)).filter((x) => Number.isFinite(x));
        if (uniq.length === 0) return 0;

        const orders = await tx.adminOrder.findMany({
          where: {
            id: { in: uniq },
            deleted_at: null,
            payment_status: "PAID",
          },
          include: { items: true },
        });
        if (orders.length === 0) return 0;

        const productIds = Array.from(
          new Set(
            orders
              .flatMap((o) => o.items)
              .map((it) => it.product_id)
              .filter((x): x is number => x != null)
          )
        );
        const products = productIds.length
          ? await tx.adminProduct.findMany({
              where: { id: { in: productIds } },
              include: { type: true },
            })
          : [];
        const preorderProductIds = new Set<number>(products.filter((p) => isPreorderType(p.type)).map((p) => p.id));

        let changed = 0;
        for (const o of orders) {
          const preorderItems = (o.items || []).filter((it) => {
            if (it.product_id == null) return true;
            return preorderProductIds.has(it.product_id);
          });
          if (preorderItems.length === 0) continue;
          const allPreorderArrived = preorderItems.every((it) => it.status === "Бараа ирсэн");
          if (allPreorderArrived) continue;
          if (o.status !== arrivedName && o.status !== shippingName) continue;

          await tx.adminOrder.update({
            where: { id: o.id },
            data: { status: pendingName ?? "Хүлээгдэж буй" },
          });
          changed += 1;
        }
        return changed;
      };

      if (action === "revert_pending") {
        if (variantId != null) {
          const lockedCount = await tx.adminOrderItem.count({
            where: {
              product_id: productId,
              variant_id: variantId,
              status: { in: lockedItemStatuses },
              order: {
                is: {
                  deleted_at: null,
                  payment_status: "PAID",
                },
              },
            },
          });
          if (lockedCount > 0) {
            throw new Error("Ирж авсан эсвэл хүргэлтэнд орсон мөр байгаа тул буцаах боломжгүй.");
          }

          const candidateOrders = await tx.adminOrderItem.findMany({
            where: {
              product_id: productId,
              variant_id: variantId,
              status: "Бараа ирсэн",
              order: {
                is: {
                  deleted_at: null,
                  payment_status: "PAID",
                },
              },
            },
            select: { order_id: true },
            distinct: ["order_id"],
          });

          const updated = await tx.adminOrderItem.updateMany({
            where: {
              product_id: productId,
              variant_id: variantId,
              status: "Бараа ирсэн",
              order: {
                is: {
                  deleted_at: null,
                  payment_status: "PAID",
                },
              },
            },
            data: { status: pendingName ?? "Хүлээгдэж буй" },
          });

          await tx.adminProductVariant.update({
            where: { id: variantId },
            data: { arrived_qty: null, cargo_fee: null, cargo_note: null },
          });

          const siblingVariants = await tx.adminProductVariant.findMany({
            where: { product_id: productId },
            select: {
              arrived_qty: true,
              cargo_fee: true,
              cargo_note: true,
            },
          });
          const allVariantsArrived = siblingVariants.length > 0 && siblingVariants.every((variant) => variant.arrived_qty != null);
          const firstCargoFee = siblingVariants[0]?.cargo_fee ?? null;
          const firstCargoNote = siblingVariants[0]?.cargo_note ?? null;
          const uniformCargo =
            siblingVariants.length > 0 &&
            siblingVariants.every(
              (variant) =>
                Number(variant.cargo_fee ?? 0) === Number(firstCargoFee ?? 0) &&
                String(variant.cargo_note ?? "") === String(firstCargoNote ?? "")
            );

          await tx.adminProduct.update({
            where: { id: productId },
            data: {
              arrival_status: allVariantsArrived ? "Бараа ирсэн" : "Хүлээгдэж буй",
              arrived_qty: allVariantsArrived
                ? siblingVariants.reduce((sum, variant) => sum + Math.max(0, Number(variant.arrived_qty ?? 0)), 0)
                : null,
              cargo_fee: allVariantsArrived && uniformCargo ? (firstCargoFee != null ? Number(firstCargoFee) : null) : null,
              cargo_note: allVariantsArrived && uniformCargo ? firstCargoNote || null : null,
            },
          });

          const updatedOrders = await revertOrdersToPending(candidateOrders.map((x) => x.order_id));
          return { kind: "variant-reverted" as const, updatedCount: updated.count, updatedOrders };
        }

        const lockedCount = await tx.adminOrderItem.count({
          where: {
            product_id: productId,
            status: { in: lockedItemStatuses },
            order: {
              is: {
                deleted_at: null,
                payment_status: "PAID",
              },
            },
          },
        });
        if (lockedCount > 0) {
          throw new Error("Ирж авсан эсвэл хүргэлтэнд орсон мөр байгаа тул буцаах боломжгүй.");
        }

        const candidateOrders = await tx.adminOrderItem.findMany({
          where: {
            product_id: productId,
            status: "Бараа ирсэн",
            order: {
              is: {
                deleted_at: null,
                payment_status: "PAID",
              },
            },
          },
          select: { order_id: true },
          distinct: ["order_id"],
        });

        const updated = await tx.adminOrderItem.updateMany({
          where: {
            product_id: productId,
            status: "Бараа ирсэн",
            order: {
              is: {
                deleted_at: null,
                payment_status: "PAID",
              },
            },
          },
          data: { status: pendingName ?? "Хүлээгдэж буй" },
        });

        await tx.adminProduct.update({
          where: { id: productId },
          data: {
            arrival_status: "Хүлээгдэж буй",
            arrived_qty: null,
            cargo_fee: null,
            cargo_note: null,
          },
        });

        await tx.adminProductVariant.updateMany({
          where: { product_id: productId },
          data: {
            arrived_qty: null,
            cargo_fee: null,
            cargo_note: null,
          },
        });

        const updatedOrders = await revertOrdersToPending(candidateOrders.map((x) => x.order_id));
        return { kind: "product-reverted" as const, updatedCount: updated.count, updatedOrders };
      }

      if (variantId != null) {
        const notifyIds = new Set<number>();
        await tx.adminProductVariant.update({
          where: { id: variantId },
          data: { cargo_fee, cargo_note: cargo_note || null, arrived_qty },
        });

        const variantItemWhere = {
          product_id: productId,
          variant_id: variantId,
          status: { not: "Бараа ирсэн" },
          order: {
            is: {
              deleted_at: null,
              payment_status: "PAID",
              ...(pendingName ? { status: pendingName } : {}),
            },
          },
        } as const;
        for (const id of await getMatchingOrderItemIds(variantItemWhere)) {
          notifyIds.add(id);
        }
        const updated = await tx.adminOrderItem.updateMany({
          where: variantItemWhere,
          data: { status: "Бараа ирсэн" },
        });
        const candidateOrders = await tx.adminOrderItem.findMany({
          where: {
            product_id: productId,
            variant_id: variantId,
            status: "Бараа ирсэн",
            order: {
              is: {
                deleted_at: null,
                payment_status: "PAID",
                ...(pendingName ? { status: pendingName } : {}),
              },
            },
          },
          select: { order_id: true },
          distinct: ["order_id"],
        });
        const updatedOrders = await updateOrdersIfPreorderArrived(candidateOrders.map((x) => x.order_id));

        const siblingVariants = await tx.adminProductVariant.findMany({
          where: { product_id: productId },
          select: {
            arrived_qty: true,
            cargo_fee: true,
            cargo_note: true,
          },
        });
        if (siblingVariants.length > 0) {
          const allVariantsArrived = siblingVariants.every((variant) => variant.arrived_qty != null);
          const firstCargoFee = siblingVariants[0]?.cargo_fee ?? null;
          const firstCargoNote = siblingVariants[0]?.cargo_note ?? null;
          const uniformCargo = siblingVariants.every(
            (variant) =>
              Number(variant.cargo_fee ?? 0) === Number(firstCargoFee ?? 0) &&
              String(variant.cargo_note ?? "") === String(firstCargoNote ?? "")
          );

          await tx.adminProduct.update({
            where: { id: productId },
            data: {
              arrival_status: allVariantsArrived ? "Бараа ирсэн" : "Хүлээгдэж буй",
              arrived_qty: allVariantsArrived
                ? siblingVariants.reduce((sum, variant) => sum + Math.max(0, Number(variant.arrived_qty ?? 0)), 0)
                : null,
              ...(allVariantsArrived && uniformCargo
                ? {
                    cargo_fee: firstCargoFee != null ? Number(firstCargoFee) : null,
                    cargo_note: firstCargoNote || null,
                  }
                : {}),
            },
          });

          if (allVariantsArrived) {
            const remainingProductWhere = {
              product_id: productId,
              status: { notIn: finalItemStatuses },
              order: {
                is: {
                  deleted_at: null,
                  payment_status: "PAID",
                },
              },
            } as const;
            for (const id of await getMatchingOrderItemIds(remainingProductWhere)) {
              notifyIds.add(id);
            }
            await tx.adminOrderItem.updateMany({
              where: remainingProductWhere,
              data: { status: "Бараа ирсэн" },
            });

            const allProductOrders = await tx.adminOrderItem.findMany({
              where: {
                product_id: productId,
                status: "Бараа ирсэн",
                order: {
                  is: {
                    deleted_at: null,
                    payment_status: "PAID",
                  },
                },
              },
              select: { order_id: true },
              distinct: ["order_id"],
            });
            await updateOrdersIfPreorderArrived(allProductOrders.map((x) => x.order_id));
          }
        }

        await createArrivedNotificationsByOrderItemIds(tx, Array.from(notifyIds));

        return { kind: "variant" as const, updatedCount: updated.count, updatedOrders };
      }

      const variants = await tx.adminProductVariant.findMany({
        where: { product_id: productId },
        select: { id: true },
      });
      const hasVariants = variants.length > 0;

      await tx.adminProduct.update({
        where: { id: productId },
        data: {
          cargo_fee,
          cargo_note: cargo_note || null,
          arrival_status: "Бараа ирсэн",
          arrived_qty,
        },
      });

      if (hasVariants) {
        await tx.adminProductVariant.updateMany({
          where: { product_id: productId },
          data: { cargo_fee, cargo_note: cargo_note || null },
        });
      }

      const productItemWhere = {
        product_id: productId,
        status: { not: "Бараа ирсэн" },
        order: {
          is: {
            deleted_at: null,
            payment_status: "PAID",
            ...(pendingName ? { status: pendingName } : {}),
          },
        },
      } as const;
      const notifyIds = await getMatchingOrderItemIds(productItemWhere);
      const updated = await tx.adminOrderItem.updateMany({
        where: productItemWhere,
        data: { status: "Бараа ирсэн" },
      });
      const candidateOrders = await tx.adminOrderItem.findMany({
        where: {
          product_id: productId,
          status: "Бараа ирсэн",
          order: {
            is: {
              deleted_at: null,
              payment_status: "PAID",
              ...(pendingName ? { status: pendingName } : {}),
            },
          },
        },
        select: { order_id: true },
        distinct: ["order_id"],
      });
      const updatedOrders = await updateOrdersIfPreorderArrived(candidateOrders.map((x) => x.order_id));
      await createArrivedNotificationsByOrderItemIds(tx, notifyIds);
      return {
        kind: hasVariants ? ("product-all-variants" as const) : ("product" as const),
        updatedCount: updated.count,
        updatedOrders,
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Серверийн алдаа" }, { status: 500 });
  }
}
