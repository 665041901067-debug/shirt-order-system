import type { Metadata, Viewport } from "next";
import { Inter, Prompt } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบสั่งซื้อเสื้อกีฬา | สาขาวิศวกรรมคอมพิวเตอร์และระบบ IoT",
  description: "ระบบสั่งซื้อเสื้อกีฬาสาขาวิศวกรรมคอมพิวเตอร์และระบบ IoT (CPE & IoT Sportswear Ordering System)",
  keywords: ["CPE", "IoT", "Sportswear", "เสื้อกีฬาสาขา", "วิศวกรรมคอมพิวเตอร์"],
  authors: [{ name: "CPE & IoT Department" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2563EB",
};

import { ToastProvider } from "@/components/ui/toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${inter.variable} ${prompt.variable}`}>
      <body className="bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-blue-100 selection:text-blue-700">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
