"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";

export default function Header() {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <>
      <div className="bg-[var(--accent)] text-white text-xs">
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

      <header className="sticky top-0 z-20 bg-black text-white shadow-md">
        <div className="container mx-auto flex items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo-777.svg" alt="777 Family Store" className="h-12 w-12" />
            <div>
              <div className="text-lg font-extrabold tracking-wide">777 Family Store</div>
              <div className="text-xs opacity-70">Онлайн дэлгүүр</div>
            </div>
          </div>

          <div className="mx-4 flex min-w-0 flex-1 justify-center">
            {showSearch && (
              <div className="flex w-full max-w-lg items-center gap-3 rounded-full bg-white px-4 py-2 text-sm text-[var(--gray-700)] shadow-inner">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Хайх..."
                  className="w-full bg-transparent outline-none"
                />
                <button className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white">
                  Хайх
                </button>
                <button
                  type="button"
                  aria-label="Хайлт хаах"
                  onClick={() => setShowSearch(false)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-[var(--gray-100)] text-[var(--gray-700)]"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              aria-label="Хайлт"
              onClick={() => setShowSearch((prev) => !prev)}
              className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"
            >
              <Search size={16} />
            </button>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
              <ShoppingBag size={16} />
            </div>
            <Link
              href="/login"
              aria-label="Нэвтрэх"
              className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"
            >
              <User size={16} />
            </Link>
          </div>
        </div>
      </header>

      <nav className="bg-white">
        <div className="container mx-auto flex flex-wrap gap-6 px-6 py-3 text-sm font-semibold text-[var(--gray-700)]">
          <button className="inline-flex items-center gap-2 px-4 text-sm font-semibold text-black">
            <MenuIcon size={16} />
            Ангилалууд
          </button>
          <a
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]"
            href="#"
          >
            <VideoIcon size={16} /> LIVE-ийн бараа
          </a>
          <a className="text-sm font-semibold" href="#">
            <Box size={16} className="inline-block align-text-bottom" /> Захиалгын бараа
          </a>
          <a className="text-sm font-semibold" href="#">
            Бэлэн бараа
          </a>
          <a className="text-sm font-semibold" href="#">
            Хямдрал
          </a>
        </div>
      </nav>
    </>
  );
}
