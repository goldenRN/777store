export const getActorHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return {};
    const user = JSON.parse(raw) as {
      id?: string;
      name?: string;
      phone?: string;
      role?: string;
    };
    const safe = (v?: string) => (v ? v.replace(/[^\x00-\x7F]/g, "") : "");
    return {
      "x-actor-id": safe(user.id),
      "x-actor-phone": safe(user.phone),
    };
  } catch {
    return {};
  }
};
