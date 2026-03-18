"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) {
      const redirect = `/login?next=${encodeURIComponent(pathname || "/")}`;
      router.replace(redirect);
      return;
    }
    setAllowed(true);
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
