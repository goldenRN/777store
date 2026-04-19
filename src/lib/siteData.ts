import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getStoreInfo = cache(async () => {
  return prisma.adminStoreInfo.findFirst({
    orderBy: { id: "desc" },
    select: {
      working_hours: true,
      phone: true,
      email: true,
      facebook_url: true,
      instagram_url: true,
      address: true,
    },
  });
});

export const getHeaderCategories = cache(async () => {
  return prisma.adminCategory.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      category_name: true,
      subcategories: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
});

export const getHeaderBrands = cache(async () => {
  return prisma.adminBrand.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      image_url: true,
    },
  });
});
