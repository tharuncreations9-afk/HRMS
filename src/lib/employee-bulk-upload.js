import * as XLSX from "xlsx";

export const BULK_UPLOAD_HEADERS = [
  "Employee Code",
  "First Name",
  "Last Name",
  "Email",
  "Mobile",
  "Password",
  "Department",
  "Designation",
  "Joining Date",
  "Role",
  "Gender",
  "Date of Birth",
  "Blood Group",
  "Alternate Mobile",
  "Address",
  "Emergency Contact",
  "Employment Type",
  "Status",
  "Reporting Manager Code",
  "PAN",
  "Aadhaar",
  "Bank Name",
  "Account Number",
];

const HEADER_ALIASES = {
  employeecode: "employeeCode",
  empcode: "employeeCode",
  empcodeid: "employeeCode",
  employeeid: "employeeCode",
  firstname: "firstName",
  lastname: "lastName",
  email: "email",
  emailaddress: "email",
  mobile: "mobile",
  mobileno: "mobile",
  phone: "mobile",
  password: "password",
  department: "department",
  dept: "department",
  designation: "designation",
  joiningdate: "joiningDate",
  dateofjoining: "joiningDate",
  doj: "joiningDate",
  role: "role",
  rolename: "role",
  gender: "gender",
  dateofbirth: "dob",
  dob: "dob",
  bloodgroup: "bloodGroup",
  alternatemobile: "alternateMobile",
  address: "address",
  emergencycontact: "emergencyContact",
  employmenttype: "employmentType",
  status: "status",
  reportingmanagercode: "reportingManagerCode",
  managercode: "reportingManagerCode",
  pan: "pan",
  aadhaar: "aadhaar",
  bankname: "bankName",
  accountnumber: "accountNumber",
};

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function cellValue(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return String(value).trim();
}

export function parseExcelDate(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function mapEmploymentType(value) {
  const key = String(value || "Full_Time")
    .trim()
    .replace(/\s+/g, "_");
  const allowed = ["Full_Time", "Part_Time", "Contract", "Intern"];
  return allowed.includes(key) ? key : null;
}

function mapStatus(value) {
  const key = String(value || "Active")
    .trim()
    .replace(/\s+/g, "_");
  const allowed = ["Active", "Resigned", "On_Hold", "Terminated"];
  return allowed.includes(key) ? key : null;
}

function mapRoleName(value) {
  if (!value) return "employee";
  return String(value).trim().toLowerCase().replace(/\s+/g, "_");
}

export function parseEmployeeWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Excel file has no sheets");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (rows.length < 2) {
    throw new Error("Excel file must have a header row and at least one data row");
  }

  const headerRow = rows[0];
  const columnMap = {};
  headerRow.forEach((header, index) => {
    const field = HEADER_ALIASES[normalizeHeader(header)];
    if (field) columnMap[index] = field;
  });

  const requiredFields = ["employeeCode", "firstName", "email", "mobile", "department", "designation", "joiningDate"];
  const mappedFields = new Set(Object.values(columnMap));
  const missingHeaders = requiredFields.filter((f) => !mappedFields.has(f));
  if (missingHeaders.length) {
    throw new Error(
      `Missing required column(s): ${missingHeaders.join(", ")}. Download the template for correct headers.`
    );
  }

  const parsedRows = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const isEmpty = row.every((cell) => cellValue(cell) === "");
    if (isEmpty) continue;

    const record = { rowNumber: i + 1 };
    Object.entries(columnMap).forEach(([index, field]) => {
      record[field] = cellValue(row[Number(index)]);
    });

    if (!record.lastName && record.firstName?.includes(" ")) {
      const parts = record.firstName.split(/\s+/);
      record.firstName = parts[0];
      record.lastName = parts.slice(1).join(" ");
    }

    parsedRows.push(record);
  }

  if (!parsedRows.length) {
    throw new Error("No employee rows found in the Excel file");
  }

  return parsedRows;
}

export function validateEmployeeRow(row, context) {
  const errors = [];
  const {
    existingCodes,
    existingEmails,
    seenCodes,
    seenEmails,
    departmentByName,
    designationByName,
    roleByName,
    managerByCode,
  } = context;

  const employeeCode = row.employeeCode?.trim();
  const email = row.email?.trim().toLowerCase();
  const mobile = row.mobile?.trim();

  if (!employeeCode) errors.push("Employee Code is required");
  if (!row.firstName?.trim()) errors.push("First Name is required");
  if (!email) errors.push("Email is required");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email format");
  if (!mobile) errors.push("Mobile is required");
  if (!row.department?.trim()) errors.push("Department is required");
  if (!row.designation?.trim()) errors.push("Designation is required");
  if (!row.joiningDate) errors.push("Joining Date is required");

  if (employeeCode) {
    const codeKey = employeeCode.toLowerCase();
    if (existingCodes.has(codeKey)) errors.push(`Duplicate Employee Code "${employeeCode}" already exists`);
    if (seenCodes.has(codeKey)) errors.push(`Duplicate Employee Code "${employeeCode}" repeated in file`);
  }

  if (email) {
    if (existingEmails.has(email)) errors.push(`Duplicate Email "${row.email}" already exists`);
    if (seenEmails.has(email)) errors.push(`Duplicate Email "${row.email}" repeated in file`);
  }

  const department = departmentByName.get(row.department?.trim().toLowerCase());
  if (!department) errors.push(`Department "${row.department}" not found`);

  const designation = designationByName.get(row.designation?.trim().toLowerCase());
  if (!designation) errors.push(`Designation "${row.designation}" not found`);

  const joiningDate = parseExcelDate(row.joiningDate);
  if (!joiningDate) errors.push("Invalid Joining Date");

  const employmentType = mapEmploymentType(row.employmentType);
  if (row.employmentType && !employmentType) errors.push(`Invalid Employment Type "${row.employmentType}"`);

  const status = mapStatus(row.status);
  if (row.status && !status) errors.push(`Invalid Status "${row.status}"`);

  const roleKey = mapRoleName(row.role);
  const role = roleByName.get(roleKey);
  if (row.role && !role) errors.push(`Role "${row.role}" not found`);

  let reportingManagerId = null;
  if (row.reportingManagerCode?.trim()) {
    const manager = managerByCode.get(row.reportingManagerCode.trim().toLowerCase());
    if (!manager) errors.push(`Reporting Manager Code "${row.reportingManagerCode}" not found`);
    else reportingManagerId = manager.id;
  }

  const password = row.password?.trim() || "Admin@123";
  if (password.length < 6) errors.push("Password must be at least 6 characters");

  if (errors.length) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      employeeCode,
      firstName: row.firstName.trim(),
      lastName: (row.lastName || "").trim(),
      fullName: `${row.firstName.trim()} ${(row.lastName || "").trim()}`.trim(),
      email: row.email.trim(),
      mobile,
      password,
      departmentId: department.id,
      designationId: designation.id,
      roleId: role?.id,
      joiningDate,
      dob: row.dob ? parseExcelDate(row.dob) : null,
      gender: row.gender || null,
      bloodGroup: row.bloodGroup || null,
      alternateMobile: row.alternateMobile || null,
      address: row.address || null,
      emergencyContact: row.emergencyContact || null,
      employmentType: employmentType || "Full_Time",
      status: status || "Active",
      reportingManagerId,
      pan: row.pan || null,
      aadhaar: row.aadhaar || null,
      bankName: row.bankName || null,
      accountNumber: row.accountNumber || null,
    },
  };
}

export function buildTemplateWorkbook() {
  const sheet = XLSX.utils.aoa_to_sheet([
    BULK_UPLOAD_HEADERS,
    [
      "EMP010",
      "Ravi",
      "Kumar",
      "ravi.kumar@vlj.com",
      "9876543210",
      "Admin@123",
      "Engineering",
      "Software Engineer",
      "2024-01-15",
      "employee",
      "Male",
      "1995-06-12",
      "O+",
      "",
      "Hyderabad",
      "9988776655",
      "Full Time",
      "Active",
      "",
      "",
      "",
      "",
      "",
    ],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Employees");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
