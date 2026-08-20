"use client";

import { useMemo } from "react";
import { ArrowRight, ArrowLeft, AlertTriangle, CheckCircle, TrendingUp, ChevronRight } from "lucide-react";
import type { GradeInfo } from "../types";
import { getColleges, getDepartments } from "../../lib/timetable/courses";

const UNIVERSITIES = [
  "서울대학교", "연세대학교", "고려대학교", "성균관대학교",
  "한양대학교", "중앙대학교", "경희대학교", "이화여자대학교",
  "KAIST", "POSTECH", "국립 순천대학교", "한국대학교(예시)", "기타",
];

interface Props {
  gradeInfo: GradeInfo;
  onGradeInfoChange: (info: GradeInfo) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepGradeSetup({ gradeInfo, onGradeInfoChange, onNext, onBack }: Props) {
  const set = (key: keyof GradeInfo, value: string) =>
    onGradeInfoChange({ ...gradeInfo, [key]: value });

  // 대학교 선택 시 하위 단계 초기화
  const handleUniversityChange = (university: string) => {
    onGradeInfoChange({ ...gradeInfo, university, college: "", department: "" });
  };

  // 단과대 선택 시 학과 초기화
  const handleCollegeChange = (college: string) => {
    onGradeInfoChange({ ...gradeInfo, college, department: "" });
  };

  // 대학교에 따른 단과대 목록
  const colleges = useMemo(
    () => getColleges(gradeInfo.university),
    [gradeInfo.university]
  );

  // 단과대에 따른 학과 목록
  const departments = useMemo(
    () => getDepartments(gradeInfo.university, gradeInfo.college || undefined),
    [gradeInfo.university, gradeInfo.college]
  );

  // 학점 역산 계산
  const calcResult = useMemo(() => {
    const cc = parseFloat(gradeInfo.completedCredits);
    const cg = parseFloat(gradeInfo.currentGpa);
    const tg = parseFloat(gradeInfo.targetGpa);
    const rs = parseFloat(gradeInfo.remainingSemesters);
    if ([cc, cg, tg, rs].some(isNaN) || cc < 0 || rs <= 0) return null;
    const avgCreditsPerSem = 18;
    const remaining = rs * avgCreditsPerSem;
    const total = cc + remaining;
    const needed = (tg * total - cg * cc) / remaining;
    return needed;
  }, [gradeInfo]);

  const isOver    = calcResult !== null && calcResult > 4.5;
  const isAlready = calcResult !== null && calcResult < 0;
  const canProceed = gradeInfo.university && gradeInfo.department;

  // 선택 진행 상태 계산
  const step1Done = !!gradeInfo.university;
  const step2Done = !!gradeInfo.college;
  const step3Done = !!gradeInfo.department;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>
        <span className="font-semibold text-slate-900 text-sm">🎓 교수님, 이번만요</span>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-xs">1</span>
          <div className="w-16 h-px bg-slate-200" />
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold">2</span>
          <div className="w-16 h-px bg-slate-200" />
          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-xs">3</span>
        </div>
      </nav>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        <div className="animate-slide-up">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">기본 정보 입력</h2>
          <p className="text-slate-500 mb-10">학교 정보와 학점 목표를 설정하면 AI가 맞춤형 플랜을 제안해 드려요.</p>

          {/* Section 1: 3단계 학교 선택 */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
            <h3 className="font-semibold text-slate-900 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">1</span>
              소속 학교 &amp; 학과
            </h3>

            {/* 3단 계층 선택 UI */}
            <div className="space-y-3">

              {/* ① 대학교 */}
              <div className="flex items-start gap-3">
                <div className={`mt-2.5 w-2 h-2 rounded-full flex-shrink-0 transition-colors ${step1Done ? "bg-indigo-500" : "bg-slate-200"}`} />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-600 mb-1.5" htmlFor="university">
                    대학교
                  </label>
                  <select
                    id="university"
                    value={gradeInfo.university}
                    onChange={(e) => handleUniversityChange(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm text-slate-900 bg-white transition-all appearance-none cursor-pointer ${
                      step1Done ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200"
                    }`}
                  >
                    <option value="">대학교 선택</option>
                    {UNIVERSITIES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* 화살표 구분선 */}
              {step1Done && (
                <div className="flex items-center gap-3 animate-fade-in">
                  <div className="w-2 flex-shrink-0" />
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-0.5" />
                </div>
              )}

              {/* ② 단과대 */}
              <div className={`flex items-start gap-3 transition-all duration-200 ${step1Done ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
                <div className={`mt-2.5 w-2 h-2 rounded-full flex-shrink-0 transition-colors ${step2Done ? "bg-indigo-500" : "bg-slate-200"}`} />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-600 mb-1.5" htmlFor="college">
                    단과대학
                  </label>
                  {colleges.length > 0 ? (
                    <select
                      id="college"
                      value={gradeInfo.college}
                      onChange={(e) => handleCollegeChange(e.target.value)}
                      disabled={!step1Done}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm text-slate-900 bg-white transition-all appearance-none cursor-pointer ${
                        step2Done ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200"
                      }`}
                    >
                      <option value="">단과대학 선택</option>
                      {colleges.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input
                      id="college"
                      type="text"
                      placeholder="단과대학 직접 입력"
                      value={gradeInfo.college}
                      disabled={!step1Done}
                      onChange={(e) => handleCollegeChange(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white transition-all"
                    />
                  )}
                </div>
              </div>

              {/* 화살표 구분선 */}
              {step2Done && (
                <div className="flex items-center gap-3 animate-fade-in">
                  <div className="w-2 flex-shrink-0" />
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-0.5" />
                </div>
              )}

              {/* ③ 학과 */}
              <div className={`flex items-start gap-3 transition-all duration-200 ${step2Done ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
                <div className={`mt-2.5 w-2 h-2 rounded-full flex-shrink-0 transition-colors ${step3Done ? "bg-indigo-500" : "bg-slate-200"}`} />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-600 mb-1.5" htmlFor="department">
                    학과 / 전공
                  </label>
                  {departments.length > 0 ? (
                    <select
                      id="department"
                      value={gradeInfo.department}
                      onChange={(e) => set("department", e.target.value)}
                      disabled={!step2Done}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm text-slate-900 bg-white transition-all appearance-none cursor-pointer ${
                        step3Done ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200"
                      }`}
                    >
                      <option value="">학과 선택</option>
                      {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  ) : (
                    <input
                      id="department"
                      type="text"
                      placeholder="학과 직접 입력"
                      value={gradeInfo.department}
                      disabled={!step2Done}
                      onChange={(e) => set("department", e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white transition-all"
                    />
                  )}
                </div>
              </div>

              {/* 선택 완료 요약 배지 */}
              {step3Done && (
                <div className="ml-5 flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 animate-fade-in">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                  <span className="font-medium">{gradeInfo.university}</span>
                  <ChevronRight className="w-3 h-3 text-indigo-300" />
                  <span>{gradeInfo.college}</span>
                  <ChevronRight className="w-3 h-3 text-indigo-300" />
                  <span className="font-semibold">{gradeInfo.department}</span>
                </div>
              )}
            </div>
          </section>

          {/* Section 2: 학점 역산기 */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
            <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">2</span>
              학점 역산기
            </h3>
            <p className="text-sm text-slate-400 mb-5 ml-8">4개 항목 입력 시 이번 학기 필요 평점이 자동 계산됩니다</p>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <InputField
                id="completedCredits"
                label="기이수 학점"
                placeholder="예: 72"
                value={gradeInfo.completedCredits}
                onChange={(v) => set("completedCredits", v)}
                type="number"
                hint="취득 완료한 총 학점"
              />
              <InputField
                id="currentGpa"
                label="현재 평점"
                placeholder="예: 3.42"
                value={gradeInfo.currentGpa}
                onChange={(v) => set("currentGpa", v)}
                type="number"
                hint="4.5 만점 기준"
              />
              <InputField
                id="targetGpa"
                label="목표 평점"
                placeholder="예: 3.75"
                value={gradeInfo.targetGpa}
                onChange={(v) => set("targetGpa", v)}
                type="number"
                hint="졸업 / 장학금 기준"
              />
              <InputField
                id="remainingSemesters"
                label="남은 학기 수"
                placeholder="예: 4"
                value={gradeInfo.remainingSemesters}
                onChange={(v) => set("remainingSemesters", v)}
                type="number"
                hint="이번 학기 포함"
              />
            </div>

            {/* 결과 배너 */}
            {calcResult !== null && (
              <div className={`rounded-xl p-4 flex items-start gap-3 animate-fade-in ${
                isOver
                  ? "bg-rose-50 border border-rose-200"
                  : isAlready
                  ? "bg-emerald-50 border border-emerald-200"
                  : calcResult >= 4.0
                  ? "bg-orange-50 border border-orange-200"
                  : "bg-indigo-50 border border-indigo-200"
              }`}>
                {isOver ? (
                  <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                ) : isAlready ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <TrendingUp className={`w-5 h-5 flex-shrink-0 mt-0.5 ${calcResult >= 4.0 ? "text-orange-500" : "text-indigo-500"}`} />
                )}
                <div>
                  {isOver ? (
                    <>
                      <p className="font-semibold text-rose-700 text-sm">목표 달성이 수학적으로 불가능합니다 ⚠️</p>
                      <p className="text-rose-600 text-sm mt-0.5">목표 평점을 낮추거나 남은 학기 수를 늘려보세요.</p>
                    </>
                  ) : isAlready ? (
                    <>
                      <p className="font-semibold text-emerald-700 text-sm">이미 목표를 달성했어요! 🎉</p>
                      <p className="text-emerald-600 text-sm mt-0.5">현재 평점이 목표를 초과합니다. 여유롭게 수강 설계해 보세요.</p>
                    </>
                  ) : (
                    <>
                      <p className={`font-semibold text-sm ${calcResult >= 4.0 ? "text-orange-700" : "text-indigo-700"}`}>
                        이번 학기부터 <span className="text-xl font-bold">{calcResult.toFixed(2)}</span> 이상을 받아야 합니다
                      </p>
                      <p className={`text-sm mt-0.5 ${calcResult >= 4.0 ? "text-orange-600" : "text-indigo-600"}`}>
                        {calcResult >= 4.0
                          ? "굉장히 높은 목표입니다. 수강 과목 선택이 중요해요."
                          : calcResult >= 3.5
                          ? "충분히 달성 가능한 목표입니다. 화이팅!"
                          : "여유 있는 목표예요. 탄탄하게 설계해 보세요!"}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 다음 버튼 */}
          <button
            id="setup-next-btn"
            onClick={onNext}
            disabled={!canProceed}
            className={`w-full py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-colors ${
              canProceed
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            시간표 플래너로 이동
            <ArrowRight className="w-4 h-4" />
          </button>
          {!canProceed && (
            <p className="text-center text-sm text-slate-400 mt-2">
              {!gradeInfo.university
                ? "대학교를 선택해 주세요"
                : !gradeInfo.college
                ? "단과대학을 선택해 주세요"
                : "학과를 선택해 주세요"}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function InputField({
  id, label, placeholder, value, onChange, type, hint,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type ?? "text"}
        step="0.01"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white transition-all"
      />
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
