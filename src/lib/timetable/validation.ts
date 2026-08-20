import { z } from "zod";
import type { Course } from "../../app/types";

export const DayTypeSchema = z.enum(["월", "화", "수", "목", "금"]);

export const ScheduleSlotSchema = z.object({
  day: DayTypeSchema,
  startHour: z.number().int().min(9).max(17),
  duration: z.number().int().min(1).max(5),
  room: z.string().min(1),
});

export const CourseSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "과목명은 필수입니다."),
  professor: z.string().min(1, "교수명은 필수입니다."),
  room: z.string().min(1, "강의실은 필수입니다."),
  credits: z.number().min(1).max(6),
  day: DayTypeSchema,
  startHour: z.number().int().min(9).max(17),
  duration: z.number().int().min(1).max(5),
  colorIndex: z.number().int().min(0).max(5),
  failed: z.boolean().optional(),
  // 확장 필드 (옵셔널)
  courseCode: z.string().optional(),
  classNo: z.string().optional(),
  category: z.string().optional(),
  department: z.string().optional(),
  grade: z.number().int().min(1).max(6).optional(),
  quota: z.number().int().nonnegative().optional(),
  isOnline: z.boolean().optional(),
  slots: z.array(ScheduleSlotSchema).optional(),
});

export const TimetableSchema = z.array(CourseSchema);

export function safeParseCourse(data: unknown): { success: true; data: Course } | { success: false; error: string } {
  const result = CourseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as Course };
  }
  return {
    success: false,
    error: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
  };
}

export function safeParseTimetable(data: unknown): { success: true; data: Course[] } | { success: false; error: string } {
  const result = TimetableSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as Course[] };
  }
  return {
    success: false,
    error: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
  };
}
