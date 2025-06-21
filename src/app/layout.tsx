import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WriteSense - Quản lý tài liệu bằng giọng nói",
  description: "Ứng dụng quản lý tài liệu thông minh với khả năng nhận diện giọng nói và AI assistant. Tạo, chỉnh sửa, tìm kiếm tài liệu chỉ bằng giọng nói.",
  keywords: ["quản lý tài liệu", "giọng nói", "AI", "voice recognition", "document management"],
  authors: [{ name: "WriteSense Team" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
