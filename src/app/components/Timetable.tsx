"use client";

import { useState } from "react";
import { X, AlertCircle, Wifi } from "lucide-react";
import type { Course, DayType } from "../types";
import { COURSE_COLORS } from "../types";
import { calculateTotalCredits } from "../../lib/timetable/credits";

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
const DAYS: DayType[] = ["월", "화", "수", "목", "금"];
const HOUR_HEIGHT = 72; // px per hour slot
const HEADER_HEIGHT = 40;

interface CourseMenuState {
  courseId: string;
  x: number;
  y: number;
}

interface Props {
  courses: Course[];
  onCoursesChange: (courses: Course[]) => void;
}

export default function Timetable({ courses, onCoursesChange }: Props) {
  const [menu, setMenu] = useState<CourseMenuState | null>(null);

  const handleCourseClick = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    setMenu({ courseId: course.id, x: e.clientX, y: e.clientY });
  };

  const handleDelete = (id: string) => {
    onCoursesChange(courses.filter((c) => c.id !== id));
    setMenu(null);
  };

  const handleToggleFailed = (id: string) => {
    onCoursesChange(
      courses.map((c) => (c.id === id ? { ...c, failed: !c.failed } : c))
    );
    setMenu(null);
  };

  const selectedCourse = menu ? courses.find((c) => c.id === menu.courseId) : null;

  // 비대면/온라인 과목과 대면 과목 분리
  const onlineCourses = courses.filter((c) => c.isOnline === true);
  const offlineCourses = courses.filter((c) => c.isOnline !== true);

  // 총 학점 계산 (중복 과목은 한 번만 카운트)
  const totalCredits = calculateTotalCredits(courses);
  const failedCount = courses.filter((c) => c.failed).length;

  return (
    <div className="flex flex-col h-full" onClick={() => setMenu(null)}>
      {/* 학점 요약 바 */}
      <div className="flex items-center gap-4 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-sm flex-shrink-0">
        <span className="text-slate-500">
          이번 학기 수강 학점:{" "}
          <span className="font-semibold text-slate-900">{totalCredits}학점</span>
        </span>
        {failedCount > 0 && (
          <span className="flex items-center gap-1 text-rose-500">
            <AlertCircle className="w-3.5 h-3.5" />
            튕긴 과목 {failedCount}개
          </span>
        )}
        <span className="ml-auto text-slate-400 text-xs">과목 클릭 → 삭제/튕김 처리</span>
      </div>

      {/* 시간표 그리드 */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[600px]">
          {/* 헤더 */}
          <div
            className="grid border-b border-slate-200 bg-white sticky top-0 z-10"
            style={{ gridTemplateColumns: "56px repeat(5, 1fr)", height: HEADER_HEIGHT }}
          >
            <div className="border-r border-slate-100" />
            {DAYS.map((day) => (
              <div
                key={day}
                className="flex items-center justify-center border-r border-slate-100 last:border-r-0 text-sm font-semibold text-slate-600"
              >
                {day}
              </div>
            ))}
          </div>

          {/* 바디: 시간 눈금 + 일별 열 */}
          <div
            className="grid"
            style={{ gridTemplateColumns: "56px repeat(5, 1fr)" }}
          >
            {/* 시간 열 */}
            <div className="border-r border-slate-100">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-slate-100 flex items-start justify-center pt-1"
                  style={{ height: HOUR_HEIGHT }}
                >
                  <span className="text-xs text-slate-400 tabular-nums">{hour}:00</span>
                </div>
              ))}
            </div>

            {/* 일별 열 */}
            {DAYS.map((day) => {
              const dayCourses = offlineCourses.filter((c) => c.day === day);
              return (
                <div
                  key={day}
                  className="relative border-r border-slate-100 last:border-r-0"
                  style={{ height: HOURS.length * HOUR_HEIGHT }}
                >
                  {/* 시간 구분선 */}
                  {HOURS.map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-full border-b border-slate-100"
                      style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    />
                  ))}

                  {/* 점심 시간 표시 (12:00 ~ 13:00) */}
                  <div
                    className="absolute w-full bg-slate-50/70"
                    style={{ top: (12 - 9) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  />

                  {/* 과목 블록 */}
                  {dayCourses.map((course) => {
                    const colors = COURSE_COLORS[course.colorIndex % COURSE_COLORS.length];
                    const top = (course.startHour - 9) * HOUR_HEIGHT;
                    const height = course.duration * HOUR_HEIGHT;

                    return (
                      <div
                        key={course.id}
                        className={`course-block absolute left-0.5 right-0.5 rounded-lg border px-2 py-1.5 overflow-hidden ${
                          course.failed
                            ? "bg-rose-50 border-rose-200 opacity-60"
                            : `${colors.bg} ${colors.border}`
                        }`}
                        style={{ top: top + 2, height: height - 4 }}
                        onClick={(e) => handleCourseClick(e, course)}
                      >
                        {course.failed && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div
                              className="absolute inset-0 opacity-20"
                              style={{
                                backgroundImage:
                                  "repeating-linear-gradient(-45deg, #f43f5e 0, #f43f5e 1px, transparent 0, transparent 50%)",
                                backgroundSize: "8px 8px",
                              }}
                            />
                          </div>
                        )}
                        <div className="relative">
                          <p className={`text-xs font-semibold leading-tight truncate ${course.failed ? "text-rose-700 line-through" : colors.text}`}>
                            {course.failed && "🚨 "}{course.name}
                          </p>
                          {height >= 80 && (
                            <p className={`text-xs mt-0.5 truncate ${course.failed ? "text-rose-400" : "text-slate-500"}`}>
                              {course.professor}
                            </p>
                          )}
                          {height >= 110 && (
                            <p className="text-xs text-slate-400 truncate">{course.room}</p>
                          )}
                          {height >= 130 && (
                            <p className={`text-xs font-medium mt-1 ${course.failed ? "text-rose-400" : colors.text}`}>
                              {course.credits}학점
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 온라인/비대면 과목 영역 */}
      {onlineCourses.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-200 bg-sky-50/50 flex-shrink-0">
          <p className="text-xs font-semibold text-sky-700 mb-2 flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5" />
            비대면 과목 ({onlineCourses.length}개)
          </p>
          <div className="flex flex-wrap gap-2">
            {onlineCourses.map((course) => {
              const colors = COURSE_COLORS[course.colorIndex % COURSE_COLORS.length];
              return (
                <button
                  key={course.id}
                  onClick={(e) => handleCourseClick(e, course)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    course.failed
                      ? "bg-rose-50 border-rose-200 text-rose-700 line-through opacity-60"
                      : `${colors.bg} ${colors.border} ${colors.text}`
                  }`}
                >
                  <Wifi className="w-3 h-3 opacity-60" />
                  {course.name}
                  <span className="opacity-60">· {course.credits}학점</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {menu && selectedCourse && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[180px] animate-fade-in"
          style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 120) }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900 truncate">{selectedCourse.name}</p>
            <p className="text-xs text-slate-400">
              {selectedCourse.isOnline ? "🌐 비대면" : `${selectedCourse.day}요일`} · {selectedCourse.credits}학점
            </p>
          </div>
          <button
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors ${
              selectedCourse.failed ? "text-emerald-600" : "text-orange-600"
            }`}
            onClick={() => handleToggleFailed(selectedCourse.id)}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {selectedCourse.failed ? "튕김 처리 취소" : "🚨 튕김 처리"}
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition-colors"
            onClick={() => handleDelete(selectedCourse.id)}
          >
            <X className="w-3.5 h-3.5" />
            시간표에서 삭제
          </button>
        </div>
      )}
    </div>
  );
}
