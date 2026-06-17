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
