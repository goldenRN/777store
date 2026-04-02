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
    return {
      "x-actor-id": user.id ?? "",
      "x-actor-name": user.name ?? user.phone ?? "",
      "x-actor-phone": user.phone ?? "",
      "x-actor-role": user.role ?? "",
    };
  } catch {
    return {};
  }
};
