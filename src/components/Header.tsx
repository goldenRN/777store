"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function Header() {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const { count } = useCart();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<{ token: string; role: string; name?: string; phone?: string } | null>(null);
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
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (!categoryOpen) return;
    if (categories.length > 0 && activeCategoryId == null) {
      setActiveCategoryId(categories[0].category_id);
    }
  }, [categoryOpen, categories, activeCategoryId]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.category_id === activeCategoryId) || categories[0],
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

  return (
    <>
      <div className="bg-[var(--accent-2)] text-white text-xs">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-2">
          <span>Чанартай бараа, Шуурхай захиалга</span>
          <div className="flex items-center gap-4 opacity-90">
            <span className="inline-flex items-center gap-2">
              <Phone size={16} />
              7777-7777
            </span>
            •
            <span className="inline-flex items-center gap-2">
              <Mail size={16} /> info@777.mn
            </span>
            •
            <span className="inline-flex items-center gap-2">
              <FacebookIcon size={16} /> <InstagramIcon size={16} />
            </span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 border-b-[3px] border-[var(--accent-2)] z-20 bg-white text-black shadow-md">
        <div className="container mx-auto flex items-center justify-between gap-6 px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="777 Family Store" className="h-12 w-12" />
            <div>
              <div className="text-lg font-extrabold tracking-wide ">777 Family Store</div>
              <div className="text-xs opacity-70">Онлайн дэлгүүр</div>
            </div>
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <form
              onSubmit={handleSearch}
              className="flex w-full max-w-lg items-center gap-3 rounded-full border border-black bg-white px-4 mr-5 text-sm text-[var(--gray-700)] shadow-inner focus-within:border-red-500"
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
            {user && user.role !== "ADMIN" && (
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
            <Link
              href={user ? "#" : "/login"}
              aria-label="Нэвтрэх"
              className="relative flex flex-col items-center gap-1 text-black"
              onClick={(e) => {
                if (user) {
                  e.preventDefault();
                  setUserMenuOpen((v) => !v);
                }
              }}
            >
              <div className="grid h-7 w-10 place-items-center rounded-xl text-black">
                <User size={16} />
              </div>
              <span className="text-[10px] font-semibold">
                {user ? user.phone || "Хэрэглэгч" : "Нэвтрэх"}
              </span>
              {userMenuOpen && user && (
                <div className="absolute right-0 top-full z-40 mt-2 w-44 rounded-xl border bg-white p-2 text-xs shadow-lg">
                  <div className="px-2 py-1 font-semibold text-[var(--navy-900)]">
                    {user.phone || "Хэрэглэгч"}
                  </div>
                  {user.role !== "ADMIN" ? (
                    <>
                      <Link
                        href="/profile"
                        className="block rounded-lg px-2 py-2 hover:bg-[var(--sky-100)]"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Хэрэглэгчийн мэдээлэл
                      </Link>
                      <Link
                        href="/orders"
                        className="block rounded-lg px-2 py-2 hover:bg-[var(--sky-100)]"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Захиалга
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/admin/dashboard"
                      className="block rounded-lg px-2 py-2 hover:bg-[var(--sky-100)]"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Админ панель
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full rounded-lg px-2 py-2 text-left hover:bg-[var(--sky-100)]"
                  >
                    Гарах
                  </button>
                </div>
              )}
            </Link>
          </div>
        </div>
      </header>

      <nav className="bg-white relative">
        <div className="container mx-auto flex flex-wrap gap-6 px-6 py-3 text-sm font-semibold text-[var(--gray-700)]">
          <button
            onClick={() => setCategoryOpen((v) => !v)}
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
                      href={`/products?category=${activeCategory?.category_id ?? ""}`}
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
