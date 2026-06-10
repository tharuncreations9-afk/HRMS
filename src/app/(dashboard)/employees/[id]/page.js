"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Phone, Building, Calendar, FileText, Download, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

function toEditForm(emp) {
  if (!emp) return {};
  return {
    employeeCode: emp.employeeCode || "",
    firstName: emp.firstName || "",
    lastName: emp.lastName || "",
    dob: emp.dob || "",
    gender: emp.gender || "",
    bloodGroup: emp.bloodGroup || "",
    mobile: emp.mobile || "",
    alternateMobile: emp.alternateMobile || "",
    email: emp.email || "",
    address: emp.address || "",
    emergencyContact: emp.emergencyContact || "",
    departmentId: emp.departmentId ? String(emp.departmentId) : "",
    designationId: emp.designationId ? String(emp.designationId) : "",
    roleId: emp.roleId ? String(emp.roleId) : "",
    reportingManagerId: emp.reportingManagerId ? String(emp.reportingManagerId) : "none",
    joiningDate: emp.joiningDate || "",
    employmentType: emp.employmentTypeValue || "Full_Time",
    status: emp.statusValue || "Active",
    pan: emp.pan || "",
    aadhaar: emp.aadhaar || "",
    bankName: emp.bankName || "",
    accountNumber: emp.accountNumber || "",
  };
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] break-words">{value || "—"}</span>
    </div>
  );
}

function EditField({ label, children, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function EmployeeProfilePage() {
  const params = useParams();
  const [employee, setEmployee] = useState(null);
  const [lookups, setLookups] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setEditForm((f) => ({ ...f, [field]: value }));

  useEffect(() => {
    api.employee(params.id).then((data) => {
      setEmployee(data.employee);
      setLookups(data.lookups || null);
      setAttendance(data.attendance || []);
      setLeaves(data.leaves || []);
      setDocuments(data.documents || []);
      setActivityLogs(data.activityLogs || []);
      setEditForm(toEditForm(data.employee));
    }).catch(() => {});
  }, [params.id]);

  if (!employee) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-royal border-t-transparent" />
      </div>
    );
  }

  const statusColor =
    employee.status === "Active" ? "success" : employee.status?.includes("Hold") ? "warning" : "secondary";

  const handleCancel = () => {
    setEditForm(toEditForm(employee));
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...editForm,
        reportingManagerId:
          editForm.reportingManagerId === "none" ? null : editForm.reportingManagerId,
      };
      const { employee: updated } = await api.updateEmployee(params.id, payload);
      setEmployee(updated);
      setEditForm(toEditForm(updated));
      setEditing(false);
      const data = await api.employee(params.id);
      setLookups(data.lookups || null);
      setActivityLogs(data.activityLogs || []);
      toast.success("Employee updated successfully");
    } catch (err) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/employees">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Employee Profile</h1>
          <p className="text-muted-foreground">Employee ID: {employee.employeeCode}</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-card overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-navy to-royal" />
          <CardContent className="relative px-6 pb-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:flex-wrap">
              <Image
                src={employee.photo}
                alt={employee.name}
                width={96}
                height={96}
                className="-mt-12 rounded-2xl border-4 border-background shadow-lg"
                unoptimized
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold">
                    {editing
                      ? `${editForm.firstName || ""} ${editForm.lastName || ""}`.trim() || employee.name
                      : employee.name}
                  </h2>
                  <Badge variant={statusColor}>
                    {editing
                      ? String(editForm.status || "").replace("_", " ")
                      : employee.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {employee.designation} · {employee.department}
                </p>
              </div>
              {editing ? (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button variant="premium" className="w-full sm:w-auto" onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              ) : (
                <Button variant="premium" className="w-full sm:w-auto" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Mail, label: "Email", value: editing ? editForm.email : employee.email },
                { icon: Phone, label: "Mobile", value: editing ? editForm.mobile : employee.mobile },
                { icon: Building, label: "Department", value: employee.department },
                {
                  icon: Calendar,
                  label: "Joined",
                  value: editing && editForm.joiningDate
                    ? formatDate(editForm.joiningDate)
                    : formatDate(employee.joiningDate),
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-lg border p-3">
                  <item.icon className="h-4 w-4 text-royal" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="glass-card w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="glass-card">
              <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
              <CardContent className={editing ? "grid gap-4 sm:grid-cols-2" : "space-y-3"}>
                {editing ? (
                  <>
                    <EditField label="First Name">
                      <Input value={editForm.firstName} onChange={(e) => set("firstName", e.target.value)} />
                    </EditField>
                    <EditField label="Last Name">
                      <Input value={editForm.lastName} onChange={(e) => set("lastName", e.target.value)} />
                    </EditField>
                    <EditField label="Date of Birth">
                      <Input type="date" value={editForm.dob} onChange={(e) => set("dob", e.target.value)} />
                    </EditField>
                    <EditField label="Gender">
                      <Select value={editForm.gender || ""} onValueChange={(v) => set("gender", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </EditField>
                    <EditField label="Blood Group">
                      <Select value={editForm.bloodGroup || ""} onValueChange={(v) => set("bloodGroup", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                            <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </EditField>
                    <EditField label="Emergency Contact">
                      <Input
                        value={editForm.emergencyContact}
                        onChange={(e) => set("emergencyContact", e.target.value)}
                      />
                    </EditField>
                    <EditField label="Mobile" className="sm:col-span-2">
                      <Input value={editForm.mobile} onChange={(e) => set("mobile", e.target.value)} />
                    </EditField>
                    <EditField label="Alternate Mobile" className="sm:col-span-2">
                      <Input
                        value={editForm.alternateMobile}
                        onChange={(e) => set("alternateMobile", e.target.value)}
                      />
                    </EditField>
                    <EditField label="Email" className="sm:col-span-2">
                      <Input type="email" value={editForm.email} onChange={(e) => set("email", e.target.value)} />
                    </EditField>
                    <EditField label="Address" className="sm:col-span-2">
                      <Textarea
                        value={editForm.address}
                        onChange={(e) => set("address", e.target.value)}
                        rows={3}
                      />
                    </EditField>
                  </>
                ) : (
                  <>
                    <DetailRow label="First Name" value={employee.firstName} />
                    <DetailRow label="Last Name" value={employee.lastName} />
                    <DetailRow label="Date of Birth" value={employee.dob ? formatDate(employee.dob) : ""} />
                    <DetailRow label="Gender" value={employee.gender} />
                    <DetailRow label="Blood Group" value={employee.bloodGroup} />
                    <DetailRow label="Mobile" value={employee.mobile} />
                    <DetailRow label="Alternate Mobile" value={employee.alternateMobile} />
                    <DetailRow label="Email" value={employee.email} />
                    <DetailRow label="Emergency Contact" value={employee.emergencyContact} />
                    <DetailRow label="Address" value={employee.address} />
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader><CardTitle>Employment Details</CardTitle></CardHeader>
              <CardContent className={editing ? "grid gap-4 sm:grid-cols-2" : "space-y-3"}>
                {editing ? (
                  <>
                    <EditField label="Employee ID" className="sm:col-span-2">
                      <Input
                        value={editForm.employeeCode}
                        onChange={(e) => set("employeeCode", e.target.value)}
                      />
                    </EditField>
                    <EditField label="Department">
                      <Select value={editForm.departmentId} onValueChange={(v) => set("departmentId", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {(lookups?.departments || []).map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>{d.departmentName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </EditField>
                    <EditField label="Designation">
                      <Select value={editForm.designationId} onValueChange={(v) => set("designationId", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {(lookups?.designations || []).map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>{d.designationName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </EditField>
                    <EditField label="Role">
                      <Select value={editForm.roleId} onValueChange={(v) => set("roleId", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {(lookups?.roles || []).map((r) => (
                            <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </EditField>
                    <EditField label="Reporting Manager">
                      <Select
                        value={editForm.reportingManagerId}
                        onValueChange={(v) => set("reportingManagerId", v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {(lookups?.managers || []).map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.fullName} ({m.employeeCode})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </EditField>
                    <EditField label="Joining Date">
                      <Input
                        type="date"
                        value={editForm.joiningDate}
                        onChange={(e) => set("joiningDate", e.target.value)}
                      />
                    </EditField>
                    <EditField label="Employment Type">
                      <Select value={editForm.employmentType} onValueChange={(v) => set("employmentType", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full_Time">Full Time</SelectItem>
                          <SelectItem value="Part_Time">Part Time</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                          <SelectItem value="Intern">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                    </EditField>
                    <EditField label="Status" className="sm:col-span-2">
                      <Select value={editForm.status} onValueChange={(v) => set("status", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Resigned">Resigned</SelectItem>
                          <SelectItem value="On_Hold">On Hold</SelectItem>
                          <SelectItem value="Terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    </EditField>
                  </>
                ) : (
                  <>
                    <DetailRow label="Employee ID" value={employee.employeeCode} />
                    <DetailRow label="Department" value={employee.department} />
                    <DetailRow label="Designation" value={employee.designation} />
                    <DetailRow label="Role" value={employee.roleName} />
                    <DetailRow label="Reporting Manager" value={employee.reportingManager} />
                    <DetailRow
                      label="Joining Date"
                      value={employee.joiningDate ? formatDate(employee.joiningDate) : ""}
                    />
                    <DetailRow label="Employment Type" value={employee.employmentType} />
                    <DetailRow label="Status" value={employee.status} />
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card lg:col-span-2">
              <CardHeader><CardTitle>Bank & Identification</CardTitle></CardHeader>
              <CardContent className={editing ? "grid gap-4 sm:grid-cols-2" : "space-y-3"}>
                {editing ? (
                  <>
                    <EditField label="PAN">
                      <Input value={editForm.pan} onChange={(e) => set("pan", e.target.value)} />
                    </EditField>
                    <EditField label="Aadhaar">
                      <Input value={editForm.aadhaar} onChange={(e) => set("aadhaar", e.target.value)} />
                    </EditField>
                    <EditField label="Bank Name">
                      <Input value={editForm.bankName} onChange={(e) => set("bankName", e.target.value)} />
                    </EditField>
                    <EditField label="Account Number">
                      <Input
                        value={editForm.accountNumber}
                        onChange={(e) => set("accountNumber", e.target.value)}
                      />
                    </EditField>
                  </>
                ) : (
                  <>
                    <DetailRow label="PAN" value={employee.pan} />
                    <DetailRow label="Aadhaar" value={employee.aadhaar} />
                    <DetailRow label="Bank Name" value={employee.bankName} />
                    <DetailRow label="Account Number" value={employee.accountNumber} />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <Card className="glass-card">
            <CardHeader><CardTitle>Recent Attendance</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">In Time</th>
                      <th className="px-4 py-3 text-left">Out Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record) => (
                      <tr key={record.date} className="border-b">
                        <td className="px-4 py-3">{formatDate(record.date)}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              record.status === "Present"
                                ? "success"
                                : record.status === "Late"
                                  ? "warning"
                                  : "destructive"
                            }
                          >
                            {record.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{record.inTime}</td>
                        <td className="px-4 py-3">{record.outTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves">
          <Card className="glass-card">
            <CardHeader><CardTitle>Leave History</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaves.map((leave, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{leave.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(leave.from)} - {formatDate(leave.to)} ({leave.days} days)
                      </p>
                    </div>
                    <Badge variant="success">{leave.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="glass-card">
            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {(documents.length
                  ? documents
                  : [
                      { name: "PAN Card", fileName: employee.pan || "Not uploaded" },
                      { name: "Aadhaar Card", fileName: employee.aadhaar || "Not uploaded" },
                      {
                        name: "Bank Details",
                        fileName: `${employee.bankName || ""} - ${employee.accountNumber || ""}`,
                      },
                    ]
                ).map((doc) => (
                  <div key={doc.name} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-royal" />
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.fileName || doc.id}</p>
                      </div>
                    </div>
                    {doc.url ? (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" download>
                        <Button variant="ghost" size="icon" type="button">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    ) : (
                      <Button variant="ghost" size="icon" disabled>
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="glass-card">
            <CardHeader><CardTitle>Audit History</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLogs.map((log, i) => (
                  <div key={i} className="flex gap-4 border-l-2 border-royal pl-4">
                    <div>
                      <p className="font-medium">{log.action}</p>
                      <p className="text-sm text-muted-foreground">{log.details}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        by {log.by} · {formatDate(log.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
