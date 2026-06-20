"use client";

import { Fragment } from "react";
import { getMonthDays, formatDateForRegister, MONTHS } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

export function AttendanceRegister({ department, month, year, employees = [] }) {
  const monthIndex = MONTHS.indexOf(month) + 1;
  const days = getMonthDays(year, monthIndex);

  const deptEmployees = department === "All Departments"
    ? employees
    : employees.filter((e) => e.department === department);

  const datePairs = [];
  for (let i = 0; i < days.length; i += 2) {
    datePairs.push(days.slice(i, i + 2));
  }

  return (
    <div className="print-area">
      {datePairs.map((pair, pageIndex) => (
        <div
          key={pageIndex}
          className="print-page attendance-register-page mx-auto mb-6 bg-white p-4 text-black shadow-lg sm:mb-8 sm:p-6 lg:p-8"
          style={{ width: "210mm", minHeight: "297mm" }}
        >
          <div className="mb-4 border-b border-black pb-3 text-center sm:mb-6 sm:pb-4">
            <h2 className="text-base font-semibold sm:text-lg">Attendance Register</h2>
            <div className="mt-2 flex flex-col items-center gap-1 text-xs sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-1 sm:text-sm">
              <span className="break-words"><strong>Department:</strong> {department}</span>
              <span><strong>Month:</strong> {month}</span>
              <span><strong>Year:</strong> {year}</span>
            </div>
          </div>

          <div className="overflow-x-auto sm:overflow-visible">
            <table className="mb-4 w-full min-w-[480px] border-collapse border border-black text-[10px] sm:min-w-0 sm:text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-2 py-1.5 w-10 text-center">S.No</th>
                  <th className="border border-black px-2 py-1.5 text-left">Employee Name</th>
                  {pair.map((date) => (
                    <th key={date.toISOString()} colSpan={2} className="border border-black px-1 py-1.5 text-center">
                      {formatDateForRegister(date)}
                    </th>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <th className="border border-black px-2 py-1" />
                  <th className="border border-black px-2 py-1" />
                  {pair.map((date) => (
                    <Fragment key={`subhdr-${date.toISOString()}`}>
                      <th className="border border-black px-1 py-1 text-center w-16">In Time</th>
                      <th className="border border-black px-1 py-1 text-center w-16">Out Time</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deptEmployees.map((emp, idx) => (
                  <tr key={emp.id}>
                    <td className="border border-black px-2 py-2 text-center">{idx + 1}</td>
                    <td className="border border-black px-2 py-2 font-medium">{emp.name}</td>
                    {pair.map((date) => (
                      <Fragment key={`${emp.id}-${date.toISOString()}`}>
                        <td className="border border-black px-1 py-2 h-8" />
                        <td className="border border-black px-1 py-2 h-8" />
                      </Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-center text-[10px] text-gray-500">
            Page {pageIndex + 1} of {datePairs.length} · {BRAND.displayName} {BRAND.productName}
          </p>
        </div>
      ))}
    </div>
  );
}
