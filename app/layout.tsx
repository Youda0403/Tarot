import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "✨ 타로 리딩",
  description: "AI와 함께하는 신비로운 타로 카드 리딩",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
