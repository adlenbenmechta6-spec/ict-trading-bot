import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "بدل توقعات الذكي - بوت إشارات التداول",
  description: "بوت تحليل فني ذكي يستخدم أنماط الشموع اليابانية والمؤشرات التقنية لتقديم إشارات تداول احترافية",
  keywords: ["تداول", "شموع يابانية", "إشارات", "تحليل فني", "فوركس"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0e1621] text-white overflow-hidden`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
