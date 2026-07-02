"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileBarChart,
  Search,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttendanceMonthlyStatement } from "@/components/reports/attendance-monthly-statement";
import {
  exportAttendanceStatementExcel,
  printAttendanceStatementPdf,
} from "@/lib/attendance-monthly-report";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useLookups } from "@/hooks/use-lookups";
import { toast } from "sonner";

function canAccessReport(hasPermission) {
  return (
    hasPermission("Generate Reports") ||
    hasPermission("View Team Reports") ||
    hasPermission("Full System Access") ||
    hasPermission("All Permissions")
  );
}

const defaultFilters = () => ({
  month: "",
  year: String(new Date().getFullYear()),
  department: "all",
  search: "",
});

export default function AttendanceReportPage() {
  const router = useRouter();
  const { user, isLoading, hasPermission } = useAuth();
  const { lookups } = useLookups();
  const canView = canAccessReport(hasPermission);

  const [filters, setFilters] = useState(defaultFilters);
  const [draft, setDraft] = useState(defaultFilters);
  const [rows, setRows] = useState([]);
  const [headerTitle, setHeaderTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const months = lookups?.months || [];
  const years = lookups?.reportYears || [];

  useEffect(() => {
    if (!isLoading && user && !canView) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router, canView]);

  useEffect(() => {
    if (months.length && !draft.month) {
      const currentMonth = months[new Date().getMonth()]?.value || months[0]?.value || "";
      setDraft((prev) => ({ ...prev, month: currentMonth }));
    }
  }, [months, draft.month]);

  const loadReport = useCallback(
    (activeFilters) => {
      if (!activeFilters.month) {
        toast.error("Select a month");
        return;
      }

      setLoading(true);
      api
        .attendanceReport({
          month: activeFilters.month,
          year: activeFilters.year,
          department: activeFilters.department,
          search: activeFilters.search.trim(),
        })
        .then((data) => {
          setRows(data.rows || []);
          setHeaderTitle(data.headerTitle || "");
          setGenerated(true);
        })
        .catch((err) => toast.error(err.message || "Failed to load report"))
        .finally(() => setLoading(false));
    },
    []
  );

  const handleSearch = () => {
    setFilters(draft);
    loadReport(draft);
  };

  const handleReset = () => {
    const reset = {
      ...defaultFilters(),
      month: months[new Date().getMonth()]?.value || months[0]?.value || "",
    };
    setDraft(reset);
    setFilters(reset);
    setRows([]);
    setHeaderTitle("");
    setGenerated(false);
  };

  const handlePrint = () => {
    if (!generated || !rows.length) {
      toast.error("Generate the report first");
      return;
    }
    printAttendanceStatementPdf();
  };

  const handleExportExcel = () => {
    if (!generated || !rows.length) {
      toast.error("Generate the report first");
      return;
    }
    try {
      exportAttendanceStatementExcel({
        month: filters.month,
        year: filters.year,
        headerTitle,
        rows,
      });
      toast.success("Excel file downloaded.");
    } catch (err) {
      toast.error(err?.message || "Failed to export Excel");
    }
  };

  const handleExportPdf = () => {
    if (!generated || !rows.length) {
      toast.error("Generate the report first");
      return;
    }
    printAttendanceStatementPdf();
    toast.info("Choose 'Save as PDF' in the print dialog.");
  };

  const departmentOptions = (lookups?.reportDepartmentOptions || []).filter(
    (opt) => opt.value !== "All Departments"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold lg:text-3xl">Attendance Report</h1>
        <p className="text-muted-foreground">
          Monthly attendance statement with present, late and absent day totals.
        </p>
      </div>

      <Card className="glass-card no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-champagne" />
            Filters
          </CardTitle>
          <CardDescription>Select month, year and department to generate the statement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select
                value={draft.month}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, month: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Select
                value={draft.year}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, year: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.value} value={String(y.value)}>
                      {y.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={draft.department}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, department: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departmentOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search Employee</Label>
              <Input
                placeholder="Name or employee code"
                value={draft.search}
                onChange={(e) => setDraft((prev) => ({ ...prev, search: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="premium" onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4" />
              {loading ? "Searching..." : "Search"}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={loading}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            {generated && (
              <>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Excel
                </Button>
                <Button variant="outline" onClick={handleExportPdf}>
                  <FileText className="h-4 w-4" />
                  Export PDF
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {generated && (
        <Card className="glass-card">
          <CardHeader className="no-print">
            <CardTitle>Attendance Statement</CardTitle>
            <CardDescription>
              {filters.month} {filters.year}
              {filters.department !== "all" ? ` · ${filters.department}` : ""}
              {filters.search ? ` · "${filters.search}"` : ""}
              {" · "}
              {rows.length} employee(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <AttendanceMonthlyStatement headerTitle={headerTitle} rows={rows} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
