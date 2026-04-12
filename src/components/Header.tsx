"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FacebookIcon,
  Box,
  InstagramIcon,
  Mail,
  MenuIcon,
  Phone,
  Search,
  ShoppingBag,
  User,
  VideoIcon,
  X,
  ClipboardList,
} from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";

type StoredUser = {
  token: string;
  role: string;
  name?: string;
  phone?: string;
  avatarUrl?: string;
};

export default function Header() {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const { count } = useCart();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [storeInfo, setStoreInfo] = useState<{
    working_hours?: string;
    phone?: string;
    email?: string;
    facebook_url?: string;
    instagram_url?: string;
  } | null>(null);
  const [categories, setCategories] = useState<
    { category_id: number; category_name: string; subcategories: { id: number; name: string }[] }[]
  >([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/category")
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    fetch("/api/store-info")
      .then((r) => r.json())
      .then((data) => setStoreInfo(data))
      .catch(() => null);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    let next: StoredUser | null = null;
    if (raw) {
      try {
        next = JSON.parse(raw) as StoredUser;
      } catch {
        next = null;
      }
    }
    // Defer state update to avoid cascading-renders lint rule.
    Promise.resolve().then(() => setUser(next));
  }, []);

  const activeCategory = useMemo(
    () => categories.find((c) => c.category_id === activeCategoryId) || categories[0] || null,
    [categories, activeCategoryId]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    router.push(`/products?q=${encodeURIComponent(q)}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setUserMenuOpen(false);
    router.push("/login");
  };

  const resolveMediaUrl = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (typeof window !== "undefined") return `${window.location.origin}${url}`;
    return url;
  };

  return (
    <>
      <div className="bg-[var(--accent-2)] text-white text-[10px] sm:text-xs">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2">
          <span className="hidden sm:inline">Чанартай бараа, Шуурхай захиалга</span>
          <div className="flex flex-wrap items-center gap-3 opacity-90">
            <span className="inline-flex items-center gap-2">
              <Phone size={16} />
              {storeInfo?.phone || "7777-7777"}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-2">
              <Mail size={16} /> {storeInfo?.email || "info@777.mn"}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-2">
              <a
                href={storeInfo?.facebook_url || "https://www.facebook.com/profile.php?id=61550729457619"}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="inline-flex items-center"
              >
                <FacebookIcon size={16} />
              </a>
              <a
                href={storeInfo?.instagram_url || "#"}
                target={storeInfo?.instagram_url ? "_blank" : undefined}
                rel={storeInfo?.instagram_url ? "noreferrer" : undefined}
                aria-label="Instagram"
                className={`inline-flex items-center ${storeInfo?.instagram_url ? "" : "pointer-events-none opacity-60"}`}
              >
                <InstagramIcon size={16} />
              </a>
            </span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 border-b-[3px] border-[var(--accent-2)] z-20 bg-white text-black shadow-md">
        <div className="container mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-4 sm:px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="777 Family Store"
              width={48}
              height={48}
              className="h-12 w-12"
              priority
            />
            <div>
              <div className="text-lg font-extrabold tracking-wide ">777 Family Store</div>
              <div className="text-xs opacity-70">Онлайн дэлгүүр</div>
            </div>
          </Link>
          <div className="flex w-full flex-wrap items-center gap-4 text-xs md:w-auto md:justify-end">
            <form
              onSubmit={handleSearch}
              className="flex w-full md:w-[360px] items-center gap-3 rounded-full border border-black bg-white px-4 text-sm text-[var(--gray-700)] shadow-inner focus-within:border-red-500"
            >
              <Search size={16} />
              <input
                type="text"
                placeholder="Хайх..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent outline-none"
              />
              <button
                type="submit"
                aria-label="Хайлт"
                className="grid h-9 w-9 place-items-center rounded-full text-[var(--gray-700)]"
              >
                <X size={16} />
              </button>
            </form>
            {user && (
              <Link href="/orders" className="flex flex-col items-center gap-1 text-black">
                <div className="relative grid h-7 w-10 place-items-center rounded-xl text-black">
                  <ClipboardList size={16} />
                </div>
                <span className="text-[10px] font-semibold">Захиалгууд</span>
              </Link>
            )}
            <Link href="/cart" className="flex flex-col items-center gap-1 text-black">
              <div className="relative grid h-7 w-10 place-items-center rounded-xl text-black">
                <ShoppingBag size={16} />
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                    {count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">Сагс</span>
            </Link>
            {user ? (
              <button
                type="button"
                aria-label="Нэвтрэх"
                className="relative flex flex-col items-center gap-1 text-black"
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <div className="grid h-7 w-10 place-items-center rounded-xl text-black">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(user.avatarUrl)}
                      alt="User"
                      className="h-7 w-7 rounded-full object-cover ring-2 ring-[var(--accent-2)]"
                    />
                  ) : (
                    <User size={16} />
                  )}
                </div>
                <span className="text-[10px] font-semibold">
                  {user.phone || "Хэрэглэгч"}
                </span>
                {userMenuOpen && (
                  <div className="absolute left-1/2 top-full z-40 mt-3 w-52 max-w-[90vw] -translate-x-1/2 rounded-2xl border bg-white p-3 text-xs shadow-xl">
                    <div className="rounded-xl bg-[var(--sky-50)] px-3 py-2 text-center text-sm font-bold text-[var(--navy-900)]">
                      {user.phone || "Хэрэглэгч"}
                    </div>
                    <Link
                      href="/profile"
                      className="mt-2 block rounded-xl px-3 py-2 text-center font-semibold hover:bg-[var(--sky-100)]"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Хэрэглэгчийн мэдээлэл
                    </Link>
                    <Link
                      href="/orders"
                      className="block rounded-xl px-3 py-2 text-center font-semibold hover:bg-[var(--sky-100)]"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Захиалга
                    </Link>
                    {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                      <Link
                        href="/admin/dashboard"
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl px-3 py-2 text-center font-bold text-red-600 hover:bg-[var(--sky-100)]"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Админ панель
                      </Link>
                    )}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={handleLogout}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleLogout();
                        }
                      }}
                      className="block w-full cursor-pointer rounded-xl px-3 py-2 text-center font-semibold hover:bg-[var(--sky-100)]"
                    >
                      Гарах
                    </div>
                  </div>
                )}
              </button>
            ) : (
              <Link
                href="/login"
                aria-label="Нэвтрэх"
                className="relative flex flex-col items-center gap-1 text-black"
              >
                <div className="grid h-7 w-10 place-items-center rounded-xl text-black">
                  <User size={16} />
                </div>
                <span className="text-[10px] font-semibold">Нэвтрэх</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <nav className="bg-white relative">
        <div className="container mx-auto flex gap-4 overflow-x-auto whitespace-nowrap px-4 sm:px-6 py-3 text-sm font-semibold text-[var(--gray-700)] md:flex-wrap">
          <button
            onClick={() =>
              setCategoryOpen((v) => {
                const next = !v;
                if (next && categories.length > 0 && activeCategoryId == null) {
                  setActiveCategoryId(categories[0].category_id);
                }
                return next;
              })
            }
            className="inline-flex items-center gap-2 rounded-full px-4 text-sm font-semibold text-black hover:bg-[var(--sky-100)]"
          >
            <MenuIcon size={16} />
            Ангилалууд
          </button>
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-2)]"
            href="/live"
          >
            <VideoIcon size={16} /> LIVE-ийн бараа
          </Link>
          <Link className="text-sm font-semibold" href="/products?type=preorder">
            <Box size={16} className="inline-block align-text-bottom" /> Захиалгын бараа
          </Link>
          <Link className="text-sm font-semibold" href="/products?type=ready">
            Бэлэн бараа
          </Link>
          <Link className="text-sm font-semibold" href="/products?discount=true">
            Хямдрал
          </Link>
          <Link className="text-sm font-semibold" href="/products">
            Бүх бараа
          </Link>
        </div>

        {categoryOpen && (
          <>
            <div
              className="fixed inset-0 z-20 bg-black/10"
              onClick={() => setCategoryOpen(false)}
            />
            <div className="absolute left-0 right-0 top-full z-30 border-t bg-white shadow-xl">
              <div className="container mx-auto grid gap-8 px-6 py-6 lg:grid-cols-[280px_1fr]">
                <div className="rounded-2xl border border-[var(--gray-100)] bg-white p-4 shadow-sm">
                  <div className="mb-3 text-sm font-bold text-[var(--navy-900)]">Ангилалууд</div>
                  <div className="space-y-2">
                    {categories.length === 0 ? (
                      <div className="text-sm text-[var(--gray-500)]">Ангилал хоосон байна.</div>
                    ) : (
                      categories.map((cat) => (
                        <button
                          key={cat.category_id}
                          onClick={() => setActiveCategoryId(cat.category_id)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                            cat.category_id === activeCategory?.category_id
                              ? "bg-[var(--accent-2)]/15 text-[var(--accent-2)]"
                              : "hover:bg-[var(--sky-100)]"
                          }`}
                        >
                          <span>{cat.category_name}</span>
                          <span className="text-xs opacity-60">›</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--gray-100)] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/products?category=${activeCategory?.category_id ?? ""}`}
                      onClick={() => setCategoryOpen(false)}
                      className="text-sm font-bold text-[var(--navy-900)] hover:text-[var(--accent-2)]"
                    >
                      {activeCategory?.category_name || "Ангилал"}
                    </Link>
                    <Link
                      href="/products"
                      onClick={() => setCategoryOpen(false)}
                      className="rounded-full bg-[var(--navy-900)] px-4 py-2 text-xs font-semibold text-white"
                    >
                      Бүгдийг харах
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {activeCategory?.subcategories?.length ? (
                      activeCategory.subcategories.map((sub) => (
                        <Link
                          key={sub.id}
                          href={`/products?category=${activeCategory?.category_id ?? ""}&subcategory=${sub.id}`}
                          onClick={() => setCategoryOpen(false)}
                          className="rounded-lg px-3 py-2 text-sm text-[var(--gray-700)] hover:bg-[var(--sky-100)] hover:text-[var(--accent-2)]"
                        >
                          {sub.name}
                        </Link>
                      ))
                    ) : (
                      <div className="text-sm text-[var(--gray-400)]">Дэд ангилал байхгүй</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </nav>
    </>
  );
}
