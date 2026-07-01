import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Local calendar date as YYYY-MM-DD (avoids UTC shift from toISOString). */
export function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isDateBeforeToday(dateStr) {
  if (!dateStr) return false;
  return dateStr < getLocalDateString();
}

export function getMonthDays(year, month) {
  const days = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    if (date.getDay() !== 0) {
      days.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function getDayName(date) {
  return date.toLocaleDateString("en-IN", { weekday: "long" });
}

export function formatDateForRegister(date) {
  const day = getDayName(date);
  const formatted = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${day} ${formatted}`;
}

/** Excel register date: Wednesday, 01 July, 2026 */
export function formatExcelRegisterDate(date) {
  const dayName = date.toLocaleDateString("en-IN", { weekday: "long" });
  const dayNum = String(date.getDate()).padStart(2, "0");
  const monthName = date.toLocaleDateString("en-IN", { month: "long" });
  const year = date.getFullYear();
  return `${dayName}, ${dayNum} ${monthName}, ${year}`;
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
