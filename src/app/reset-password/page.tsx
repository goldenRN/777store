import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--sky-50)] flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow text-sm text-[var(--gray-500)]">
            Ачааллаж байна...
          </div>
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}
