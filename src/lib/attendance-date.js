export function toAttendanceDate(dateStr) {
  const [year, month, day] = String(dateStr).split("T")[0].split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function getAttendanceDayRange(dateStrOrDate) {
  const start =
    dateStrOrDate instanceof Date
      ? new Date(
          Date.UTC(
            dateStrOrDate.getUTCFullYear(),
            dateStrOrDate.getUTCMonth(),
            dateStrOrDate.getUTCDate()
          )
        )
      : toAttendanceDate(dateStrOrDate);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function getLocalTimeString(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Default half-day departure time (2:00 PM). */
export const HALF_DAY_DEFAULT_OUT_TIME = "14:00";

/** Half-day out time: 2 PM, or current time if already past 2 PM. */
export function resolveHalfDayOutTime(now = new Date()) {
  const nowStr = getLocalTimeString(now);
  return nowStr > HALF_DAY_DEFAULT_OUT_TIME ? nowStr : HALF_DAY_DEFAULT_OUT_TIME;
}

export function toTimeInputValue(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return getLocalTimeString(d);
}

export function combineDateAndTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [year, month, day] = String(dateStr).split("T")[0].split("-").map(Number);
  const [hours, minutes] = String(timeStr).split(":").map(Number);
  if ([year, month, day, hours, minutes].some((n) => Number.isNaN(n))) return null;
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}
