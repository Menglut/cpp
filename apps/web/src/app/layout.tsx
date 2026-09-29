import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CppStudy — 이해하고, 풀고, 성장하다",
  description: "한 걸음씩 배우는 C++ 학습 공간. 프론트엔드 프로토타입.",
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
