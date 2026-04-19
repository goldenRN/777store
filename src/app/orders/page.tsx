import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OrdersPageClient from "./OrdersPageClient";

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-[var(--sky-50)] flex flex-col">
      <Header />
      <OrdersPageClient />
      <Footer />
    </div>
  );
}
