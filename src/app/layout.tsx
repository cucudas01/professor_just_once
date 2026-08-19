import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "교수님, 이번만요 🎓 | AI 학점 역산 & 시간표 플래너",
  description: "수강신청이 튕겨도 목표 평점을 지키는 AI 학점 역산 & 인터랙티브 시간표 플래너.",
  keywords: ["학점 역산", "수강신청", "시간표", "AI", "대학생", "GPA"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
