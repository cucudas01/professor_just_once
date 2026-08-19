"use client";

import { useState, useCallback } from "react";
import {
  GraduationCap,
  Calculator,
  BellRing,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ClipboardCopy,
  ClipboardCheck,
  ChevronRight,
  BookOpen,
  Coffee,
  Zap,
  Star,
  TrendingUp,
} from "lucide-react";

interface CalculatorState {
  completedCredits: string;
  currentGpa: string;
  targetGpa: string;
  remainingSemesters: string;
}

interface RescueFormState {
  failedSubject: string;
  subjectType: "전공" | "교양";
  preferredDayOff: string;
  remainingCredits: string;
}

interface ResultState {
  text: string | null;
  isLoading: boolean;
  error: string | null;
}

function MarkdownRenderer({ content }: { content: string }) {
  const processInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
        return <em key={i} className="text-violet-300 italic">{part.slice(1, -1)}</em>;
      if (part.startsWith("`") && part.endsWith("`"))
        return <code key={i} className="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded text-sm font-mono">{part.slice(1, -1)}</code>;
      return part;
    });
  };

  const processLine = (line: string, idx: number): React.ReactElement | null => {
    if (line.startsWith("### "))
      return <h3 key={idx} className="text-lg font-semibold text-violet-300 mt-4 mb-2">{line.slice(4)}</h3>;
    if (line.startsWith("## "))
      return <h2 key={idx} className="text-xl font-bold text-indigo-300 mt-5 mb-2 pb-1 border-b border-indigo-500/30">{line.slice(3)}</h2>;
    if (line.startsWith("# "))
      return <h1 key={idx} className="text-2xl font-bold text-indigo-400 mt-2 mb-3 pb-2 border-b border-indigo-500/40">{line.slice(2)}</h1>;
    if (line.startsWith("---"))
      return <hr key={idx} className="border-indigo-500/20 my-3" />;
    if (line.startsWith("> "))
      return (
        <blockquote key={idx} className="border-l-4 border-indigo-500 pl-4 py-2 my-2 bg-indigo-500/10 rounded-r-lg text-indigo-300 italic">
          {processInline(line.slice(2))}
        </blockquote>
      );
    if (line.startsWith("- ") || line.startsWith("* "))
      return (
        <li key={idx} className="flex items-start gap-2 text-slate-300 mb-1 ml-4">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
          <span>{processInline(line.slice(2))}</span>
        </li>
      );
    const orderedMatch = line.match(/^(\d+)\.\s(.+)/);
    if (orderedMatch)
      return (
        <li key={idx} className="flex items-start gap-2 text-slate-300 mb-1 ml-4 list-none">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600/40 text-indigo-300 text-xs flex items-center justify-center font-bold mt-0.5">
            {orderedMatch[1]}
          </span>
          <span>{processInline(orderedMatch[2])}</span>
        </li>
      );
    if (line.trim() === "") return <div key={idx} className="h-2" />;
    return <p key={idx} className="text-slate-300 leading-relaxed mb-1">{processInline(line)}</p>;
  };

  return (
    <div className="space-y-0.5">
      {content.split("\n").map((line, idx) => processLine(line, idx))}
    </div>
  );
}

function GpaBadge({ required }: { required: number }) {
  if (required > 4.5) {
    return (
      <div className="animate-badge-pop flex flex-col items-center gap-3 p-6 rounded-2xl bg-rose-500/10 border border-rose-500/40 glow-rose">
        <AlertTriangle className="w-10 h-10 text-rose-400" />
        <div className="text-center">
          <p className="text-rose-400 font-bold text-lg">목표 달성 불가능 ⚠️</p>
          <p className="text-rose-300/70 text-sm mt-1">현실적으로 4.5 만점을 초과합니다.</p>
        </div>
        <div className="w-full p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <p className="text-rose-300 text-sm text-center">
            💡 목표 평점을 낮추거나 남은 학기 수를 늘려보세요
          </p>
        </div>
      </div>
    );
  }
  if (required < 0) {
    return (
      <div className="animate-badge-pop flex flex-col items-center gap-3 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/40">
        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        <div className="text-center">
          <p className="text-emerald-400 font-bold text-lg">이미 달성 완료! 🎉</p>
          <p className="text-emerald-300/70 text-sm mt-1">현재 평점이 목표를 이미 넘었어요</p>
        </div>
      </div>
    );
  }

  const color =
    required >= 4.0
      ? { ring: "border-rose-500/40 bg-rose-500/10 glow-rose", text: "text-rose-400", label: "😤 빡세다" }
      : required >= 3.5
      ? { ring: "border-amber-500/40 bg-amber-500/10", text: "text-amber-400", label: "💪 집중해야 해" }
      : { ring: "border-emerald-500/40 bg-emerald-500/10", text: "text-emerald-400", label: "😊 충분히 가능해!" };

  return (
    <div className={`animate-badge-pop flex flex-col items-center gap-3 p-6 rounded-2xl border ${color.ring}`}>
      <TrendingUp className={`w-8 h-8 ${color.text}`} />
      <div className="text-center">
        <p className="text-slate-400 text-sm">앞으로 매 학기 평균</p>
        <p className={`${color.text} font-black text-5xl my-2`}>{required.toFixed(2)}</p>
        <p className="text-slate-400 text-sm">이상을 받아야 합니다</p>
      </div>
      <span className={`px-4 py-1.5 rounded-full border ${color.ring} ${color.text} text-sm font-semibold`}>
        {color.label}
      </span>
    </div>
  );
}

export default function Home() {
  const [calc, setCalc] = useState<CalculatorState>({
    completedCredits: "",
    currentGpa: "",
    targetGpa: "",
    remainingSemesters: "",
  });
  const [calcResult, setCalcResult] = useState<number | null>(null);

  const [form, setForm] = useState<RescueFormState>({
    failedSubject: "",
    subjectType: "전공",
    preferredDayOff: "없음",
    remainingCredits: "",
  });

  const [result, setResult] = useState<ResultState>({ text: null, isLoading: false, error: null });
  const [copied, setCopied] = useState(false);

  const handleCalcChange = useCallback(
    (key: keyof CalculatorState, value: string) => {
      const updated = { ...calc, [key]: value };
      setCalc(updated);
      const cc = parseFloat(updated.completedCredits);
      const cg = parseFloat(updated.currentGpa);
      const tg = parseFloat(updated.targetGpa);
      const rs = parseFloat(updated.remainingSemesters);
      if ([cc, cg, tg, rs].some(isNaN) || cc < 0 || rs <= 0) {
        setCalcResult(null);
        return;
      }
      const avgCreditsPerSemester = 18;
      const remainingCreditsTotal = rs * avgCreditsPerSemester;
      const totalCreditsExpected = cc + remainingCreditsTotal;
      const needed = (tg * totalCreditsExpected - cg * cc) / remainingCreditsTotal;
      setCalcResult(needed);
    },
    [calc]
  );

  const handleRescueSubmit = async () => {
    if (!form.failedSubject.trim()) return;
    setResult({ text: null, isLoading: true, error: null });
    try {
      const res = await fetch("/api/rescue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentGpa: calc.currentGpa || "알 수 없음",
          targetGpa: calc.targetGpa || "알 수 없음",
          failedSubject: form.failedSubject,
          remainingCredits: form.remainingCredits || "약 18",
          preferredDayOff: form.preferredDayOff,
          subjectType: form.subjectType,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ text: null, isLoading: false, error: data.error || "서버 오류가 발생했습니다." });
        return;
      }
      setResult({ text: data.result, isLoading: false, error: null });
    } catch {
      setResult({ text: null, isLoading: false, error: "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요." });
    }
  };

  const handleCopy = async () => {
    if (!result.text) return;
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => setResult({ text: null, isLoading: false, error: null });
  const particles = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div className="min-h-screen bg-[#0a0f1e] relative overflow-x-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #4f46e5, transparent)", top: "10%", left: "15%" }} />
        <div className="absolute w-80 h-80 rounded-full opacity-8 blur-3xl"
          style={{ background: "radial-gradient(circle, #7c3aed, transparent)", top: "50%", right: "10%" }} />
        <div className="absolute w-64 h-64 rounded-full opacity-8 blur-3xl"
          style={{ background: "radial-gradient(circle, #db2777, transparent)", bottom: "20%", left: "40%" }} />
        {particles.map((i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full bg-indigo-400 opacity-30"
            style={{ left: `${10 + i * 12}%`, animation: `float-up ${6 + i * 1.2}s ${i * 0.8}s infinite ease-in-out` }} />
        ))}
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 pb-20">
        {/* ── Header ── */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Zap className="w-3 h-3" />AI 긴급 처방
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
              <Star className="w-3 h-3" />Gemini 2.5 Flash
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <Coffee className="w-3 h-3" />수강신청 생존킷
            </span>
          </div>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black gradient-text tracking-tight">
              교수님, 이번만요
            </h1>
          </div>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            수강신청 튕겨도 목표 평점은 지켜주는
            <br />
            <span className="text-indigo-300 font-semibold">AI 학점 역산 &amp; 실시간 플랜 B</span>
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-500 text-sm">
            <span>😮‍💨 수강신청 실패는 끝이 아니다. 전략의 시작이다.</span>
          </div>
        </header>

        {/* ── Step 1: Calculator ── */}
        <section className="mb-6" id="calculator-section">
          <div className="glass-card p-6 sm:p-8 glow-indigo">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Step 1</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                </div>
                <h2 className="text-xl font-bold text-white">학점 목표 역산기</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5" htmlFor="completedCredits">기이수 학점</label>
                <input id="completedCredits" type="number" min="0" placeholder="예: 72"
                  value={calc.completedCredits} onChange={(e) => handleCalcChange("completedCredits", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5" htmlFor="currentGpa">
                  현재 평점 <span className="text-slate-600 text-xs">(4.5 만점)</span>
                </label>
                <input id="currentGpa" type="number" min="0" max="4.5" step="0.01" placeholder="예: 3.42"
                  value={calc.currentGpa} onChange={(e) => handleCalcChange("currentGpa", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5" htmlFor="targetGpa">
                  목표 졸업/장학 평점 <span className="text-slate-600 text-xs">(4.5 만점)</span>
                </label>
                <input id="targetGpa" type="number" min="0" max="4.5" step="0.01" placeholder="예: 3.75"
                  value={calc.targetGpa} onChange={(e) => handleCalcChange("targetGpa", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5" htmlFor="remainingSemesters">남은 학기 수</label>
                <input id="remainingSemesters" type="number" min="1" placeholder="예: 4"
                  value={calc.remainingSemesters} onChange={(e) => handleCalcChange("remainingSemesters", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all" />
              </div>
            </div>
            {calcResult !== null ? (
              <GpaBadge required={calcResult} />
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                <BookOpen className="w-5 h-5 text-slate-600 flex-shrink-0" />
                <p className="text-slate-600 text-sm">위 4개 항목을 모두 입력하면 매 학기 목표 평점이 자동 계산됩니다</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Step 2: Emergency Form ── */}
        <section className="mb-6" id="rescue-section">
          <div className="glass-card p-6 sm:p-8 glow-rose">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                <BellRing className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Step 2</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                </div>
                <h2 className="text-xl font-bold text-white">수강신청 비상벨 🚨</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-1.5" htmlFor="failedSubject">
                  방금 튕긴 과목명 <span className="text-rose-400">*</span>
                </label>
                <input id="failedSubject" type="text" placeholder="예: 데이터베이스설계 / 공학수학2"
                  value={form.failedSubject} onChange={(e) => setForm((f) => ({ ...f, failedSubject: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-white placeholder-slate-600 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">과목 유형</label>
                <div className="flex gap-2">
                  {(["전공", "교양"] as const).map((type) => (
                    <button key={type} id={`subjectType-${type}`}
                      onClick={() => setForm((f) => ({ ...f, subjectType: type }))}
                      className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                        form.subjectType === type
                          ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                          : "bg-slate-800/60 border-slate-700/60 text-slate-500 hover:border-slate-600"
                      }`}>
                      {type === "전공" ? "📚 전공" : "🎨 교양"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5" htmlFor="remainingCredits">이번 학기 추가로 필요한 학점</label>
                <input id="remainingCredits" type="number" min="1" max="24" placeholder="예: 15"
                  value={form.remainingCredits} onChange={(e) => setForm((f) => ({ ...f, remainingCredits: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-white placeholder-slate-600 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-all" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-1.5">사수해야 하는 공강 요일</label>
                <div className="flex gap-2 flex-wrap">
                  {["월", "화", "수", "목", "금", "없음"].map((day) => (
                    <button key={day} id={`dayOff-${day}`}
                      onClick={() => setForm((f) => ({ ...f, preferredDayOff: day }))}
                      className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        form.preferredDayOff === day
                          ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                          : "bg-slate-800/60 border-slate-700/60 text-slate-500 hover:border-slate-600"
                      }`}>
                      {day === "없음" ? "🤷 없음" : `${day}요일`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button id="rescue-submit-btn" onClick={handleRescueSubmit}
              disabled={result.isLoading || !form.failedSubject.trim()}
              className={`w-full py-4 rounded-2xl font-bold text-lg text-white transition-all flex items-center justify-center gap-3 ${
                result.isLoading || !form.failedSubject.trim()
                  ? "bg-slate-700 cursor-not-allowed text-slate-500"
                  : "shimmer-btn cursor-pointer"
              }`}>
              {result.isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" />AI가 플랜 B를 생성 중...</>
              ) : (
                <><Sparkles className="w-5 h-5" />AI 실시간 플랜 B 긴급 생성</>
              )}
            </button>
          </div>
        </section>

        {/* ── Step 3: Result ── */}
        {(result.text || result.error) && (
          <section className="animate-slide-in-up" id="result-section">
            <div className="glass-card p-6 sm:p-8 glow-violet">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Step 3</span>
                      <ChevronRight className="w-3 h-3 text-slate-600" />
                    </div>
                    <h2 className="text-xl font-bold text-white">AI 처방전 📋</h2>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button id="result-reset-btn" onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600 transition-all text-sm font-medium">
                    <RefreshCw className="w-4 h-4" />다시
                  </button>
                  {result.text && (
                    <button id="result-copy-btn" onClick={handleCopy}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                        copied ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                          : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600"
                      }`}>
                      {copied ? <><ClipboardCheck className="w-4 h-4" />복사됨!</> : <><ClipboardCopy className="w-4 h-4" />복사</>}
                    </button>
                  )}
                </div>
              </div>
              {result.error && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-rose-400 font-semibold text-sm">오류 발생</p>
                    <p className="text-rose-300/70 text-sm mt-1">{result.error}</p>
                  </div>
                </div>
              )}
              {result.text && (
                <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/40">
                  <MarkdownRenderer content={result.text} />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Loading skeleton */}
        {result.isLoading && (
          <section className="animate-slide-in-up" id="loading-section">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                </div>
                <div>
                  <p className="text-xs text-violet-400 font-bold uppercase tracking-widest">생성 중...</p>
                  <p className="text-white font-bold">AI가 처방전을 작성하고 있어요 ✍️</p>
                </div>
              </div>
              <div className="space-y-3">
                {[100, 75, 90, 60].map((w, i) => (
                  <div key={i} className="h-4 rounded-lg bg-slate-700/60 animate-pulse"
                    style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </section>
        )}

        <footer className="text-center mt-12 text-slate-700 text-sm">
          <p>made with ☕ &amp; 수강신청의 트라우마</p>
          <p className="mt-1">© 2026 교수님이번만요 · Powered by Gemini 2.5 Flash</p>
        </footer>
      </div>
    </div>
  );
}
