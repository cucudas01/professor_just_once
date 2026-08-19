"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Save, RotateCcw } from "lucide-react";
import StepLanding from "./components/StepLanding";
import StepGradeSetup from "./components/StepGradeSetup";
import Timetable from "./components/Timetable";
import ChatSidebar from "./components/ChatSidebar";
import type { Course, GradeInfo, PlanId, Plans, StepType } from "./types";
import { SAMPLE_COURSES } from "./types";

const DEFAULT_GRADE_INFO: GradeInfo = {
  university: "",
  department: "",
  completedCredits: "",
  currentGpa: "",
  targetGpa: "",
  remainingSemesters: "",
};

const DEFAULT_PLANS: Plans = {
  A: [...SAMPLE_COURSES],
  B: [],
  C: [],
};

const STORAGE_KEY = "professor-timetable-v1";

function loadFromStorage(): { plans: Plans; gradeInfo: GradeInfo } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToStorage(plans: Plans, gradeInfo: GradeInfo) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ plans, gradeInfo }));
  } catch {
    // ignore
  }
}

export default function Home() {
  const [step, setStep] = useState<StepType>("landing");
  const [gradeInfo, setGradeInfo] = useState<GradeInfo>(DEFAULT_GRADE_INFO);
  const [plans, setPlans] = useState<Plans>(DEFAULT_PLANS);
  const [activePlan, setActivePlan] = useState<PlanId>("A");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // 로컬 스토리지에서 복원
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setPlans(saved.plans);
      setGradeInfo(saved.gradeInfo);
    }
  }, []);

  const currentCourses: Course[] = plans[activePlan];

  const handleCoursesChange = useCallback(
    (courses: Course[]) => {
      setPlans((prev) => ({ ...prev, [activePlan]: courses }));
    },
    [activePlan]
  );

  const handleSave = () => {
    saveToStorage(plans, gradeInfo);
    const now = new Date();
    setSavedAt(
      `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} 저장됨`
    );
    setTimeout(() => setSavedAt(null), 3000);
  };

  const handleReset = () => {
    if (confirm(`플랜 ${activePlan}을 초기화하시겠습니까?`)) {
      setPlans((prev) => ({
        ...prev,
        [activePlan]: activePlan === "A" ? [...SAMPLE_COURSES] : [],
      }));
    }
  };

  // ── Step: Landing ──────────────────────────────────────────────────────────
  if (step === "landing") {
    return <StepLanding onNext={() => setStep("setup")} />;
  }

  // ── Step: Setup ─────────────────────────────────────────────────────────────
  if (step === "setup") {
    return (
      <StepGradeSetup
        gradeInfo={gradeInfo}
        onGradeInfoChange={setGradeInfo}
        onNext={() => setStep("planner")}
        onBack={() => setStep("landing")}
      />
    );
  }

  // ── Step: Planner ───────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* 상단 탭/툴바 */}
      <header className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-200 flex-shrink-0">
        {/* 뒤로가기 */}
        <button
          onClick={() => setStep("setup")}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-sm px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors mr-2"
        >
          <ArrowLeft className="w-4 h-4" />
          설정
        </button>

        {/* 구분선 */}
        <div className="w-px h-5 bg-slate-200" />

        {/* 플랜 탭 */}
        <div className="flex gap-1">
          {(["A", "B", "C"] as PlanId[]).map((plan) => (
            <button
              key={plan}
              id={`plan-tab-${plan}`}
              onClick={() => setActivePlan(plan)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activePlan === plan
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              플랜 {plan}
              <span className="ml-1.5 text-xs opacity-70">
                {plans[plan].filter((c) => !c.failed).length > 0
                  ? `${plans[plan].filter((c) => !c.failed).length}과`
                  : ""}
              </span>
            </button>
          ))}
        </div>

        {/* 서비스명 */}
        <span className="mx-auto text-sm font-semibold text-slate-700">
          🎓 교수님, 이번만요
          {gradeInfo.university && (
            <span className="ml-2 text-slate-400 font-normal text-xs">
              {gradeInfo.university} · {gradeInfo.department}
            </span>
          )}
        </span>

        {/* 저장 버튼 */}
        {savedAt ? (
          <span className="text-xs text-emerald-600 font-medium px-2">{savedAt}</span>
        ) : (
          <button
            id="save-btn"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            저장
          </button>
        )}

        {/* 초기화 버튼 */}
        <button
          id="reset-btn"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          초기화
        </button>
      </header>

      {/* 메인 작업 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 시간표 (70%) */}
        <div className="flex-[7] overflow-hidden border-r border-slate-200">
          <Timetable
            courses={currentCourses}
            onCoursesChange={handleCoursesChange}
          />
        </div>

        {/* AI 채팅 사이드바 (30%) */}
        <div className="flex-[3] overflow-hidden min-w-[280px] max-w-[360px]">
          <ChatSidebar
            courses={currentCourses}
            gradeInfo={gradeInfo}
            onCoursesChange={handleCoursesChange}
          />
        </div>
      </div>
    </div>
  );
}
