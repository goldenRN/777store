import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Account Deletion | 777 Family Store",
  description: "777 Family Store account deletion instructions.",
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-[var(--sky-50)] flex flex-col">
      <Header />
      <main className="container mx-auto px-6 py-10 flex-1">
        <div className="rounded-2xl bg-white p-6 shadow max-w-3xl">
          <h1 className="text-2xl font-semibold text-gray-900">
            777 Family Store Account Deletion
          </h1>

          <p className="mt-4 text-gray-700">
            If you want to delete your account and associated data, please follow these steps:
          </p>

          <ol className="mt-3 list-decimal pl-6 text-gray-700 space-y-2">
            <li>
              Send a request to:{" "}
              <a className="text-[var(--accent-2)] underline" href="mailto:support@777store.mn">
                support@777store.mn
              </a>
            </li>
            <li>Include your registered phone number</li>
          </ol>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900">What will be deleted:</h2>
            <ul className="mt-2 list-disc pl-6 text-gray-700 space-y-1">
              <li>User account</li>
              <li>Personal information</li>
              <li>Order history</li>
            </ul>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900">Data retention:</h2>
            <ul className="mt-2 list-disc pl-6 text-gray-700 space-y-1">
              <li>
                Some transaction data may be retained for legal purposes for up to 30 days.
              </li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

