"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Save, ChevronRight, ChevronLeft, Check } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { validateEmployeeCategory } from "@/lib/employee-category";
import {
  validateEmployeeForm,
  buildEmployeeApiPayload,
  mapCategoryErrorsToFields,
} from "@/lib/employee-validation";
import { isValidEmail } from "@/lib/auth-validation";
import { useAuth } from "@/context/auth-context";
import { useLookups } from "@/hooks/use-lookups";

const sections = [
  { id: "personal", title: "Personal Information" },
  { id: "employment", title: "Employment Information" },
  { id: "category", title: "Education / Experience" },
  { id: "contact", title: "Contact Information" },
  { id: "documents", title: "Documents" },
];

const DOCUMENT_UPLOADS = [
  { label: "PAN Card", type: "PAN" },
  { label: "Aadhaar Card", type: "Aadhaar" },
  { label: "Bank Passbook", type: "Bank_Passbook" },
  { label: "Offer Letter", type: "Offer_Letter" },
];

const EXPERIENCE_DOC_UPLOADS = [
  { label: "Experience Letter", type: "Experience_Letter", key: "Experience_Letter" },
  { label: "Relieving Letter", type: "Relieving_Letter", key: "Relieving_Letter" },
  { label: "Payslip (Month 1)", type: "Payslip", key: "Payslip_1" },
  { label: "Payslip (Month 2)", type: "Payslip", key: "Payslip_2" },
  { label: "Payslip (Month 3)", type: "Payslip", key: "Payslip_3" },
];

const MAX_FILE_SIZE = 2 * 1024 * 1024;

function fieldClass(errors, field) {
  return errors[field] ? "border-destructive focus-visible:ring-destructive" : "";
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

const emptyForm = {
  employeeCode: "", firstName: "", lastName: "", dob: "", gender: "",
  bloodGroup: "", emergencyContact: "", departmentId: "", designationId: "", joiningDate: "",
  employmentType: "Full_Time", status: "Active", employeeCategory: "Fresher",
  roleId: "", reportingManagerId: "",
  qualification: "", specialization: "", skills: "",
  collegeName: "", graduationYear: "", cgpa: "", internshipDetails: "", certifications: "",
  totalExperienceYears: "", totalExperienceMonths: "", previousCompany: "", previousDesignation: "",
  previousCtc: "", expectedCtc: "", lastWorkingDate: "", noticePeriod: "", relevantExperience: "",
  mobile: "", alternateMobile: "", email: "",
  password: "", confirmPassword: "",
  address: "", pan: "", aadhaar: "", bankName: "", accountNumber: "",
};

function AddEmployeeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, hasPermission } = useAuth();
  const editId = searchParams.get("edit");
  const isEditMode = Boolean(editId);

  useEffect(() => {
    if (!isLoading && user && !hasPermission("Employee Management")) {
      toast.error("You do not have permission to manage employees");
      router.replace("/dashboard");
    }
  }, [user, isLoading, hasPermission, router]);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadingEmployee, setLoadingEmployee] = useState(isEditMode);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const { lookups } = useLookups();
  const [pendingFiles, setPendingFiles] = useState({});
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [existingDocs, setExistingDocs] = useState({});
  const fileInputRefs = useRef({});
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (!lookups) return;
    setDepartments(lookups.departments || []);
    setDesignations(lookups.designations || []);
  }, [lookups]);

  useEffect(() => {
    if (!editId) return;
    setLoadingEmployee(true);
    api.employee(editId)
      .then((data) => {
        const emp = data.employee;
        if (!emp) throw new Error("Employee not found");
        setForm({
          employeeCode: emp.employeeCode || "",
          firstName: emp.firstName || "",
          lastName: emp.lastName || "",
          dob: emp.dob || "",
          gender: emp.gender || "",
          bloodGroup: emp.bloodGroup || "",
          emergencyContact: emp.emergencyContact || "",
          departmentId: emp.departmentId ? String(emp.departmentId) : "",
          designationId: emp.designationId ? String(emp.designationId) : "",
          joiningDate: emp.joiningDate || "",
          employmentType: emp.employmentTypeValue || "Full_Time",
          status: emp.statusValue || "Active",
          employeeCategory: emp.employeeCategory || "Fresher",
          roleId: emp.roleId ? String(emp.roleId) : "",
          reportingManagerId: emp.reportingManagerId ? String(emp.reportingManagerId) : "",
          qualification: emp.qualification || "",
          specialization: emp.specialization || "",
          skills: emp.skills || "",
          collegeName: emp.collegeName || "",
          graduationYear: emp.graduationYear ? String(emp.graduationYear) : "",
          cgpa: emp.cgpa || "",
          internshipDetails: emp.internshipDetails || "",
          certifications: emp.certifications || "",
          totalExperienceYears: emp.totalExperienceYears != null ? String(emp.totalExperienceYears) : "",
          totalExperienceMonths: emp.totalExperienceMonths != null ? String(emp.totalExperienceMonths) : "",
          previousCompany: emp.previousCompany || "",
          previousDesignation: emp.previousDesignation || "",
          previousCtc: emp.previousCtc != null ? String(emp.previousCtc) : "",
          expectedCtc: emp.expectedCtc != null ? String(emp.expectedCtc) : "",
          lastWorkingDate: emp.lastWorkingDate || "",
          noticePeriod: emp.noticePeriod || "",
          relevantExperience: emp.relevantExperience || "",
          mobile: emp.mobile || "",
          alternateMobile: emp.alternateMobile || "",
          email: emp.email || "",
          password: "",
          confirmPassword: "",
          address: emp.address || "",
          pan: emp.pan || "",
          aadhaar: emp.aadhaar || "",
          bankName: emp.bankName || "",
          accountNumber: emp.accountNumber || "",
        });
        if (emp.photo) setProfilePreview(emp.photo);
        const docsByType = {};
        (data.documents || []).forEach((doc) => {
          if (doc.documentType) docsByType[doc.documentType] = doc;
        });
        setExistingDocs(docsByType);
      })
      .catch((err) => {
        toast.error(err.message || "Failed to load employee");
        router.push("/employees");
      })
      .finally(() => setLoadingEmployee(false));
  }, [editId, router]);

  const activeSection = sections[step].id;
  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateFile = (file) => {
    if (!file) return false;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File must be under 2MB");
      return false;
    }
    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, and PDF files are allowed");
      return false;
    }
    return true;
  };

  const handleFileSelect = (type, event) => {
    const file = event.target.files?.[0];
    if (!file || !validateFile(file)) {
      event.target.value = "";
      return;
    }
    setPendingFiles((prev) => ({ ...prev, [type]: file }));
    setFieldErrors((prev) => {
      const key = typeof type === "string" && type.startsWith("Payslip") ? null : `doc_${type}`;
      if (!key || !prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    event.target.value = "";
  };

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Photo must be under 2MB");
      event.target.value = "";
      return;
    }
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      toast.error("Only JPG and PNG photos are allowed");
      event.target.value = "";
      return;
    }
    setProfilePhoto(file);
    setProfilePreview(URL.createObjectURL(file));
    event.target.value = "";
  };

  const validateStep = (stepIndex) => {
    const errors = {};
    const add = (field, message) => { errors[field] = message; };

    if (stepIndex === 0) {
      if (!form.employeeCode?.trim()) add("employeeCode", "Employee Code is required.");
      if (!form.firstName?.trim()) add("firstName", "First Name is required.");
      if (!form.lastName?.trim()) add("lastName", "Last Name is required.");
    } else if (stepIndex === 1) {
      if (!form.departmentId) add("departmentId", "Department is required.");
      if (!form.designationId) add("designationId", "Designation is required.");
      if (!form.joiningDate) add("joiningDate", "Joining Date is required.");
      if (!form.employeeCategory) add("employeeCategory", "Employee Category is required.");
    } else if (stepIndex === 2) {
      const categoryCheck = validateEmployeeCategory(form);
      if (!categoryCheck.valid) {
        Object.assign(errors, mapCategoryErrorsToFields(categoryCheck.errors));
      }
    } else if (stepIndex === 3) {
      if (!form.mobile?.trim()) add("mobile", "Mobile is required.");
      if (!form.email?.trim()) add("email", "Email is required.");
      else if (!isValidEmail(form.email)) add("email", "Enter a valid email address.");
      if (!isEditMode) {
        if (!form.password || form.password.length < 6) {
          add("password", "Password is required (minimum 6 characters).");
        } else if (form.password !== form.confirmPassword) {
          add("confirmPassword", "Password and Confirm Password do not match.");
        }
      }
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      toast.error("Please fill the required fields.");
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const validateForm = () => {
    const validation = validateEmployeeForm(
      { ...form, confirmPassword: form.confirmPassword },
      { isEdit: isEditMode, checkConfirmPassword: true }
    );
    const errors = { ...validation.fieldErrors };

    const categoryCheck = validateEmployeeCategory(form);
    if (!categoryCheck.valid) {
      Object.assign(errors, mapCategoryErrorsToFields(categoryCheck.errors));
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      const firstKey = Object.keys(errors)[0];
      const stepMap = {
        employeeCode: 0, firstName: 0, lastName: 0,
        departmentId: 1, designationId: 1, joiningDate: 1, employeeCategory: 1,
        qualification: 2, collegeName: 2, graduationYear: 2,
        totalExperienceYears: 2, totalExperienceMonths: 2,
        previousCompany: 2, previousDesignation: 2, previousCtc: 2,
        mobile: 3, email: 3, password: 3, confirmPassword: 3,
        pan: 4, aadhaar: 4,
      };
      const errorStep = stepMap[firstKey] ?? 0;
      setStep(errorStep);
      toast.error(
        Object.keys(errors).length > 1
          ? "Please fill the required fields."
          : errors[firstKey]
      );
      return false;
    }

    setFieldErrors({});
    return true;
  };

  const handleApiError = (err) => {
    if (err.fields) {
      setFieldErrors(err.fields);
      toast.error(err.message || "Please fill the required fields.");
      return;
    }
    if (err.field) {
      setFieldErrors({ [err.field]: err.message });
    }
    toast.error(err.message || "Request failed");
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    let employeeId = editId;
    let employeeCreated = false;

    try {
      const payload = buildEmployeeApiPayload(form, { isEdit: isEditMode });

      if (isEditMode) {
        await api.updateEmployee(editId, payload);
      } else {
        const { employee } = await api.createEmployee(payload);
        employeeId = employee?.id;
        employeeCreated = Boolean(employeeId);
        if (!employeeId) {
          throw new Error("Employee was saved but no employee ID was returned.");
        }
      }

      const uploadFailures = [];

      if (employeeId) {
        for (const doc of DOCUMENT_UPLOADS) {
          const file = pendingFiles[doc.type];
          if (!file) continue;
          try {
            await api.uploadEmployeeDocument(employeeId, doc.type, file);
          } catch (uploadErr) {
            uploadFailures.push(`${doc.label}: ${uploadErr.message}`);
          }
        }

        if (form.employeeCategory === "Experienced") {
          for (const doc of EXPERIENCE_DOC_UPLOADS) {
            const file = pendingFiles[doc.key];
            if (!file) continue;
            try {
              await api.uploadEmployeeDocument(employeeId, doc.type, file);
            } catch (uploadErr) {
              uploadFailures.push(`${doc.label}: ${uploadErr.message}`);
            }
          }
        }

        if (profilePhoto) {
          try {
            await api.uploadEmployeePhoto(employeeId, profilePhoto);
          } catch (uploadErr) {
            uploadFailures.push(`Profile photo: ${uploadErr.message}`);
          }
        }
      }

      if (uploadFailures.length) {
        toast.warning(
          `Employee ${isEditMode ? "updated" : "created"}, but some uploads failed: ${uploadFailures.join("; ")}`
        );
      } else {
        toast.success(isEditMode ? "Employee updated successfully." : "Employee created successfully.");
      }

      router.push("/employees");
    } catch (err) {
      if (employeeCreated) {
        toast.error(
          `${err.message || "Save failed after employee was created."} Check the employee list and try uploading documents again.`
        );
        router.push("/employees");
        return;
      }
      handleApiError(err);
    } finally {
      setSaving(false);
    }
  };

  if (loadingEmployee) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-champagne border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/employees"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="font-display text-2xl font-bold lg:text-3xl">{isEditMode ? "Edit Employee" : "Add Employee"}</h1>
          <p className="text-muted-foreground">
            {isEditMode ? "Update employee record" : "Create a new employee record"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sections.map((section, i) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setStep(i)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                  step === i
                    ? "bg-champagne text-white"
                    : "border bg-background text-muted-foreground"
                }`}
              >
                {i + 1}. {section.title}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden lg:block lg:w-64 shrink-0">
          <Card className="glass-card lg:sticky lg:top-20">
            <CardContent className="space-y-1 p-3">
              {sections.map((section, i) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setStep(i)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    step === i ? "bg-champagne/10 font-medium text-champagne" : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 space-y-6">
          {activeSection === "personal" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Basic employee information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/30">
                      {profilePreview ? (
                        <img src={profilePreview} alt="Profile preview" className="h-full w-full object-cover" />
                      ) : (
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        className="hidden"
                        onChange={handlePhotoSelect}
                      />
                      <Button variant="outline" size="sm" type="button" onClick={() => photoInputRef.current?.click()}>
                        <Upload className="mr-1 h-3 w-3" />
                        {profilePhoto ? "Change Photo" : "Upload Photo"}
                      </Button>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {profilePhoto ? profilePhoto.name : "JPG, PNG. Max 2MB"}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Employee ID (EMP Code) *</Label>
                      <Input className={fieldClass(fieldErrors, "employeeCode")} placeholder="EMP009" value={form.employeeCode} onChange={(e) => set("employeeCode", e.target.value)} />
                      <FieldError message={fieldErrors.employeeCode} />
                      <p className="text-xs text-muted-foreground">Used for login reference, attendance &amp; payroll</p>
                    </div>
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input className={fieldClass(fieldErrors, "firstName")} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
                      <FieldError message={fieldErrors.firstName} />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input className={fieldClass(fieldErrors, "lastName")} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
                      <FieldError message={fieldErrors.lastName} />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {(lookups?.genders || []).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Blood Group</Label>
                      <Select value={form.bloodGroup} onValueChange={(v) => set("bloodGroup", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {(lookups?.bloodGroups || []).map((bg) => (
                            <SelectItem key={bg.value} value={bg.value}>{bg.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Emergency Contact</Label>
                      <Input value={form.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeSection === "employment" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Employment Information</CardTitle>
                  <CardDescription>Job and role information</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Department *</Label>
                    <Select value={form.departmentId} onValueChange={(v) => set("departmentId", v)}>
                      <SelectTrigger className={fieldClass(fieldErrors, "departmentId")}><SelectValue placeholder="Select Department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.departmentName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FieldError message={fieldErrors.departmentId} />
                  </div>
                  <div className="space-y-2">
                    <Label>Designation *</Label>
                    <Select value={form.designationId} onValueChange={(v) => set("designationId", v)}>
                      <SelectTrigger className={fieldClass(fieldErrors, "designationId")}><SelectValue placeholder="Select Designation" /></SelectTrigger>
                      <SelectContent>
                        {designations.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.designationName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FieldError message={fieldErrors.designationId} />
                  </div>
                  <div className="space-y-2">
                    <Label>Joining Date *</Label>
                    <Input className={fieldClass(fieldErrors, "joiningDate")} type="date" value={form.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} />
                    <FieldError message={fieldErrors.joiningDate} />
                  </div>
                  <div className="space-y-2">
                    <Label>Employment Type</Label>
                    <Select value={form.employmentType} onValueChange={(v) => set("employmentType", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(lookups?.employmentTypes || []).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => set("status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(lookups?.employeeStatuses || []).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={form.roleId || "none"} onValueChange={(v) => set("roleId", v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Default: Employee" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Default (Employee)</SelectItem>
                        {(lookups?.roles || []).map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reporting Manager</Label>
                    <Select
                      value={form.reportingManagerId || "none"}
                      onValueChange={(v) => set("reportingManagerId", v === "none" ? "" : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {(lookups?.managers || []).map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.fullName} ({m.employeeCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 sm:col-span-2">
                    <Label>Employee Category *</Label>
                    <div className="flex flex-wrap gap-6">
                      {(lookups?.employeeCategories || []).map((cat) => (
                        <label
                          key={cat.value}
                          className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                        >
                          <input
                            type="radio"
                            name="employeeCategory"
                            value={cat.value}
                            checked={form.employeeCategory === cat.value}
                            onChange={() => set("employeeCategory", cat.value)}
                            className="h-4 w-4 accent-champagne"
                          />
                          {cat.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeSection === "category" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>
                    {form.employeeCategory === "Fresher" ? "Education Details" : "Experience Details"}
                  </CardTitle>
                  <CardDescription>
                    {form.employeeCategory === "Fresher"
                      ? "Academic background for fresher employees"
                      : "Previous employment history"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {form.employeeCategory === "Fresher" ? (
                    <>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Highest Qualification *</Label>
                        <Input value={form.qualification} onChange={(e) => set("qualification", e.target.value)} placeholder="e.g. B.Tech" />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>College / University *</Label>
                        <Input value={form.collegeName} onChange={(e) => set("collegeName", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Specialization</Label>
                        <Input value={form.specialization} onChange={(e) => set("specialization", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Graduation Year *</Label>
                        <Input type="number" min="1950" max="2100" value={form.graduationYear} onChange={(e) => set("graduationYear", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Percentage / CGPA</Label>
                        <Input value={form.cgpa} onChange={(e) => set("cgpa", e.target.value)} placeholder="e.g. 8.5 or 75%" />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Internship Experience (Optional)</Label>
                        <Textarea rows={2} value={form.internshipDetails} onChange={(e) => set("internshipDetails", e.target.value)} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Skills</Label>
                        <Textarea rows={2} value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="e.g. JavaScript, React" />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Certifications (Optional)</Label>
                        <Textarea rows={2} value={form.certifications} onChange={(e) => set("certifications", e.target.value)} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Total Experience (Years) *</Label>
                        <Input type="number" min="0" value={form.totalExperienceYears} onChange={(e) => set("totalExperienceYears", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Experience (Months) *</Label>
                        <Input type="number" min="0" max="11" value={form.totalExperienceMonths} onChange={(e) => set("totalExperienceMonths", e.target.value)} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Previous Company Name *</Label>
                        <Input value={form.previousCompany} onChange={(e) => set("previousCompany", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Previous Designation *</Label>
                        <Input value={form.previousDesignation} onChange={(e) => set("previousDesignation", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Previous CTC *</Label>
                        <Input type="number" min="0" step="0.01" value={form.previousCtc} onChange={(e) => set("previousCtc", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Expected CTC</Label>
                        <Input type="number" min="0" step="0.01" value={form.expectedCtc} onChange={(e) => set("expectedCtc", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Working Date</Label>
                        <Input type="date" value={form.lastWorkingDate} onChange={(e) => set("lastWorkingDate", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Notice Period</Label>
                        <Input value={form.noticePeriod} onChange={(e) => set("noticePeriod", e.target.value)} placeholder="e.g. 30 days" />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Relevant Experience</Label>
                        <Textarea rows={2} value={form.relevantExperience} onChange={(e) => set("relevantExperience", e.target.value)} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Skills</Label>
                        <Textarea rows={2} value={form.skills} onChange={(e) => set("skills", e.target.value)} />
                      </div>
                      <div className="space-y-4 sm:col-span-2">
                        <Label>Previous Employment Documents</Label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {EXPERIENCE_DOC_UPLOADS.map((doc) => {
                            const file = pendingFiles[doc.key];
                            return (
                              <div key={doc.key} className="flex items-center justify-between rounded-lg border p-3">
                                <div className="min-w-0">
                                  <span className="text-sm font-medium">{doc.label}</span>
                                  {file && (
                                    <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                                      <Check className="h-3 w-3" /> {file.name}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <input
                                    ref={(el) => { fileInputRefs.current[doc.key] = el; }}
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                                    className="hidden"
                                    onChange={(e) => handleFileSelect(doc.key, e)}
                                  />
                                  <Button variant="outline" size="sm" type="button" onClick={() => fileInputRefs.current[doc.key]?.click()}>
                                    <Upload className="mr-1 h-3 w-3" />
                                    {file ? "Change" : "Upload"}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeSection === "contact" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>Communication information</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Mobile *</Label>
                    <Input
                      className={fieldClass(fieldErrors, "mobile")}
                      inputMode="numeric"
                      maxLength={10}
                      value={form.mobile}
                      onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    />
                    <FieldError message={fieldErrors.mobile} />
                  </div>
                  <div className="space-y-2">
                    <Label>Alternate Mobile</Label>
                    <Input
                      className={fieldClass(fieldErrors, "alternateMobile")}
                      inputMode="numeric"
                      maxLength={10}
                      value={form.alternateMobile}
                      onChange={(e) => set("alternateMobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    />
                    <FieldError message={fieldErrors.alternateMobile} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Email *</Label>
                    <Input className={fieldClass(fieldErrors, "email")} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                    <FieldError message={fieldErrors.email} />
                  </div>
                  <div className="space-y-2">
                    <Label>{isEditMode ? "New Password (optional)" : "Password *"}</Label>
                    <Input
                      className={fieldClass(fieldErrors, "password")}
                      type="password"
                      placeholder={isEditMode ? "Leave blank to keep current password" : "Login password (min 6 characters)"}
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                    />
                    <FieldError message={fieldErrors.password} />
                  </div>
                  <div className="space-y-2">
                    <Label>{isEditMode ? "Confirm New Password" : "Confirm Password *"}</Label>
                    <Input
                      className={fieldClass(fieldErrors, "confirmPassword")}
                      type="password"
                      placeholder="Re-enter password"
                      value={form.confirmPassword}
                      onChange={(e) => set("confirmPassword", e.target.value)}
                    />
                    <FieldError message={fieldErrors.confirmPassword} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Address</Label>
                    <Textarea rows={3} value={form.address} onChange={(e) => set("address", e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeSection === "documents" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>Identity and bank documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>PAN Number</Label>
                      <Input
                        className={fieldClass(fieldErrors, "pan")}
                        maxLength={10}
                        value={form.pan}
                        onChange={(e) => set("pan", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                      />
                      <FieldError message={fieldErrors.pan} />
                    </div>
                    <div className="space-y-2">
                      <Label>Aadhaar Number</Label>
                      <Input
                        className={fieldClass(fieldErrors, "aadhaar")}
                        inputMode="numeric"
                        maxLength={12}
                        value={form.aadhaar}
                        onChange={(e) => set("aadhaar", e.target.value.replace(/\D/g, "").slice(0, 12))}
                      />
                      <FieldError message={fieldErrors.aadhaar} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {DOCUMENT_UPLOADS.map((doc) => {
                      const file = pendingFiles[doc.type];
                      const existing = existingDocs[doc.type];
                      const docError = fieldErrors[`doc_${doc.type}`];
                      return (
                        <div key={doc.type} className={`flex items-center justify-between rounded-lg border p-4 ${docError ? "border-destructive" : ""}`}>
                          <div className="min-w-0 pr-2">
                            <span className="text-sm font-medium">{doc.label}</span>
                            {file && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                                <Check className="h-3 w-3" /> {file.name}
                              </p>
                            )}
                            {!file && existing && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Uploaded: {existing.fileName}
                              </p>
                            )}
                            {existing?.isImage && existing.url && !file && (
                              <img
                                src={existing.url}
                                alt={existing.fileName}
                                className="mt-2 h-14 w-14 rounded object-cover border"
                              />
                            )}
                            {existing?.url && existing?.isPdf && !file && (
                              <a
                                href={existing.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-block text-xs text-champagne hover:underline"
                              >
                                View PDF
                              </a>
                            )}
                            <FieldError message={docError} />
                          </div>
                          <div>
                            <input
                              ref={(el) => { fileInputRefs.current[doc.type] = el; }}
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,application/pdf"
                              className="hidden"
                              onChange={(e) => handleFileSelect(doc.type, e)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={() => fileInputRefs.current[doc.type]?.click()}
                            >
                              <Upload className="mr-1 h-3 w-3" />
                              {file ? "Change" : "Upload"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/employees" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
              </Link>
              {step > 0 && (
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setStep(step - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
              )}
            </div>
            <div className="w-full sm:w-auto">
              {step < sections.length - 1 ? (
                <Button variant="premium" className="w-full sm:w-auto" onClick={handleNext}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="premium" className="w-full sm:w-auto" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : (
                    <>
                      <Save className="h-4 w-4" />
                      {isEditMode ? "Update Employee" : "Save Employee"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddEmployeePage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-champagne border-t-transparent" />
      </div>
    }>
      <AddEmployeeContent />
    </Suspense>
  );
}
