import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "교수님, 이번만요 🎓 | AI 학점 역산 & 수강신청 플랜 B",
  description: "수강신청 튕겨도 목표 평점은 지켜주는 AI 학점 역산 & 실시간 플랜 B 솔루션. 대학생을 위한 긴급 수강신청 구조 서비스.",
  keywords: ["학점 역산", "수강신청", "플랜 B", "AI", "대학생", "GPA 계산"],
  openGraph: {
    title: "교수님, 이번만요 🎓",
    description: "수강신청 튕겨도 목표 평점은 지켜주는 AI 학점 역산 & 실시간 플랜 B",
    type: "website",
  },
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
