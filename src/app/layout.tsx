import type { Metadata } from "next";
import { DM_Sans, Inter, Martian_Mono } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const martianMono = Martian_Mono({
  variable: "--font-martian-mono",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Solext",
  description: "Inventory management for Solex & Lunex Operations",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable} ${martianMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans"><AntdRegistry>{children}</AntdRegistry></body>
    </html>
  );
}
