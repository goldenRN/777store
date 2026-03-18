"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SidebarContextValue = {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  const toggle = React.useCallback(() => setOpen((prev) => !prev), []);

  return (
    <SidebarContext.Provider value={{ open, toggle, setOpen }}>
      <div className="flex min-h-screen w-full">{children}</div>
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

export function SidebarTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggle } = useSidebar();
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
        className
      )}
      onClick={toggle}
      {...props}
    >
      ☰
    </button>
  );
}

export function SidebarInset({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSidebar();
  return (
    <div
      className={cn(
        "flex min-h-screen flex-1 flex-col transition-[margin] duration-200",
        open ? "ml-64" : "ml-0",
        className
      )}
      {...props}
    />
  );
}

export function Sidebar({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const { open } = useSidebar();
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white text-gray-900 transition-transform duration-200",
        open ? "translate-x-0" : "-translate-x-full",
        className
      )}
      {...props}
    />
  );
}

export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 border-b", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 overflow-y-auto p-2", className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-2", className)} {...props} />;
}

export function SidebarRail({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("sr-only", className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />;
}

type SidebarMenuButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "md" | "lg";
};

export function SidebarMenuButton({ className, size = "md", ...props }: SidebarMenuButtonProps) {
  const sizes: Record<string, string> = {
    sm: "h-8 px-2 text-sm",
    md: "h-10 px-3 text-sm",
    lg: "h-12 px-3 text-base",
  };

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-md bg-white text-gray-900 hover:bg-gray-100",
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
