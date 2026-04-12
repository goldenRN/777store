"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function Footer() {
  const [storeInfo, setStoreInfo] = useState<{
    working_hours?: string;
    phone?: string;
    email?: string;
    facebook_url?: string;
    instagram_url?: string;
    address?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/store-info")
      .then((r) => r.json())
      .then((data) => setStoreInfo(data))
      .catch(() => null);
  }, []);

  return (
    <footer className="mt-10 border-t-[3px] border-[var(--accent-2)] bg-white text-black shadow-[0_-6px_20px_rgba(0,0,0,0.08)]">
      <div className="container mx-auto grid gap-10 px-6 py-12 lg:grid-cols-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="777 Family Store"
              width={48}
              height={48}
              className="h-12 w-12"
            />
            <div className="flex-row items-center gap-3">
              <div className="text-md font-extrabold">777 Family Store</div>
              <div className="text-xs font-regular">Онлайн дэлгүүр</div>
            </div>
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">Тусламж</h4>
          <ul className="list-disc space-y-2 pl-4 text-xs text-black/80">
            <li>Хэрэглэгч заавар</li>
            <li>Түгээмэл асуулт</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">Холбоос</h4>
          <ul className="list-disc space-y-2 pl-4 text-xs text-black/80">
            <li><a className="hover:text-[var(--accent-2)]" href="#">Бидний тухай</a></li>
            <li><a className="hover:text-[var(--accent-2)]" href="/terms">Үйлчилгээний нөхцөл</a></li>
            <li><a className="hover:text-[var(--accent-2)]" href="#">Нууцлалын бодлого</a></li>
            {storeInfo?.facebook_url && (
              <li><a className="hover:text-[var(--accent-2)]" href={storeInfo.facebook_url}>Facebook</a></li>
            )}
            {storeInfo?.instagram_url && (
              <li><a className="hover:text-[var(--accent-2)]" href={storeInfo.instagram_url}>Instagram</a></li>
            )}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">Хаяг, Байршил</h4>
          <ul className="list-disc space-y-2 pl-4 text-xs text-black/80">
            <li>{storeInfo?.address || "Улаанбаатар хот, БГД 3-р хороо"}</li>
            <li>{storeInfo?.working_hours || "09:00 - 21:00"}</li>
            {storeInfo?.phone && <li>{storeInfo.phone}</li>}
            {storeInfo?.email && <li>{storeInfo.email}</li>}
          </ul>
        </div>
      </div>
      <div className="bg-[var(--accent-2)] py-3 text-center text-xs font-semibold text-white">
        2026 © Бүх эрх хуулиар хамгаалагдсан
      </div>
    </footer>
  );
}
