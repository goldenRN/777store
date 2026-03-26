import type { Metadata } from "next";
import { Sora, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { CartProvider } from "@/components/cart/CartProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

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
          <CartProvider>{children}</CartProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}