"use client";



import { useState, useEffect, useMemo } from "react";

import { motion } from "framer-motion";

import { BrandMark } from "@/components/brand/brand-mark";

import { Save, CheckCheck, Printer, Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Checkbox } from "@/components/ui/checkbox";

import { toast } from "sonner";

import { api } from "@/lib/api-client";

import { useAuth } from "@/context/auth-context";

import { getLocalDateString, isDateBeforeToday } from "@/lib/utils";



export default function DailyAttendancePage() {

  const { user, hasPermission } = useAuth();

  const isSuperAdmin =

    user?.role === "super_admin" || hasPermission("Full System Access");

  const canMark =

    hasPermission("Mark Attendance") ||

    hasPermission("Full System Access") ||

    user?.role === "security" ||

    user?.role === "super_admin";

  const [records, setRecords] = useState([]);

  const [search, setSearch] = useState("");

  const today = getLocalDateString();

  const [date, setDate] = useState(today);

  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);

  const [showPrint, setShowPrint] = useState(false);



  useEffect(() => {

    api.attendance(date).then((data) => setRecords(data.records || [])).catch(() => {});

  }, [date]);



  const canEditDate = canMark && (!isDateBeforeToday(date) || isSuperAdmin);



  const handleDateChange = (value) => {

    if (canMark && !isSuperAdmin && isDateBeforeToday(value)) {

      toast.error("Security can only mark attendance for today");

      return;

    }

    setDate(value);

    setSaved(false);

    setShowPrint(false);

  };



  const filteredRecords = useMemo(() => {

    const q = search.trim().toLowerCase();

    if (!q) return records;

    return records.filter(

      (r) =>

        r.employeeName?.toLowerCase().includes(q) ||

        r.employeeCode?.toLowerCase().includes(q) ||

        r.department?.toLowerCase().includes(q)

    );

  }, [records, search]);



  const updateStatus = (employeeCode, field) => {

    if (!canEditDate) return;

    setRecords((prev) =>

      prev.map((r) => {

        if (r.employeeCode !== employeeCode) return r;

        return { ...r, present: false, halfDay: false, leave: false, [field]: true };

      })

    );

    setSaved(false);

    setShowPrint(false);

  };



  const updateRemarks = (employeeCode, remarks) => {

    setRecords((prev) =>

      prev.map((r) => (r.employeeCode === employeeCode ? { ...r, remarks } : r))

    );

    setSaved(false);

    setShowPrint(false);

  };



  const bulkMarkPresent = () => {

    if (!canEditDate) return;

    const visibleCodes = new Set(filteredRecords.map((r) => r.employeeCode));

    setRecords((prev) =>

      prev.map((r) =>

        visibleCodes.has(r.employeeCode)

          ? { ...r, present: true, halfDay: false, leave: false }

          : r

      )

    );

    setSaved(false);

    setShowPrint(false);

  };



  const handleSave = async () => {

    if (!canEditDate) {

      toast.error("You cannot edit attendance for this date");

      return;

    }

    if (!isSuperAdmin && isDateBeforeToday(date)) {

      toast.error("Cannot save attendance for past dates");

      return;

    }

    setSaving(true);

    try {

      await api.saveAttendance({ date, records });

      setSaved(true);

      setShowPrint(true);

      toast.success("Attendance saved successfully");

    } catch (err) {

      toast.error(err.message);

    }

    setSaving(false);

  };



  const handlePrint = () => window.print();



  const dateLabel = new Date(date).toLocaleDateString("en-IN", {

    weekday: "long", day: "2-digit", month: "short", year: "numeric",

  });



  const datePickerMin = canMark && !isSuperAdmin ? today : undefined;

  const datePickerMax = canMark ? today : undefined;



  return (

    <div className="space-y-6">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">

        <div>

          <h1 className="text-2xl font-bold lg:text-3xl">Daily Attendance</h1>

          <p className="text-muted-foreground">

            {canMark

              ? isSuperAdmin

                ? "Mark attendance — Super Admin can edit past dates"

                : "Mark today's attendance — Security can edit today only"

              : "View only — attendance is marked by Security team"}

          </p>

        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">

          <Input

            type="date"

            value={date}

            min={datePickerMin}

            max={datePickerMax}

            onChange={(e) => handleDateChange(e.target.value)}

            className="w-full sm:w-auto"

          />

          {canEditDate && (

            <Button variant="outline" onClick={bulkMarkPresent}>

              <CheckCheck className="h-4 w-4" /> Bulk Mark Present

            </Button>

          )}

          {canEditDate && (

            <Button variant="premium" onClick={handleSave} disabled={saving}>

              <Save className="h-4 w-4" />

              {saving ? "Saving..." : saved ? "Saved!" : "Save Attendance"}

            </Button>

          )}

          {showPrint && canEditDate && (

            <Button variant="outline" onClick={handlePrint}>

              <Printer className="h-4 w-4" /> Print Attendance

            </Button>

          )}

        </div>

      </div>



      <Card className="glass-card no-print">

        <CardHeader className="space-y-4">

          <div>

            <CardTitle>Attendance Register — {dateLabel}</CardTitle>

            <CardDescription>

              {canEditDate

                ? "Search by name or code, then mark attendance"

                : canMark && isDateBeforeToday(date) && !isSuperAdmin

                  ? "Past dates are read-only for Security — only today can be edited"

                  : "Read-only view of attendance"}

            </CardDescription>

          </div>

          <div className="relative max-w-md">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input

              placeholder="Search by name, employee code, or department..."

              value={search}

              onChange={(e) => setSearch(e.target.value)}

              className="pl-9"

            />

          </div>

        </CardHeader>

        <CardContent>

          <div className="max-h-[min(28rem,50vh)] overflow-auto rounded-lg border">

            <table className="w-full min-w-[720px] text-sm">

              <thead>

                <tr className="border-b bg-muted/50">

                  <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left font-medium backdrop-blur-sm">Employee ID</th>

                  <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left font-medium backdrop-blur-sm">Employee Name</th>

                  <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left font-medium backdrop-blur-sm">Department</th>

                  <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-center font-medium backdrop-blur-sm">Present</th>

                  <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-center font-medium backdrop-blur-sm">Half Day</th>

                  <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-center font-medium backdrop-blur-sm">Leave</th>

                  <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left font-medium backdrop-blur-sm">Remarks</th>

                </tr>

              </thead>

              <tbody>

                {filteredRecords.length === 0 ? (

                  <tr>

                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">

                      {search.trim() ? "No employees match your search" : "No employees found"}

                    </td>

                  </tr>

                ) : (

                  filteredRecords.map((record, index) => (

                    <motion.tr

                      key={record.employeeCode}

                      initial={{ opacity: 0 }}

                      animate={{ opacity: 1 }}

                      transition={{ delay: Math.min(index * 0.03, 0.3) }}

                      className="border-b hover:bg-muted/20"

                    >

                      <td className="px-4 py-3 font-mono text-xs font-medium">{record.employeeCode}</td>

                      <td className="px-4 py-3">{record.employeeName}</td>

                      <td className="px-4 py-3">{record.department}</td>

                      <td className="px-4 py-3 text-center">

                        <Checkbox

                          checked={record.present}

                          disabled={!canEditDate}

                          onCheckedChange={() => updateStatus(record.employeeCode, "present")}

                        />

                      </td>

                      <td className="px-4 py-3 text-center">

                        <Checkbox

                          checked={record.halfDay}

                          disabled={!canEditDate}

                          onCheckedChange={() => updateStatus(record.employeeCode, "halfDay")}

                        />

                      </td>

                      <td className="px-4 py-3 text-center">

                        <Checkbox

                          checked={record.leave}

                          disabled={!canEditDate}

                          onCheckedChange={() => updateStatus(record.employeeCode, "leave")}

                        />

                      </td>

                      <td className="px-4 py-3">

                        <Input

                          placeholder="Remarks"

                          value={record.remarks}

                          onChange={(e) => updateRemarks(record.employeeCode, e.target.value)}

                          className="h-8 text-xs"

                          disabled={!canEditDate}

                        />

                      </td>

                    </motion.tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

          {search.trim() && filteredRecords.length > 0 && (

            <p className="mt-2 text-xs text-muted-foreground">

              Showing {filteredRecords.length} of {records.length} employees

            </p>

          )}

        </CardContent>

      </Card>



      {showPrint && (

        <div className="print-area hidden print:block">

          <div className="bg-white p-8 text-black" style={{ width: "210mm" }}>

            <div className="mb-6 border-b-2 border-black pb-4 text-center">

              <BrandMark variant="print" className="mb-2" />

              <h2 className="text-base font-semibold mt-1">DAILY ATTENDANCE REGISTER</h2>

              <p className="text-sm mt-2">{dateLabel}</p>

            </div>

            <table className="w-full border-collapse border border-black text-xs">

              <thead>

                <tr className="bg-gray-100">

                  <th className="border border-black px-2 py-1.5">S.No</th>

                  <th className="border border-black px-2 py-1.5">Employee ID</th>

                  <th className="border border-black px-2 py-1.5">Employee Name</th>

                  <th className="border border-black px-2 py-1.5">Department</th>

                  <th className="border border-black px-2 py-1.5">Status</th>

                  <th className="border border-black px-2 py-1.5">In Time</th>

                  <th className="border border-black px-2 py-1.5">Out Time</th>

                  <th className="border border-black px-2 py-1.5">Signature</th>

                </tr>

              </thead>

              <tbody>

                {records.map((r, i) => (

                  <tr key={r.employeeCode}>

                    <td className="border border-black px-2 py-2 text-center">{i + 1}</td>

                    <td className="border border-black px-2 py-2">{r.employeeCode}</td>

                    <td className="border border-black px-2 py-2">{r.employeeName}</td>

                    <td className="border border-black px-2 py-2">{r.department}</td>

                    <td className="border border-black px-2 py-2">

                      {r.present ? "Present" : r.halfDay ? "Half Day" : r.leave ? "Leave" : "-"}

                    </td>

                    <td className="border border-black px-2 py-2 h-8"></td>

                    <td className="border border-black px-2 py-2 h-8"></td>

                    <td className="border border-black px-2 py-2 h-8"></td>

                  </tr>

                ))}

              </tbody>

            </table>

            <div className="mt-8 flex justify-between text-xs">

              <div>

                <p className="font-semibold">Prepared By</p>

                <p className="mt-6 border-b border-black w-40">Signature</p>

              </div>

              <div className="text-right">

                <p className="font-semibold">Verified By</p>

                <p className="mt-6 border-b border-black w-40 ml-auto">Signature</p>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}


