const API_BASE = "/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("emp_token");
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export const api = {
  login: (body) => apiFetch("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  forgotPassword: (body) => apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify(body) }),
  resetPassword: (body) => apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify(body) }),
  me: () => apiFetch("/auth/me"),
  dashboard: () => apiFetch("/dashboard"),
  notifications: () => apiFetch("/notifications"),
  markNotificationRead: (id) => apiFetch(`/notifications/${id}`, { method: "PATCH", body: JSON.stringify({ isRead: true }) }),
  employees: (params) => apiFetch(`/employees?${new URLSearchParams(params || {})}`),
  employee: (id) => apiFetch(`/employees/${id}`),
  createEmployee: (body) => apiFetch("/employees", { method: "POST", body: JSON.stringify(body) }),
  updateEmployee: (id, body) => apiFetch(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  uploadEmployeeDocument: async (employeeId, documentType, file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);
    const res = await fetch(`${API_BASE}/employees/${employeeId}/documents`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data;
  },
  downloadEmployeeBulkTemplate: async () => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/employees/bulk-upload/template`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Download failed");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employee-bulk-upload-template.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
  bulkUploadEmployees: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/employees/bulk-upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data;
  },
  attendance: (date) => apiFetch(`/attendance?date=${date || ""}`),
  saveAttendance: (body) => apiFetch("/attendance", { method: "POST", body: JSON.stringify(body) }),
  leaves: () => apiFetch("/leaves"),
  applyLeave: (body) => apiFetch("/leaves", { method: "POST", body: JSON.stringify(body) }),
  updateLeave: (id, body) => apiFetch(`/leaves/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  roles: () => apiFetch("/roles"),
  permissions: () => apiFetch("/permissions"),
  createPermission: (body) => apiFetch("/permissions", { method: "POST", body: JSON.stringify(body) }),
  updatePermission: (id, body) => apiFetch(`/permissions/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deletePermission: (id) => apiFetch(`/permissions/${id}`, { method: "DELETE" }),
  assignRolePermission: (body) => apiFetch("/role-permissions", { method: "POST", body: JSON.stringify(body) }),
  removeRolePermission: (body) => apiFetch("/role-permissions", { method: "DELETE", body: JSON.stringify(body) }),
  departments: () => apiFetch("/departments"),
  createDepartment: (body) => apiFetch("/departments", { method: "POST", body: JSON.stringify(body) }),
  updateDepartment: (id, body) => apiFetch(`/departments/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  designations: () => apiFetch("/designations"),
  createDesignation: (body) => apiFetch("/designations", { method: "POST", body: JSON.stringify(body) }),
  updateDesignation: (id, body) => apiFetch(`/designations/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  reportEmployees: (department) => apiFetch(`/reports/employees?department=${encodeURIComponent(department || "")}`),
};
