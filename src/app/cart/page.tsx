import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartPageClient from "./CartPageClient";

export default function CartPage() {
  return (
    <div className="min-h-screen bg-[var(--sky-50)] flex flex-col">
      <Header />
      <CartPageClient />
      <Footer />
    </div>
  );
}
