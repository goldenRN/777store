"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = async () => {
      let userRaw = localStorage.getItem("user");
      if (!userRaw) {
        try {
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            if (data?.id) {
              const userData = {
                id: data.id,
                name: data.name ?? null,
                username: data.name ?? data.phone ?? "",
                phone: data.phone ?? "",
                role: data.role ?? "user",
                token: "cookie",
              };
              localStorage.setItem("user", JSON.stringify(userData));
              userRaw = JSON.stringify(userData);
            }
          }
        } catch {
          // ignore
        }
      }

      if (!userRaw) {
        const redirect = `/login?next=${encodeURIComponent(pathname || "/")}`;
        router.replace(redirect);
        return;
      }
      if (requireAdmin) {
        try {
          const user = JSON.parse(userRaw) as { role?: string };
          const role = String(user?.role ?? "").toLowerCase();
          if (role !== "admin" && role !== "super_admin") {
            router.replace("/");
            return;
          }
        } catch {
          router.replace("/");
          return;
        }
      }
      setAllowed(true);
    };
    check();
  }, [router, pathname]);

  if (!allowed) {
    return (
      <div className="flex w-full items-center justify-center py-10 text-sm text-gray-500">
        Түр хүлээнэ үү...
      </div>
    );
  }

  return <>{children}</>;
}
