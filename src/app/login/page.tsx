import { Suspense } from "react";
import LoginPageClient from "./LoginPageClient";

function LoginFallback() {
  return (
    <div className="min-h-screen bg-[var(--sky-50)]">
      <div className="container mx-auto px-6 py-10">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold">Нэвтрэх</h1>
          <p className="mt-2 text-sm text-[var(--gray-700)]">Уншиж байна...</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}