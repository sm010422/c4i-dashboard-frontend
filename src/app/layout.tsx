import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "C4I 지휘통제 대시보드",
  description: "실시간 전술 객체 추적 및 AI 위협분석 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
