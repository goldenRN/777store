import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RegisterPageClient from "./RegisterPageClient";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[var(--sky-50)]">
      <Header />
      <RegisterPageClient />
      <Footer />
    </div>
  );
}
