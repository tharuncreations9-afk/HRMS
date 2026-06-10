"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileBarChart,
  Download,
  Printer,
  Eye,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttendanceRegister } from "@/components/reports/attendance-register";
import { MONTHS } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export default function ReportsPage() {
  const [department, setDepartment] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(String(currentYear));
  const [showPreview, setShowPreview] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [reportEmployees, setReportEmployees] = useState([]);
  const [companyName, setCompanyName] = useState("VLJ Treasures Pvt. Ltd.");

  useEffect(() => {
    api.departments().then((d) => setDepartments(d.departments || [])).catch(() => {});
  }, []);

  const canGenerate = department && month && year;

  const handleGenerate = async () => {
    if (canGenerate) {
      try {
        const data = await api.reportEmployees(department);
        setReportEmployees(data.employees || []);
        setCompanyName(data.companyName || "VLJ Treasures Pvt. Ltd.");
        setGenerated(true);
        setShowPreview(true);
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    toast.info("PDF download will be available in Phase 2 with backend integration.");
  };

  const handleDownloadExcel = () => {
    toast.info("Excel download will be available in Phase 2 with backend integration.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold lg:text-3xl">Reports & Downloads</h1>
        <p className="text-muted-foreground">Generate and download attendance reports</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <Card className="glass-card lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileBarChart className="h-5 w-5 text-royal" />
                Monthly Attendance Sheet
              </CardTitle>
              <CardDescription>
                Generate printable attendance register for security guards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Departments">All Departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.departmentName}>{d.departmentName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  variant="premium"
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                >
                  <FileText className="h-4 w-4" /> Generate Report
                </Button>

                {generated && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="grid grid-cols-2 gap-2"
                  >
                    <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                      <Eye className="h-4 w-4" /> Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                      <Printer className="h-4 w-4" /> Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                      <Download className="h-4 w-4" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadExcel}>
                      <FileSpreadsheet className="h-4 w-4" /> Excel
                    </Button>
                  </motion.div>
                )}
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Attendance Register Format</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Monday to Saturday only (Sundays excluded)</li>
                  <li>Two dates per page for manual entry</li>
                  <li>In Time, Out Time, Signature columns</li>
                  <li>A4 print-friendly layout</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {showPreview && generated ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="no-print mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-base font-semibold sm:text-lg break-words">
                    Preview — {department} · {month} {year}
                  </h2>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-1" /> Print Register
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-lg border bg-gray-100 p-4 dark:bg-gray-900">
                  <AttendanceRegister
                    department={department}
                    month={month}
                    year={parseInt(year)}
                    employees={reportEmployees}
                    companyName={companyName}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-96 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20"
              >
                <div className="text-center">
                  <FileBarChart className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-muted-foreground">
                    Select Department, Month, and Year to generate the attendance register
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
