"use client";

import { ArrowRight, Calculator, LayoutGrid, MessageSquare } from "lucide-react";

interface Props {
  onNext: () => void;
}

export default function StepLanding({ onNext }: Props) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-8 py-4 flex items-center gap-2">
        <span className="text-xl">🎓</span>
        <span className="font-semibold text-slate-900">교수님, 이번만요</span>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24">
        <div className="max-w-2xl w-full text-center animate-slide-up">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-sm font-medium mb-10">
            AI 학점 역산 &amp; 시간표 플래너
          </span>

          {/* Title */}
          <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-tight mb-6 tracking-tight">
            교수님,{" "}
            <span className="text-indigo-600">이번만요</span> 🎓
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-slate-500 mb-14 leading-relaxed">
            수강신청이 튕겨도 괜찮아요.
            <br />
            목표 학점을 지키는 최적의 시간표를 AI가 함께 짜드립니다.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14 text-left">
            <FeatureCard
              icon={<Calculator className="w-4 h-4" />}
              title="학점 역산기"
              desc="남은 학기에 필요한 최소 평점을 즉시 계산합니다"
            />
            <FeatureCard
              icon={<LayoutGrid className="w-4 h-4" />}
              title="시간표 플래너"
              desc="튕긴 과목을 표시하고 3개 플랜을 비교·관리합니다"
            />
            <FeatureCard
              icon={<MessageSquare className="w-4 h-4" />}
              title="AI 어시스턴트"
              desc="금공강, 팀플 제외 등 조건을 말로 설명하면 됩니다"
            />
          </div>

          {/* CTA */}
          <button
            id="landing-cta"
            onClick={onNext}
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-lg transition-colors"
          >
            시간표 짜러 가기
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="mt-5 text-sm text-slate-400">
            무료 · 로그인 불필요 · 브라우저에 자동 저장
          </p>
        </div>
      </main>

      <footer className="border-t border-slate-100 px-8 py-4 text-center text-sm text-slate-400">
        © 2026 교수님이번만요 · Powered by Gemini 2.5 Flash
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white hover:border-slate-300 transition-colors">
      <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-indigo-600 mb-3 shadow-sm">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 mb-1 text-sm">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
