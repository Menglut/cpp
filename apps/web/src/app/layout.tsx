import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CppStudy — 이해하고, 풀고, 성장하다",
  description: "한 걸음씩 배우고 실제 코드를 실행하는 C++17 학습 공간.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
