"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Command({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("w-full", className)} {...props} />;
}

export function CommandDialog({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function CommandInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("w-full rounded-md border border-gray-200 px-3 py-2 text-sm", className)}
      {...props}
    />
  );
}

export function CommandList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-3 space-y-2", className)} {...props} />;
}

export function CommandEmpty({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-xs text-gray-500", className)} {...props} />;
}

export function CommandGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement> & { heading?: string }) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function CommandSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("my-2 h-px bg-gray-200", className)} {...props} />;
}

export function CommandItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100",
        className
      )}
      {...props}
    />
  );
}

export function CommandShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("ml-auto text-xs text-gray-400", className)} {...props} />;
}
