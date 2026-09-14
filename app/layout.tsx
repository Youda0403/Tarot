import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CATCHU! — 나의 최애 인형뽑기",
  description: "사진 한두 장으로 만드는 작은 인형뽑기 GIF. 내 최애를 오늘의 경품으로!",
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
