import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProfilePageClient from "./ProfilePageClient";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-[var(--sky-50)] flex flex-col">
      <Header />
      <ProfilePageClient />
      <Footer />
    </div>
  );
}
