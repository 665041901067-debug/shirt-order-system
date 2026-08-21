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
  icons: {
    icon: "/images/logo.png",
    shortcut: "/images/logo.png",
    apple: "/images/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2563EB",
};

import { Suspense } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { NavigationProgressBar } from "@/components/shared/navigation-progress";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${inter.variable} ${prompt.variable}`}>
      <body className="bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-blue-100 selection:text-blue-700">
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
