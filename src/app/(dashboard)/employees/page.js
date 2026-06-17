"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Search, Plus, Eye, Pencil, Trash2, Upload, Download, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { EMPLOYEE_LIST_STATUS_FILTERS } from "@/lib/employee-status";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";

const PAGE_SIZE = 25;

function EmployeeListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSearch = searchParams.get("search") || "";
  const { user, hasPermission } = useAuth();
  const canManageEmployees = hasPermission("Employee Management");

  useEffect(() => {
    if (user && !canManageEmployees && user.id) {
      router.replace(`/employees/${user.id}`);
    }
  }, [user, canManageEmployees, router]);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [department, setDepartment] = useState("all");
  const [designation, setDesignation] = useState("all");
  const [status, setStatus] = useState("all");
  const [employeeCategory, setEmployeeCategory] = useState("all");
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef(null);
  const sentinelRef = useRef(null);
  const tableScrollRef = useRef(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    api.departments().then((d) => setDepartments(d.departments || [])).catch(() => {});
    api.designations().then((d) => setDesignations(d.designations || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const buildParams = useCallback(
    (pageNum) => {
      const params = { page: String(pageNum), limit: String(PAGE_SIZE) };
      if (debouncedSearch) params.search = debouncedSearch;
      if (department !== "all") params.department = department;
      if (designation !== "all") params.designation = designation;
      if (status !== "all") params.status = status;
      if (employeeCategory !== "all") params.employeeCategory = employeeCategory;
      return params;
    },
    [debouncedSearch, department, designation, status, employeeCategory]
  );

  const fetchPage = useCallback(
    async (pageNum, append) => {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const data = await api.employees(buildParams(pageNum));
        const rows = data.employees || [];
        setEmployees((prev) => (append ? [...prev, ...rows] : rows));
        setTotal(data.pagination?.total ?? rows.length);
        setHasMore(!!data.pagination?.hasMore);
        setPage(pageNum);
      } catch (err) {
        if (!append) {
          setEmployees([]);
          setTotal(0);
        }
        toast.error(err?.message || "Failed to load employees");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [buildParams]
  );

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore) return;
    fetchPage(page + 1, true);
  }, [hasMore, loading, loadingMore, page, fetchPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "120px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleTableScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      loadMore();
    }
  };

  const statusVariant = (s) => {
    if (s === "Active") return "success";
    if (s === "On Leave") return "warning";
    if (s === "On Hold") return "warning";
    if (s === "Inactive" || s === "Terminated") return "secondary";
    return "secondary";
  };

  const statusAccent = (s) => {
    if (s === "Active") return "from-emerald-500 to-emerald-600";
    if (s === "On Leave") return "from-amber-500 to-amber-600";
    if (s === "On Hold") return "from-amber-500 to-amber-600";
    return "from-slate-400 to-slate-500";
  };

  const handleDownloadTemplate = async () => {
    try {
      await api.downloadEmployeeBulkTemplate();
      toast.success("Template downloaded");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteEmployee(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted successfully`);
      setDeleteTarget(null);
      setEmployees((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error("Please select an Excel file");
      return;
    }
    setUploading(true);
    try {
      const result = await api.bulkUploadEmployees(bulkFile);
      setUploadResult(result);
      setBulkOpen(false);
      setBulkFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setResultOpen(true);
      if (result.summary?.success > 0) {
        fetchPage(1, false);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const EmployeeActions = ({ emp }) => (
    <div className="flex gap-1">
      <Link href={`/employees/${emp.id}`}>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Eye className="h-4 w-4" />
        </Button>
      </Link>
      {canManageEmployees && (
        <>
          <Link href={`/employees/add?edit=${emp.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => setDeleteTarget(emp)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Employee Management</h1>
          <p className="text-muted-foreground">Manage and view all employees</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageEmployees && (
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <Upload className="h-4 w-4" /> Bulk Upload
            </Button>
          )}
          {canManageEmployees && (
            <Link href="/employees/add">
              <Button variant="premium">
                <Plus className="h-4 w-4" /> Add Employee
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Upload Employees</DialogTitle>
            <DialogDescription>
              Upload an Excel file with employee details. Required columns: Employee Code, First Name, Email, Mobile, Department, Designation, Joining Date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button variant="outline" className="w-full" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Download Excel Template
            </Button>
            <div className="rounded-lg border border-dashed p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-royal file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
                onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
              />
              {bulkFile && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Selected: <span className="font-medium text-foreground">{bulkFile.name}</span>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button variant="premium" onClick={handleBulkUpload} disabled={uploading || !bulkFile}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">{deleteTarget?.name}</span>
              ({deleteTarget?.employeeCode})? This will permanently remove the employee and all related records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEmployee} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Results</DialogTitle>
            <DialogDescription>Summary of the bulk employee upload</DialogDescription>
          </DialogHeader>
          {uploadResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-2xl font-bold">{uploadResult.summary?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total Rows</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
                  <p className="flex items-center justify-center gap-1 text-2xl font-bold text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                    {uploadResult.summary?.success ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Uploaded</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
                  <p className="flex items-center justify-center gap-1 text-2xl font-bold text-red-600">
                    <XCircle className="h-5 w-5" />
                    {uploadResult.summary?.failed ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>

              {uploadResult.failures?.length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1 text-sm font-medium text-amber-600">
                    <AlertCircle className="h-4 w-4" /> Failed rows &amp; mistakes
                  </p>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-2">
                    {uploadResult.failures.map((item, idx) => (
                      <div key={idx} className="rounded-md bg-muted/40 p-2 text-sm">
                        <p className="font-medium">
                          Row {item.row}
                          {item.employeeCode ? ` — ${item.employeeCode}` : ""}
                          {item.name ? ` (${item.name})` : ""}
                        </p>
                        <ul className="mt-1 list-inside list-disc text-xs text-red-600">
                          {(item.errors || []).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploadResult.summary?.success > 0 && (
                <p className="text-sm text-emerald-600">
                  {uploadResult.summary.success} employee(s) added successfully and visible in the list.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResultOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by Code, Name, Mobile, Department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid w-full grid-cols-1 gap-2 min-[480px]:grid-cols-2 sm:flex sm:flex-wrap lg:w-auto">
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.departmentName}>{d.departmentName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={designation} onValueChange={setDesignation}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Designation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Designations</SelectItem>
                  {designations.map((d) => (
                    <SelectItem key={d.id} value={d.designationName}>{d.designationName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_LIST_STATUS_FILTERS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={employeeCategory} onValueChange={setEmployeeCategory}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Fresher">Fresher</SelectItem>
                  <SelectItem value="Experienced">Experienced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && employees.length === 0 ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-royal border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="space-y-4 lg:hidden">
                {employees.map((emp, i) => (
                  <motion.div
                    key={emp.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  >
                    <Card className="glass-card overflow-hidden">
                      <div className={`h-2 bg-gradient-to-r ${statusAccent(emp.status)}`} />
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Image
                              src={emp.photo}
                              alt={emp.name}
                              width={48}
                              height={48}
                              className="h-12 w-12 shrink-0 rounded-full border-2 border-background object-cover"
                              unoptimized
                            />
                            <div className="min-w-0">
                              <CardTitle className="truncate text-base">{emp.name}</CardTitle>
                              <p className="mt-0.5 font-mono text-xs text-muted-foreground">{emp.employeeCode}</p>
                            </div>
                          </div>
                          <Badge variant={statusVariant(emp.status)} className="shrink-0">
                            {emp.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Department</p>
                            <p className="font-medium">{emp.department || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Designation</p>
                            <p className="font-medium">{emp.designation || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Category</p>
                            <p className="font-medium">{emp.employeeCategory || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Experience</p>
                            <p className="font-medium">{emp.experienceSummary || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mobile</p>
                            <p className="font-medium">{emp.mobile || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Joined</p>
                            <p className="font-medium">{emp.joiningDate ? formatDate(emp.joiningDate) : "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t pt-3">
                          <Link href={`/employees/${emp.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="mr-1 h-3.5 w-3.5" /> View Profile
                            </Button>
                          </Link>
                          <EmployeeActions emp={emp} />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                {employees.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">No employees found</div>
                )}
              </div>

              <div
                ref={tableScrollRef}
                onScroll={handleTableScroll}
                className="hidden max-h-[min(32rem,55vh)] overflow-auto rounded-lg border lg:block"
              >
                <table className="w-full min-w-[1000px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left font-medium backdrop-blur-sm">Photo</th>
                      <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left font-medium backdrop-blur-sm">Employee ID</th>
                      <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left font-medium backdrop-blur-sm">Name</th>
                      <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left font-medium backdrop-blur-sm">Category</th>
                      <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left font-medium backdrop-blur-sm">Experience</th>
                      <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left font-medium backdrop-blur-sm">Department</th>
                      <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left font-medium backdrop-blur-sm">Designation</th>
                      <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left font-medium backdrop-blur-sm">Mobile</th>
                      <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left font-medium backdrop-blur-sm">Joining</th>
                      <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left font-medium backdrop-blur-sm">Status</th>
                      <th className="sticky top-0 z-10 bg-muted/95 px-4 py-3 text-left font-medium backdrop-blur-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp, i) => (
                      <motion.tr
                        key={emp.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <Image src={emp.photo} alt={emp.name} width={36} height={36} className="rounded-full" unoptimized />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{emp.employeeCode}</td>
                        <td className="px-4 py-3 font-medium">{emp.name}</td>
                        <td className="px-4 py-3">{emp.employeeCategory || "—"}</td>
                        <td className="px-4 py-3">{emp.experienceSummary || "—"}</td>
                        <td className="px-4 py-3">{emp.department}</td>
                        <td className="px-4 py-3">{emp.designation}</td>
                        <td className="px-4 py-3">{emp.mobile}</td>
                        <td className="px-4 py-3">{formatDate(emp.joiningDate)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant(emp.status)}>{emp.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <EmployeeActions emp={emp} />
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {employees.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">No employees found</div>
                )}
              </div>

              <div ref={sentinelRef} className="h-1" aria-hidden />

              {loadingMore && (
                <div className="flex justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-royal border-t-transparent" />
                </div>
              )}
            </>
          )}

          <p className="mt-4 text-sm text-muted-foreground">
            Showing {employees.length} of {total} employees
            {hasMore ? " — scroll for more" : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-royal border-t-transparent" /></div>}>
      <EmployeeListContent />
    </Suspense>
  );
}
