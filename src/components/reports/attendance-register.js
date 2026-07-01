"use client";

import { Fragment, useMemo } from "react";
import { formatExcelRegisterDate } from "@/lib/utils";
import "./attendance-register.css";
import {
  buildRegisterPages,
  buildSheetRows,
} from "@/lib/attendance-register";

function RegisterSheet({ weekTitle, datePair, employees, startIndex }) {
  const rows = buildSheetRows(employees, startIndex);
  const padSecond = datePair.length === 1;

  return (
    <table className="excel-register-table" cellSpacing={0} cellPadding={0}>
      <colgroup>
        <col className="excel-col-sno" />
        <col className="excel-col-name" />
        <col className="excel-col-field" />
        <col className="excel-col-field" />
        <col className="excel-col-field" />
        <col className="excel-col-field" />
        <col className="excel-col-field" />
        <col className="excel-col-field" />
      </colgroup>
      <thead>
        <tr>
          <th colSpan={8} className="excel-week-title-cell">
            {weekTitle}
          </th>
        </tr>
        <tr>
          <th rowSpan={2} className="excel-th excel-th-sno">
            S.No
          </th>
          <th rowSpan={2} className="excel-th excel-th-name">
            Name of the Employee
          </th>
          {datePair[0] && (
            <th colSpan={3} className="excel-th excel-th-date">
              {formatExcelRegisterDate(datePair[0])}
            </th>
          )}
          {datePair[1] ? (
            <th colSpan={3} className="excel-th excel-th-date">
              {formatExcelRegisterDate(datePair[1])}
            </th>
          ) : padSecond ? (
            <th colSpan={3} className="excel-th excel-th-date" />
          ) : null}
        </tr>
        <tr>
          <th className="excel-th excel-th-sub">In Time</th>
          <th className="excel-th excel-th-sub">Out Time</th>
          <th className="excel-th excel-th-sub excel-section-end">Signature</th>
          {(datePair[1] || padSecond) && (
            <Fragment>
              <th className="excel-th excel-th-sub">In Time</th>
              <th className="excel-th excel-th-sub">Out Time</th>
              <th className="excel-th excel-th-sub">Signature</th>
            </Fragment>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="excel-data-row">
            <td className="excel-td excel-td-sno">{row.sno}</td>
            <td className="excel-td excel-td-name">{row.name}</td>
            <td className="excel-td excel-td-field" />
            <td className="excel-td excel-td-field" />
            <td className="excel-td excel-td-field excel-section-end" />
            <td className="excel-td excel-td-field" />
            <td className="excel-td excel-td-field" />
            <td className="excel-td excel-td-field" />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AttendanceRegister({ department, month, year, employees = [] }) {
  const pages = useMemo(
    () => buildRegisterPages({ department, month, year, employees }),
    [department, month, year, employees]
  );

  return (
    <div className="print-area excel-register-root">
      {pages.map((page) => (
        <section
          key={page.id}
          className="excel-register-page"
          data-page={page.globalPageNumber}
        >
          <RegisterSheet
            weekTitle={page.weekTitle}
            datePair={page.datePair}
            employees={page.employees}
            startIndex={page.startIndex}
          />
        </section>
      ))}
    </div>
  );
}
