"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Calendar,
  FileText,
  Download,
  Save,
  Upload,
  Camera,
} from "lucide-react";
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
import { useAuth } from "@/context/auth-context";
import { useLookups } from "@/hooks/use-lookups";

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;

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
    skills: emp.skills || "",
  };
}

function DocLink({ label, url }) {
  if (!url) return <DetailRow label={label} value="" />;
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-sm font-medium text-royal hover:underline"
      >
        <Download className="h-3.5 w-3.5" /> View / Download
      </a>
    </div>
  );
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
  const { user, hasPermission } = useAuth();
  const photoInputRef = useRef(null);

  const [employee, setEmployee] = useState(null);
  const [lookups, setLookups] = useState(null);
  const { lookups: formLookups } = useLookups();
  const [canEdit, setCanEdit] = useState(false);
  const [editScope, setEditScope] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null);

  const isFullEdit = editScope === "full";
  const isOwnProfile = user?.id === Number(params.id);
  const backHref = hasPermission("Employee Management") ? "/employees" : "/dashboard";

  const set = (field, value) => setEditForm((f) => ({ ...f, [field]: value }));

  const loadProfile = () => {
    return api.employee(params.id).then((data) => {
      setEmployee(data.employee);
      setLookups(data.lookups || null);
      setCanEdit(Boolean(data.canEdit));
      setEditScope(data.editScope || null);
      setAttendance(data.attendance || []);
      setLeaves(data.leaves || []);
      setDocuments(data.documents || []);
      setActivityLogs(data.activityLogs || []);
      setEditForm(toEditForm(data.employee));
      setPhotoPreview(data.employee?.photo || null);
      setPendingPhoto(null);
    });
  };

  useEffect(() => {
    loadProfile().catch(() => {});
  }, [params.id]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      toast.error("Only JPG and PNG photos are allowed");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      toast.error("Photo must be under 2MB");
      return;
    }
    setPendingPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleCancel = () => {
    setEditForm(toEditForm(employee));
    setPhotoPreview(employee?.photo || null);
    setPendingPhoto(null);
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let profilePhotoUrl = employee.photo;

      if (pendingPhoto) {
        const { document } = await api.uploadEmployeeDocument(
          params.id,
          "Other",
          pendingPhoto
        );
        profilePhotoUrl = document?.url || profilePhotoUrl;
      }

      const payload = {
        ...editForm,
        profilePhoto: profilePhotoUrl,
        reportingManagerId:
          editForm.reportingManagerId === "none" ? null : editForm.reportingManagerId,
      };

      const { employee: updated } = await api.updateEmployee(params.id, payload);
      setEmployee(updated);
      setEditForm(toEditForm(updated));
      setPhotoPreview(updated.photo);
      setPendingPhoto(null);
      setEditing(false);

      const data = await api.employee(params.id);
      setLookups(data.lookups || null);
      setActivityLogs(data.activityLogs || []);

      if (isOwnProfile) {
        try {
          const { user: freshUser } = await api.me();
          localStorage.setItem("emp_user", JSON.stringify(freshUser));
        } catch {
          /* ignore */
        }
      }

      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  if (!employee) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-royal border-t-transparent" />
      </div>
    );
  }

  const statusColor =
    employee.status === "Active"
      ? "success"
      : employee.status === "On Leave"
        ? "warning"
        : employee.status?.includes("Hold")
          ? "warning"
          : "secondary";

  const displayPhoto = photoPreview || employee.photo;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={backHref}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{isOwnProfile ? "My Profile" : "Employee Profile"}</h1>
          <p className="text-muted-foreground">Employee ID: {employee.employeeCode}</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-card overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-navy to-royal" />
          <CardContent className="relative px-4 pb-6 sm:px-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:flex-wrap">
              <div className="relative -mt-12 shrink-0">
                <Image
                  src={displayPhoto}
                  alt={employee.name}
                  width={96}
                  height={96}
                  className="rounded-2xl border-4 border-background shadow-lg object-cover"
                  unoptimized
                />
                {editing && (
                  <div className="mt-2 flex flex-col gap-1">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={handlePhotoSelect}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      className="w-full"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {pendingPhoto ? "Change Photo" : "Update Photo"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">JPG/PNG, max 2MB</p>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold break-words">
                    {editing
                      ? `${editForm.firstName || ""} ${editForm.lastName || ""}`.trim() || employee.name
                      : employee.name}
                  </h2>
                  <Badge variant={statusColor}>
                    {editing && isFullEdit
                      ? String(editForm.status || "").replace("_", " ")
                      : employee.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {employee.designation} · {employee.department}
                </p>
              </div>
              {canEdit && (
                editing ? (
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
                    <Upload className="h-4 w-4" /> Edit Profile
                  </Button>
                )
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
                  value: editing && isFullEdit && editForm.joiningDate
                    ? formatDate(editForm.joiningDate)
                    : formatDate(employee.joiningDate),
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-lg border p-3">
                  <item.icon className="h-4 w-4 shrink-0 text-royal" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium truncate">{item.value}</p>
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
          {isFullEdit && <TabsTrigger value="activity">Activity Logs</TabsTrigger>}
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
                          {(formLookups?.genders || []).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </EditField>
                    <EditField label="Blood Group">
                      <Select value={editForm.bloodGroup || ""} onValueChange={(v) => set("bloodGroup", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {(formLookups?.bloodGroups || []).map((bg) => (
                            <SelectItem key={bg.value} value={bg.value}>{bg.label}</SelectItem>
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
                    {!isFullEdit && (
                      <EditField label="Skills" className="sm:col-span-2">
                        <Textarea
                          value={editForm.skills}
                          onChange={(e) => set("skills", e.target.value)}
                          rows={2}
                        />
                      </EditField>
                    )}
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
                    {employee.skills && <DetailRow label="Skills" value={employee.skills} />}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader><CardTitle>Employment Details</CardTitle></CardHeader>
              <CardContent className={editing && isFullEdit ? "grid gap-4 sm:grid-cols-2" : "space-y-3"}>
                {editing && isFullEdit ? (
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
                          {(formLookups?.employmentTypes || []).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </EditField>
                    <EditField label="Status" className="sm:col-span-2">
                      <Select value={editForm.status} onValueChange={(v) => set("status", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(formLookups?.employeeStatuses || []).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
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
                    <DetailRow label="Employment Status" value={employee.employmentStatus} />
                    <DetailRow label="Current Status" value={employee.status} />
                    <DetailRow label="Employee Category" value={employee.employeeCategory} />
                  </>
                )}
              </CardContent>
            </Card>

            {employee.employeeCategory === "Fresher" && !editing && (
              <Card className="glass-card">
                <CardHeader><CardTitle>Education</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow label="Highest Qualification" value={employee.qualification} />
                  <DetailRow label="College / University" value={employee.collegeName} />
                  <DetailRow label="Specialization" value={employee.specialization} />
                  <DetailRow label="Graduation Year" value={employee.graduationYear} />
                  <DetailRow label="Percentage / CGPA" value={employee.cgpa} />
                  <DetailRow label="Internship Experience" value={employee.internshipDetails} />
                  <DetailRow label="Skills" value={employee.skills} />
                  <DetailRow label="Certifications" value={employee.certifications} />
                </CardContent>
              </Card>
            )}

            {employee.employeeCategory === "Experienced" && !editing && (
              <Card className="glass-card">
                <CardHeader><CardTitle>Experience History</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow label="Total Experience" value={employee.experienceSummary} />
                  <DetailRow label="Previous Company" value={employee.previousCompany} />
                  <DetailRow label="Previous Designation" value={employee.previousDesignation} />
                  <DetailRow label="Previous CTC" value={employee.previousCtc != null ? `₹${employee.previousCtc}` : ""} />
                  <DetailRow label="Expected CTC" value={employee.expectedCtc != null ? `₹${employee.expectedCtc}` : ""} />
                  <DetailRow
                    label="Last Working Date"
                    value={employee.lastWorkingDate ? formatDate(employee.lastWorkingDate) : ""}
                  />
                  <DetailRow label="Notice Period" value={employee.noticePeriod} />
                  <DetailRow label="Relevant Experience" value={employee.relevantExperience} />
                  <DetailRow label="Skills" value={employee.skills} />
                  <DocLink label="Experience Letter" url={employee.experienceLetterUrl} />
                  <DocLink label="Relieving Letter" url={employee.relievingLetterUrl} />
                  {(employee.payslipUrls || []).map((url, i) => (
                    <DocLink key={url} label={`Payslip ${i + 1}`} url={url} />
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="glass-card lg:col-span-2">
              <CardHeader><CardTitle>Bank Details</CardTitle></CardHeader>
              <CardContent className={editing ? "grid gap-4 sm:grid-cols-2" : "space-y-3"}>
                {editing ? (
                  <>
                    <EditField label="Bank Name">
                      <Input value={editForm.bankName} onChange={(e) => set("bankName", e.target.value)} />
                    </EditField>
                    <EditField label="Account Number">
                      <Input
                        value={editForm.accountNumber}
                        onChange={(e) => set("accountNumber", e.target.value)}
                      />
                    </EditField>
                    {isFullEdit && (
                      <>
                        <EditField label="PAN">
                          <Input value={editForm.pan} onChange={(e) => set("pan", e.target.value)} />
                        </EditField>
                        <EditField label="Aadhaar">
                          <Input value={editForm.aadhaar} onChange={(e) => set("aadhaar", e.target.value)} />
                        </EditField>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <DetailRow label="Bank Name" value={employee.bankName} />
                    <DetailRow label="Account Number" value={employee.accountNumber} />
                    {isFullEdit && (
                      <>
                        <DetailRow label="PAN" value={employee.pan} />
                        <DetailRow label="Aadhaar" value={employee.aadhaar} />
                      </>
                    )}
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
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-8 w-8 shrink-0 text-royal" />
                      <div className="min-w-0">
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{doc.fileName || doc.id}</p>
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

        {isFullEdit && (
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
        )}
      </Tabs>
    </div>
  );
}
