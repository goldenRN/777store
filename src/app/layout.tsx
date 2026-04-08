import type { Metadata } from "next";
import { Sora, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { CartProvider } from "@/components/cart/CartProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "777 Family Store",
  description: "777 Family Store онлайн дэлгүүр",
  icons: {
    icon: [
      // `sizes` must match the actual file size; use `any` so browsers don't ignore it.
      { url: "/logo-777.png", sizes: "any", type: "image/png" },
    ],
    shortcut: "/logo-777.png",
    apple: "/logo-777.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" className={cn("font-sans", geist.variable)}>
      <body className={`${sora.variable} antialiased`}>
        <TooltipProvider>
          <CartProvider>
            {children}
            <Toaster />
          </CartProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
