const ACTION_LABELS: Record<string, string> = {
  BRAND_CREATE: "Брэнд үүсгэсэн",
  BRAND_UPDATE: "Брэнд зассан",
  BRAND_DELETE: "Брэнд устгасан",
  CATEGORY_CREATE: "Ангилал үүсгэсэн",
  CATEGORY_UPDATE: "Ангилал зассан",
  CATEGORY_DELETE: "Ангилал устгасан",
  PRODUCT_UPDATE: "Бараа зассан",
  PRODUCT_DELETE: "Бараа устгасан",
  PRODUCT_STATUS_UPDATE: "Барааны төлөв өөрчилсөн",
  ORDER_STATUS_UPDATE: "Захиалгын төлөв өөрчилсөн",
  ORDER_SOFT_DELETE: "Захиалга устгасан",
  ORDER_ITEM_STATUS_UPDATE: "Захиалсан барааны төлөв өөрчилсөн",
  ORDER_ITEMS_BULK_STATUS: "Олон барааны төлөв шинэчилсэн",
  ORDER_ITEM_DELIVERY_REQUEST: "Хүргэлтийн хүсэлт бүртгэсэн",
  ORDER_ITEM_DELIVERY_REGISTERED: "Хүргэлтэнд бүртгэсэн",
  DELIVERY_ORDER_MARK_DELIVERED: "Хүргэлтийг дуусгасан",
  USER_UPDATE: "Хэрэглэгчийн мэдээлэл зассан",
  USER_ROLE_UPDATE: "Хэрэглэгчийн эрх өөрчилсөн",
  PAYMENT_METHOD_CREATE: "Төлбөрийн хэрэгсэл үүсгэсэн",
  PAYMENT_METHOD_UPDATE: "Төлбөрийн хэрэгсэл зассан",
  PAYMENT_METHOD_DELETE: "Төлбөрийн хэрэгсэл устгасан",
  ORDER_ADMIN_CREATE: "Админаас захиалга үүсгэсэн",
};

const ENTITY_LABELS: Record<string, string> = {
  AdminBrand: "Брэнд",
  AdminCategory: "Ангилал",
  AdminProduct: "Бараа",
  AdminOrder: "Захиалга",
  AdminOrderItem: "Захиалсан бараа",
  AdminDeliveryOrder: "Хүргэлтийн захиалга",
  User: "Хэрэглэгч",
  payment_method: "Төлбөрийн хэрэгсэл",
  order_admin: "Админаас үүсгэсэн захиалга",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Хүлээгдэж байгаа",
  shipping: "Хүргэлтэнд бүртгэгдсэн",
  shipped: "Хүргэлтэнд бүртгэгдсэн",
  delivered: "Бараа олгосон",
  completed: "Бараа олгосон",
  returned: "Буцаагдсан",
  cancelled: "Цуцлагдсан",
  canceled: "Цуцлагдсан",
  confirmed: "Бараа ирсэн",
  open: "Захиалга авч байгаа",
  closed: "Захиалга хаагдсан",
};

function titleCaseFromKey(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getAuditActionLabel(action: string | null | undefined) {
  const key = String(action || "").trim();
  if (!key) return "Тодорхойгүй үйлдэл";
  return ACTION_LABELS[key] || titleCaseFromKey(key);
}

export function getAuditEntityLabel(entityType: string | null | undefined) {
  const key = String(entityType || "").trim();
  if (!key) return "Тодорхойгүй төрөл";
  return ENTITY_LABELS[key] || key;
}

export function getAuditStatusLabel(status: unknown) {
  const raw = String(status ?? "").trim();
  if (!raw) return "-";
  return STATUS_LABELS[raw.toLowerCase()] || raw;
}

export function getAuditActionTone(action: string | null | undefined) {
  const key = String(action || "");
  if (key.includes("DELETE") || key.includes("RETURN")) {
    return "bg-rose-100 text-rose-700 border-rose-200";
  }
  if (key.includes("DELIVERY") || key.includes("STATUS")) {
    return "bg-sky-100 text-sky-700 border-sky-200";
  }
  if (key.includes("CREATE")) {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  if (key.includes("UPDATE")) {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function formatMoney(value: unknown) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return null;
  return `${num.toLocaleString()}₮`;
}

export function summarizeAuditDetails(details: unknown) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "-";
  const data = details as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof data.name === "string" && data.name.trim()) {
    parts.push(`Нэр: ${data.name.trim()}`);
  } else if (typeof data.product_name === "string" && data.product_name.trim()) {
    parts.push(`Бараа: ${data.product_name.trim()}`);
  }

  if (data.order_id != null) parts.push(`Захиалга #${data.order_id}`);
  if (data.item_id != null) parts.push(`Мөр #${data.item_id}`);

  if (typeof data.status === "string" && data.status.trim()) {
    parts.push(`Төлөв: ${getAuditStatusLabel(data.status)}`);
  }

  if (typeof data.from_status === "string" || typeof data.to_status === "string") {
    const from = getAuditStatusLabel(data.from_status);
    const to = getAuditStatusLabel(data.to_status);
    if (from !== "-" || to !== "-") parts.push(`Төлөв: ${from} → ${to}`);
  }

  if (typeof data.returnNote === "string" && data.returnNote.trim()) {
    parts.push(`Тайлбар: ${data.returnNote.trim()}`);
  } else if (typeof data.reason === "string" && data.reason.trim()) {
    parts.push(`Шалтгаан: ${data.reason.trim()}`);
  } else if (typeof data.deleted_reason === "string" && data.deleted_reason.trim()) {
    parts.push(`Шалтгаан: ${data.deleted_reason.trim()}`);
  }

  const deliveryFee = formatMoney(data.delivery_fee);
  const cargoFee = formatMoney(data.cargo_fee);
  const totalFee = formatMoney(data.total_fee);
  if (deliveryFee) parts.push(`Хүргэлт: ${deliveryFee}`);
  if (cargoFee) parts.push(`Карго: ${cargoFee}`);
  if (totalFee) parts.push(`Нийт: ${totalFee}`);

  if (Array.isArray(data.itemIds) && data.itemIds.length > 0) {
    parts.push(`Мөрийн тоо: ${data.itemIds.length}`);
  }

  if (typeof data.payment_method === "string" && data.payment_method.trim()) {
    parts.push(`Төлбөр: ${data.payment_method.trim()}`);
  }

  return parts.length > 0 ? parts.join(" • ") : JSON.stringify(details);
}
