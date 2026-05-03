export const resolveMediaUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return url;
  return `/uploads/${url}`;
};

export const isExternalMediaUrl = (url?: string | null) => {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
};

export const normalizeMediaUrl = (url?: string | null) => {
  if (!url) return "";

  let clean = url.split("?")[0].split("#")[0];

  if (isExternalMediaUrl(clean)) {
    try {
      const parsed = new URL(clean);
      if (parsed.pathname.includes("/uploads/")) return parsed.pathname;
      return clean;
    } catch {
      return clean;
    }
  }

  if (clean.startsWith("/uploads/")) return clean;
  if (clean.startsWith("uploads/")) return `/${clean}`;
  if (clean.startsWith("/")) return clean;

  return `/uploads/${clean}`;
};

export const getMediaThumbUrl = (url?: string | null) => {
  if (!url) return "";
  if (isExternalMediaUrl(url)) return url;

  const clean = url.split("?")[0].split("#")[0];
  const parts = clean.split("/");
  const filename = parts[parts.length - 1] || "";
  if (!filename) return url;

  const dot = filename.lastIndexOf(".");
  const base = dot >= 0 ? filename.slice(0, dot) : filename;

  if (base.endsWith("_sm")) return url;

  const thumbName = `${base}_sm.jpg`;
  return `${parts.slice(0, -1).join("/")}/${thumbName}`;
};
