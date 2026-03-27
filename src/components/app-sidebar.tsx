"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
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
      title: "Лайв худалдаа",
      url: "/admin/live",
      icon: <VideoIcon />,
      items: [
        { title: "Live бүртгэл", url: "/admin/live" },
        { title: "Live бараа", url: "/admin/products?type=live" },
      ],
    },
  ],

  navSecondary: [
    {
      title: "Нууц үг солих",
      url: "/admin/settings",
      icon: (
        <LockIcon
        />
      ),
    },
    {
      title: "Гарах",
      url: "#",
      icon: (
        <LogOutIcon
        />
      ),
    },
  ],
  projects: [
    {
      name: "Ангилал",
      url: "/admin/category",
      icon: (
        <ListPlusIcon
        />
      ),
    },
    {
      name: "Дэд ангилал",
      url: "/admin/subCategory",
      icon: (
        <ListPlusIcon
        />
      ),
    },
    {
      name: "Төлөв",
      url: "/admin/state",
      icon: (
        <ListPlusIcon
        />
      ),
    },
    {
      name: "Төрөл",
      url: "/admin/type",
      icon: (
        <ListPlusIcon
        />
      ),
    },
    {
      name: "Брэнд",
      url: "/admin/brand",
      icon: (
        <ListPlusIcon
        />
      ),
    },
    {
      name: "Хэмжих нэгж",
      url: "/admin/units",
      icon: (
        <ListPlusIcon
        />
      ),
    },
    {
      name: "Баннер",
      url: "/admin/banner",
      icon: (
        <ListPlusIcon
        />
      ),
    },
    {
      name: "Хэрэглэгчид",
      url: "/admin/users",
      icon: (
        <ListPlusIcon
        />
      ),
    },
    {
      name: "Онцгой хямдрал",
      url: "/admin/promo",
      icon: (
        <ListPlusIcon
        />
      ),
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      className=" h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
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
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <span className="truncate text-xs text-right">Version 0.0.1</span>
      </SidebarFooter>
    </Sidebar>
  )
}
