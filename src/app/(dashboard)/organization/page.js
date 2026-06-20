"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Building2, Briefcase, Plus, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { ListPagination } from "@/components/ui/list-pagination";
import { useLookups } from "@/hooks/use-lookups";
import { toast } from "sonner";

function canAccessOrg(hasPermission) {
  return hasPermission("Department Management") || hasPermission("Employee Management");
}

export default function OrganizationPage() {
  const router = useRouter();
  const { user, isLoading, hasPermission } = useAuth();
  const canManage = canAccessOrg(hasPermission);

  const { lookups } = useLookups();
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deptPage, setDeptPage] = useState(1);
  const [deptLimit, setDeptLimit] = useState(null);
  const [deptPagination, setDeptPagination] = useState(null);
  const [desigPage, setDesigPage] = useState(1);
  const [desigLimit, setDesigLimit] = useState(null);
  const [desigPagination, setDesigPagination] = useState(null);

  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [desigDialogOpen, setDesigDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [editingDesig, setEditingDesig] = useState(null);
  const [deptForm, setDeptForm] = useState({ departmentName: "", departmentCode: "" });
  const [desigForm, setDesigForm] = useState({ designationName: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && user && !canAccessOrg(hasPermission)) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router, hasPermission]);

  useEffect(() => {
    if (lookups?.pagination?.defaultLimit) {
      if (deptLimit === null) setDeptLimit(lookups.pagination.defaultLimit);
      if (desigLimit === null) setDesigLimit(lookups.pagination.defaultLimit);
    }
  }, [lookups, deptLimit, desigLimit]);

  const loadData = useCallback(() => {
    if (!deptLimit || !desigLimit) return;
    setLoading(true);
    Promise.all([
      api.departments({ page: String(deptPage), limit: String(deptLimit) }),
      api.designations({ page: String(desigPage), limit: String(desigLimit) }),
    ])
      .then(([deptRes, desigRes]) => {
        setDepartments(deptRes.departments || []);
        setDesignations(desigRes.designations || []);
        setDeptPagination(deptRes.pagination || null);
        setDesigPagination(desigRes.pagination || null);
      })
      .catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, [deptPage, deptLimit, desigPage, desigLimit]);

  useEffect(() => {
    if (!user || !canAccessOrg(hasPermission)) return;
    loadData();
  }, [user, hasPermission, loadData]);

  const openDeptDialog = (dept = null) => {
    setEditingDept(dept);
    setDeptForm(
      dept
        ? { departmentName: dept.departmentName, departmentCode: dept.departmentCode }
        : { departmentName: "", departmentCode: "" }
    );
    setDeptDialogOpen(true);
  };

  const openDesigDialog = (desig = null) => {
    setEditingDesig(desig);
    setDesigForm(desig ? { designationName: desig.designationName } : { designationName: "" });
    setDesigDialogOpen(true);
  };

  const handleSaveDept = async () => {
    if (!deptForm.departmentName.trim() || !deptForm.departmentCode.trim()) {
      toast.error("Department name and code are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        departmentName: deptForm.departmentName.trim(),
        departmentCode: deptForm.departmentCode.trim().toUpperCase(),
      };
      if (editingDept) {
        await api.updateDepartment(editingDept.id, payload);
        toast.success("Department updated");
      } else {
        await api.createDepartment(payload);
        toast.success("Department created");
      }
      setDeptDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDesig = async () => {
    if (!desigForm.designationName.trim()) {
      toast.error("Designation name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = { designationName: desigForm.designationName.trim() };
      if (editingDesig) {
        await api.updateDesignation(editingDesig.id, payload);
        toast.success("Designation updated");
      } else {
        await api.createDesignation(payload);
        toast.success("Designation created");
      }
      setDesigDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-royal border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold lg:text-3xl">Departments & Designations</h1>
        <p className="text-muted-foreground">Manage organization departments and job designations</p>
      </div>

      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" /> Departments
          </TabsTrigger>
          <TabsTrigger value="designations" className="gap-2">
            <Briefcase className="h-4 w-4" /> Designations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Departments</CardTitle>
              {canManage && (
                <Button variant="premium" size="sm" onClick={() => openDeptDialog()}>
                  <Plus className="h-4 w-4" /> Add Department
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-royal border-t-transparent" />
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium">Name</th>
                        <th className="px-4 py-3 text-left font-medium">Code</th>
                        <th className="px-4 py-3 text-left font-medium">Employees</th>
                        {canManage && <th className="px-4 py-3 text-right font-medium">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((dept) => (
                        <tr key={dept.id} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{dept.departmentName}</td>
                          <td className="px-4 py-3 font-mono text-xs">{dept.departmentCode}</td>
                          <td className="px-4 py-3">{dept._count?.employees ?? 0}</td>
                          {canManage && (
                            <td className="px-4 py-3 text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeptDialog(dept)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {departments.length === 0 && (
                    <p className="py-8 text-center text-muted-foreground">No departments yet</p>
                  )}
                </div>
              )}
              <ListPagination
                page={deptPagination?.page || deptPage}
                totalPages={deptPagination?.totalPages || 0}
                total={deptPagination?.total || 0}
                from={deptPagination?.from || 0}
                to={deptPagination?.to || 0}
                limit={deptPagination?.limit || deptLimit}
                pageSizeOptions={deptPagination?.pageSizeOptions || lookups?.pagination?.pageSizeOptions || []}
                loading={loading}
                onPageChange={setDeptPage}
                onLimitChange={setDeptLimit}
                className="mt-4"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="designations">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Designations</CardTitle>
              {canManage && (
                <Button variant="premium" size="sm" onClick={() => openDesigDialog()}>
                  <Plus className="h-4 w-4" /> Add Designation
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-royal border-t-transparent" />
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[400px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium">Name</th>
                        <th className="px-4 py-3 text-left font-medium">Employees</th>
                        {canManage && <th className="px-4 py-3 text-right font-medium">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {designations.map((desig) => (
                        <tr key={desig.id} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{desig.designationName}</td>
                          <td className="px-4 py-3">{desig._count?.employees ?? 0}</td>
                          {canManage && (
                            <td className="px-4 py-3 text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDesigDialog(desig)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {designations.length === 0 && (
                    <p className="py-8 text-center text-muted-foreground">No designations yet</p>
                  )}
                </div>
              )}
              <ListPagination
                page={desigPagination?.page || desigPage}
                totalPages={desigPagination?.totalPages || 0}
                total={desigPagination?.total || 0}
                from={desigPagination?.from || 0}
                to={desigPagination?.to || 0}
                limit={desigPagination?.limit || desigLimit}
                pageSizeOptions={desigPagination?.pageSizeOptions || lookups?.pagination?.pageSizeOptions || []}
                loading={loading}
                onPageChange={setDesigPage}
                onLimitChange={setDesigLimit}
                className="mt-4"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? "Edit Department" : "Add Department"}</DialogTitle>
            <DialogDescription>Department name and unique code (e.g. ENG, HR)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deptName">Department Name</Label>
              <Input
                id="deptName"
                placeholder="e.g. Engineering"
                value={deptForm.departmentName}
                onChange={(e) => setDeptForm((f) => ({ ...f, departmentName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deptCode">Department Code</Label>
              <Input
                id="deptCode"
                placeholder="e.g. ENG"
                value={deptForm.departmentCode}
                onChange={(e) => setDeptForm((f) => ({ ...f, departmentCode: e.target.value.toUpperCase() }))}
                maxLength={20}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="premium" onClick={handleSaveDept} disabled={saving}>
              {saving ? "Saving..." : editingDept ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={desigDialogOpen} onOpenChange={setDesigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDesig ? "Edit Designation" : "Add Designation"}</DialogTitle>
            <DialogDescription>Job title or role name used when adding employees</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="desigName">Designation Name</Label>
            <Input
              id="desigName"
              placeholder="e.g. Software Engineer"
              value={desigForm.designationName}
              onChange={(e) => setDesigForm({ designationName: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDesigDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="premium" onClick={handleSaveDesig} disabled={saving}>
              {saving ? "Saving..." : editingDesig ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
