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
