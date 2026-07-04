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

export function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Half-day: arrival after 12:30 or departure between 12:30–16:00. */
export const HALF_DAY_CUTOFF_TIME = "12:30";
export const HALF_DAY_END_WINDOW = "16:00";
export const HALF_DAY_DEFAULT_OUT_TIME = HALF_DAY_CUTOFF_TIME;

export function isAfterHalfDayCutoff(timeStr) {
  if (!timeStr) return false;
  return String(timeStr) > HALF_DAY_CUTOFF_TIME;
}

export function isTimeInFuture(timeStr, dateStr) {
  if (!timeStr) return false;
  const today = getLocalDateString();
  if (dateStr && dateStr < today) return false;
  if (dateStr && dateStr > today) return true;
  return timeStr > getLocalTimeString();
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
