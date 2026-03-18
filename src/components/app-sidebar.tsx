
'use client';

import * as React from "react"
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/app/context/AuthContext';
import { VersionSwitcher } from "@/components/version-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Newspaper,
  List,
  ImageIcon,
  ListPlus,
  Wallet,
  Hotel,
  User,
  ClipboardPen,
  Settings,
  LogOut,
} from 'lucide-react';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { logout, user } = useAuth();
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <VersionSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <Command>
          <CommandInput placeholder='Хайлт...' />
          <CommandList>
            <CommandEmpty>Хайлт олдсонгүй.</CommandEmpty>

            <CommandGroup heading='Нүүр хуудас'>
              <CommandItem className={isActive('/admin/dashboard') ? 'bg-muted text-blue-600' : ''}>
                <LayoutDashboard className='mr-2 h-8 w-4' />
                <Link href='/admin/dashboard'>Удирдлагын хэсэг</Link>
              </CommandItem>
              <CommandItem className={isActive('/admin/product') ? 'bg-muted text-blue-600' : ''}>
                <Newspaper className='mr-2 h-8 w-4' />
                <Link href='/admin/product'>Барааны мэдээлэл</Link>
              </CommandItem>
              <CommandItem className={isActive('/admin/order') ? 'bg-muted text-blue-600' : ''}>
                <Newspaper className='mr-2 h-8 w-4' />
                <Link href='/admin/order'>Захиалгын мэдээлэл</Link>
              </CommandItem>
              <CommandItem className={isActive('/admin/banner') ? 'bg-muted text-blue-600' : ''}>
                <ImageIcon className='mr-2 h-8 w-4' />
                <Link href='/admin/banner'>Баннер</Link>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading='Бүртгэл'>
              <CommandItem className={isActive('/admin/category') ? 'bg-muted text-blue-600' : ''}>
                <ListPlus className='mr-2 h-8 w-4' />
                <Link href='/admin/category'>Категори </Link>
              </CommandItem>
              <CommandItem className={isActive('/admin/subCategory') ? 'bg-muted text-blue-600' : ''}>
                <List className='mr-2 h-8 w-4' />
                <Link href='/admin/subCategory'>Дэд категори </Link>
              </CommandItem>
              <CommandItem className={isActive('/admin/state') ? 'bg-muted text-blue-600' : ''}>
                <ClipboardPen className='mr-2 h-8 w-4' />
                <Link href='/admin/state'>Төлөв </Link>
              </CommandItem>
              <CommandItem className={isActive('/admin/type') ? 'bg-muted text-blue-600' : ''}>
                <ClipboardPen className='mr-2 h-8 w-4' />
                <Link href='/admin/type'>Төрөл </Link>
              </CommandItem>
              <CommandItem className={isActive('/admin/brand') ? 'bg-muted text-blue-600' : ''}>
                <ClipboardPen className='mr-2 h-8 w-4' />
                <Link href='/admin/brand'>Брэнд </Link>
              </CommandItem>
              <CommandItem className={isActive('/admin/units') ? 'bg-muted text-blue-600' : ''}>
                <ClipboardPen className='mr-2 h-8 w-4' />
                <Link href='/admin/units'>Хэмжих нэгж</Link>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading='Тохиргоо'>
              <CommandItem className={isActive('/admin/settings') ? 'bg-muted text-blue-600' : ''}>
                <Settings className='mr-2 h-8 w-4' />
                <Link href='/admin/settings'>Нууц үг солих</Link>
              </CommandItem>

              <CommandItem onSelect={logout}>
                <LogOut className='mr-2 h-8 w-4' />
                <span>Гарах</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </SidebarContent>

      <SidebarRail />

      <SidebarFooter>
        <div className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground border-t">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>{user?.username || 'Хэрэглэгч'}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
