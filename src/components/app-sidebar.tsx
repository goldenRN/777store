"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import Image from 'next/image';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { TerminalSquareIcon, BotIcon, BookOpenIcon, Settings2Icon, LifeBuoyIcon, SendIcon, FrameIcon, PieChartIcon, MapIcon, TerminalIcon, LogOutIcon, LockIcon, BoxIcon, ListCheckIcon, VideoIcon, ListPlusIcon } from "lucide-react"

const data = {
  navMain: [
    {
      title: "Хяналтын самбар",
      url: "/admin/dashboard",
      icon: <TerminalSquareIcon />,
      isActive: true,
    },

    {
      title: "Бараа бүртгэл",
      url: "/admin/product",
      icon: <ListCheckIcon />,
      items: [
        { title: "Бэлэн бараа", url: "/admin/product?type=ready" },
        { title: "Захиалгын бараа", url: "/admin/product?type=preorder" },
        { title: "Лайвын бараа", url: "/admin/product?type=live" },
        { title: "Хямдралтай", url: "/admin/product?discount=true" },
        { title: "Хаагдсан бараа", url: "/admin/product?closed=true" },
        // { title: "Онцлох", url: "/admin/product?featured=true" },
      ],
    },

    {
      title: "Захиалга ",
      url: "/admin/order",
      icon: <BoxIcon />,
      items: [
        { title: "Хүлээгдэж буй", url: "/admin/order?status=pending" },
        { title: "Бараа ирсэн", url: "/admin/order?status=confirmed" },
        { title: "Хүргэлтэнд бүртгэгдсэн", url: "/admin/order?status=shipping" },
        { title: "Хүргэгдсэн", url: "/admin/order?status=delivered" },
        { title: "Цуцлагдсан", url: "/admin/order?status=cancelled" },
      ],
    },
    {
      title: "Бараа олгох",
      url: "/admin/fulfillment",
      icon: <MapIcon />,
    },

    {
      title: "Лайв худалдаа",
      url: "/admin/live",
      icon: <VideoIcon />,
      items: [
        { title: "Live бүртгэл", url: "/admin/live" },
        { title: "Live бараа", url: "/admin/product?type=live" },
      ],
    },
    {
      title: "Тохиргоо",
      url: "/admin/settings/store-info",
      icon: <Settings2Icon />,
      items: [
        { title: "Мэдээлэл шинэчлэх", url: "/admin/settings/store-info" },
        { title: "Нууц үг солих", url: "/admin/settings/password" },
      ],
    },
    {
      title: "Бүртгэл",
      url: "/admin/category",
      icon: <ListPlusIcon />,
      items: [
        { title: "Ангилал", url: "/admin/category" },
        { title: "Дэд ангилал", url: "/admin/subCategory" },
        { title: "Төлөв", url: "/admin/state" },
        { title: "Төрөл", url: "/admin/type" },
        { title: "Брэнд", url: "/admin/brand" },
        { title: "Хэмжих нэгж", url: "/admin/units" },
        { title: "Баннер", url: "/admin/banner" },
        { title: "Хэрэглэгчид", url: "/admin/users" },
        { title: "Төлбөрийн төрөл", url: "/admin/payment-methods" },
        { title: "Онцгой хямдрал", url: "/admin/promo" },
      ],
    },
  ],

  navSecondary: [
    {
      title: "Гарах",
      url: "#",
      icon: (
        <LogOutIcon
        />
      ),
    },
  ],
  projects: [],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      const role = raw ? JSON.parse(raw).role : null;
      setIsSuperAdmin(role === "SUPER_ADMIN");
    } catch {
      setIsSuperAdmin(false);
    }
  }, []);

  const navMain = useMemo(() => {
    if (!isSuperAdmin) return data.navMain;
    return [
      ...data.navMain,
      {
        title: "Аудит лог",
        url: "/admin/audit",
        icon: <BookOpenIcon />,
      },
    ];
  }, [isSuperAdmin]);

  return (
    <Sidebar
      className=" h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <img src="/logo.png" alt="777 Family Store" className="h-10 w-10" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">777 Family store</span>
                  <span className="truncate text-xs">Онлайн дэлгүүр</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <span className="truncate text-xs text-right">Version 0.0.1</span>
      </SidebarFooter>
    </Sidebar>
  )
}
