const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function getMonthIndexFromName(monthName) {
  const idx = MONTH_NAMES.indexOf(monthName);
  return idx >= 0 ? idx + 1 : null;
}

export function formatAttendanceReportHeader(monthName, year) {
  const short = String(monthName || "").slice(0, 3).toUpperCase();
  return `ATTENDANCE FOR THE MONTH OF ${short} - ${year}`;
}

/**
 * Monthly attendance summary for one employee (matches Admin Attendance Excel).
 */
export function computeMonthlyAttendanceStats(attendanceRecords, year, monthIndex) {
  const daysInMonth = new Date(year, monthIndex, 0).getDate();
  const byDay = new Map();

  for (const record of attendanceRecords || []) {
    const date = new Date(record.attendanceDate);
    if (Number.isNaN(date.getTime())) continue;
    byDay.set(date.getDate(), record);
  }

  let lateDays = 0;
  let fullDays = 0;
  let halfDays = 0;
  let sundays = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex - 1, day);
    const dayOfWeek = date.getDay();
    const att = byDay.get(day);
    if (!att) continue;

    const status = att.attendanceStatus;
    const lateMinutes = Number(att.lateMinutes || 0);

    if (lateMinutes > 0 || status === "Late") {
      lateDays += 1;
    }

    if (status === "Half_Day") {
      halfDays += 1;
    } else if (status === "Present" || status === "Late") {
      if (dayOfWeek === 0) sundays += 1;
      else fullDays += 1;
    }
  }

  const totalPresentDays = fullDays + halfDays + sundays;
  const absentDays = Math.max(0, daysInMonth - totalPresentDays);

  return {
    lateDays,
    fullDays,
    halfDays,
    sundays,
    totalPresentDays,
    absentDays,
    daysInMonth,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildStatementTableHtml({ headerTitle, rows }) {
  const bodyRows = (rows || [])
    .map(
      (row) => `<tr>
  <td class="c c-sno">${row.sno}</td>
  <td class="c c-name">${escapeHtml(row.employeeName)}</td>
  <td class="c c-num">${row.lateDays}</td>
  <td class="c c-num">${row.fullDays}</td>
  <td class="c c-num">${row.halfDays}</td>
  <td class="c c-num">${row.sundays}</td>
  <td class="c c-num">${row.totalPresentDays}</td>
  <td class="c c-num">${row.absentDays}</td>
</tr>`
    )
    .join("\n");

  return `<table class="stmt-table" cellspacing="0" cellpadding="0">
  <thead>
    <tr>
      <th class="title-row" colspan="8">${escapeHtml(headerTitle)}</th>
    </tr>
    <tr>
      <th class="h" rowspan="2">S.NO</th>
      <th class="h h-name" rowspan="2">NAME OF THE EMPLOYEE</th>
      <th class="h" rowspan="2">NO. OF LATE DAYS</th>
      <th class="h" colspan="3">PRESENT DAYS</th>
      <th class="h" rowspan="2">TOTAL PRESENT DAYS</th>
      <th class="h" rowspan="2">ABSENT DAYS</th>
    </tr>
    <tr>
      <th class="h h-sub">FULL DAYS</th>
      <th class="h h-sub">HALF DAYS</th>
      <th class="h h-sub">SUNDAYS</th>
    </tr>
  </thead>
  <tbody>
${bodyRows}
  </tbody>
</table>`;
}

const EXCEL_DOC_STYLE = `
  body { font-family: Calibri, Arial, sans-serif; margin: 0; }
  .stmt-table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  .title-row {
    text-align: center; font-size: 14pt; font-weight: bold;
    border: 1px solid #000; padding: 8pt 4pt;
  }
  .h, .c {
    border: 1px solid #000; padding: 4pt 6pt; font-size: 10pt;
    vertical-align: middle; text-align: center;
  }
  .h-name, .c-name { text-align: left; }
  .h-sub { font-size: 9pt; }
  .c-sno { width: 40px; }
  .c-name { width: 220px; }
`;

export function buildAttendanceStatementExcelHtml({ headerTitle, rows }) {
  const table = buildStatementTableHtml({ headerTitle, rows });
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta charset="utf-8" />
<style>${EXCEL_DOC_STYLE}</style>
</head>
<body>${table}</body>
</html>`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportAttendanceStatementExcel({ month, year, headerTitle, rows }) {
  const html = buildAttendanceStatementExcelHtml({ headerTitle, rows });
  const blob = new Blob(["\uFEFF", html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const shortMonth = String(month || "").slice(0, 3);
  const filename = `Attendance-Report_${shortMonth}-${year}.xls`;
  triggerDownload(blob, filename);
}

export function printAttendanceStatementPdf() {
  window.print();
}
