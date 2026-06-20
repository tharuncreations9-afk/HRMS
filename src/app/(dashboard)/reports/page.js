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
import { ReportPreviewScaler } from "@/components/reports/report-preview-scaler";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useLookups } from "@/hooks/use-lookups";

const currentYear = new Date().getFullYear();

const PREVIEW_HEIGHT = "h-[calc(100vh-12rem)] min-h-[520px] max-h-[800px]";

export default function ReportsPage() {
  const [department, setDepartment] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(String(currentYear));
  const [showPreview, setShowPreview] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [reportEmployees, setReportEmployees] = useState([]);
  const { lookups } = useLookups();
  const months = lookups?.months || [];
  const years = lookups?.reportYears || [];
  const reportDepartments = lookups?.reportDepartmentOptions || [];

  useEffect(() => {
    if (reportDepartments.length && !department) {
      setDepartment(reportDepartments[0]?.value || "");
    }
  }, [reportDepartments, department]);

  const canGenerate = department && month && year;

  const handleGenerate = async () => {
    if (canGenerate) {
      try {
        const data = await api.reportEmployees(department);
        setReportEmployees(data.employees || []);
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
    <div className="flex min-h-0 flex-col gap-4 lg:gap-5">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold lg:text-3xl">Reports & Downloads</h1>
        <p className="text-muted-foreground">Generate and download attendance reports</p>
      </div>

      <div className="grid min-h-0 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(280px,320px)_1fr] lg:gap-6">
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full shrink-0 lg:sticky lg:top-5 lg:z-10 lg:self-start"
        >
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <FileBarChart className="h-5 w-5 shrink-0 text-royal" />
                <span>Monthly Attendance Sheet</span>
              </CardTitle>
              <CardDescription>
                Generate printable attendance register for security guards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportDepartments.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 pt-1">
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
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setShowPreview(!showPreview)}>
                      <Eye className="h-4 w-4 shrink-0" />
                      <span className="truncate">{showPreview ? "Hide" : "Preview"}</span>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" onClick={handlePrint}>
                      <Printer className="h-4 w-4 shrink-0" />
                      <span className="truncate">Print</span>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" onClick={handleDownloadPDF}>
                      <Download className="h-4 w-4 shrink-0" />
                      <span className="truncate">PDF</span>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" onClick={handleDownloadExcel}>
                      <FileSpreadsheet className="h-4 w-4 shrink-0" />
                      <span className="truncate">Excel</span>
                    </Button>
                  </motion.div>
                )}
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">Attendance Register Format</p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Monday to Saturday only (Sundays excluded)</li>
                  <li>Two dates per page for manual entry</li>
                  <li>In Time and Out Time columns</li>
                  <li>A4 print-friendly layout</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.aside>

        <section className="flex min-h-0 min-w-0 flex-col">
          <AnimatePresence mode="wait">
            {showPreview && generated ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className={`flex min-h-0 flex-col ${PREVIEW_HEIGHT}`}
              >
                <div className="no-print mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-base font-semibold break-words sm:text-lg">
                    Preview — {department} · {month} {year}
                  </h2>
                  <Button variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" onClick={handlePrint}>
                    <Printer className="mr-1 h-4 w-4" /> Print Register
                  </Button>
                </div>

                <div
                  className={`min-h-0 flex-1 overflow-y-auto overflow-x-auto rounded-lg border border-border bg-muted/40 shadow-inner`}
                >
                  <div className="min-h-full p-3 sm:p-4">
                    <p className="no-print mb-3 text-center text-[11px] text-muted-foreground lg:hidden">
                      Scroll inside the preview to view all pages. Use Print for full A4 output.
                    </p>
                    <ReportPreviewScaler scrollContainer>
                      <AttendanceRegister
                        department={department}
                        month={month}
                        year={parseInt(year)}
                        employees={reportEmployees}
                      />
                    </ReportPreviewScaler>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 ${PREVIEW_HEIGHT}`}
              >
                <div className="px-4 text-center">
                  <FileBarChart className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-sm text-muted-foreground sm:text-base">
                    Select Department, Month, and Year to generate the attendance register
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
