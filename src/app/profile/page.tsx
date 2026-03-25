"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ProfilePage() {
  const user = (() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      return JSON.parse(raw) as { name?: string; phone?: string; role?: string };
    } catch {
      return null;
    }
  })();

  return (
    <div className="min-h-screen bg-[var(--sky-50)] flex flex-col">
      <Header />
      <main className="container mx-auto px-6 py-10 flex-1">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="text-lg font-bold">Хэрэглэгчийн мэдээлэл</div>
          {user ? (
            <div className="mt-4 space-y-2 text-sm">
              <div>Нэр: {user.name || "-"}</div>
              <div>Утас: {user.phone || "-"}</div>
              <div>Эрх: {user.role || "-"}</div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-[var(--gray-500)]">Нэвтрээгүй байна.</div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
