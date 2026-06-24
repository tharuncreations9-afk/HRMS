const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const MOBILE_REGEX = /^\d{10}$/;
const AADHAAR_REGEX = /^\d{12}$/;

export const REQUIRED_DOCUMENT_TYPES = ["PAN", "Aadhaar", "Bank_Passbook"];
export const OPTIONAL_DOCUMENT_TYPES = ["Offer_Letter"];

export function normalizeEmployeeInput(body = {}) {
  return {
    ...body,
    employeeCode: body.employeeCode?.trim() || "",
    firstName: body.firstName?.trim() || "",
    lastName: body.lastName?.trim() || "",
    email: body.email?.trim().toLowerCase() || "",
    mobile: String(body.mobile || "").replace(/\D/g, ""),
    alternateMobile: body.alternateMobile
      ? String(body.alternateMobile).replace(/\D/g, "")
      : "",
    aadhaar: body.aadhaar ? String(body.aadhaar).replace(/\D/g, "") : "",
    pan: body.pan?.trim().toUpperCase() || "",
  };
}

export function validateMobile(mobile, { required = true, field = "mobile" } = {}) {
  const value = String(mobile || "").replace(/\D/g, "");
  if (!value) {
    return required
      ? { valid: false, field, message: "Mobile number is required." }
      : { valid: true };
  }
  if (!MOBILE_REGEX.test(value)) {
    return { valid: false, field, message: "Mobile number must be exactly 10 digits." };
  }
  return { valid: true, value };
}

export function validateAadhaar(aadhaar, { required = false, field = "aadhaar" } = {}) {
  const value = String(aadhaar || "").replace(/\D/g, "");
  if (!value) {
    return required
      ? { valid: false, field, message: "Aadhaar number is required." }
      : { valid: true, value: null };
  }
  if (!AADHAAR_REGEX.test(value)) {
    return { valid: false, field, message: "Aadhaar number must be exactly 12 digits." };
  }
  return { valid: true, value };
}

export function validatePan(pan, { required = false, field = "pan" } = {}) {
  const value = String(pan || "").trim().toUpperCase();
  if (!value) {
    return required
      ? { valid: false, field, message: "PAN number is required." }
      : { valid: true, value: null };
  }
  if (!PAN_REGEX.test(value)) {
    return { valid: false, field, message: "Invalid PAN number format." };
  }
  return { valid: true, value };
}

export function validateRequiredFields(body, { isEdit = false } = {}) {
  const fields = {};
  const add = (field, message) => {
    fields[field] = message;
  };

  if (!body.employeeCode?.trim()) add("employeeCode", "Employee Code is required.");
  if (!body.firstName?.trim()) add("firstName", "First Name is required.");
  if (!body.lastName?.trim()) add("lastName", "Last Name is required.");
  if (!body.departmentId) add("departmentId", "Department is required.");
  if (!body.designationId) add("designationId", "Designation is required.");
  if (!body.joiningDate) add("joiningDate", "Joining Date is required.");
  if (!body.employeeCategory) add("employeeCategory", "Employee Category is required.");
  if (!body.mobile?.trim()) add("mobile", "Mobile number is required.");
  if (!body.email?.trim()) add("email", "Email is required.");

  if (!isEdit) {
    if (!body.password || body.password.length < 6) {
      add("password", "Password is required (minimum 6 characters).");
    } else if (body.password !== body.confirmPassword) {
      add("confirmPassword", "Password and Confirm Password do not match.");
    }
  } else if (body.password) {
    if (body.password.length < 6) {
      add("password", "Password must be at least 6 characters.");
    } else if (body.password !== body.confirmPassword) {
      add("confirmPassword", "Password and Confirm Password do not match.");
    }
  }

  return fields;
}

export function validateEmployeeForm(body, options = {}) {
  const normalized = normalizeEmployeeInput(body);
  const fieldErrors = validateRequiredFields(normalized, options);

  const mobileCheck = validateMobile(normalized.mobile);
  if (!mobileCheck.valid) fieldErrors.mobile = mobileCheck.message;

  if (normalized.alternateMobile) {
    const altCheck = validateMobile(normalized.alternateMobile, {
      required: false,
      field: "alternateMobile",
    });
    if (!altCheck.valid) fieldErrors.alternateMobile = altCheck.message;
  }

  const aadhaarCheck = validateAadhaar(normalized.aadhaar);
  if (!aadhaarCheck.valid) fieldErrors.aadhaar = aadhaarCheck.message;

  const panCheck = validatePan(normalized.pan);
  if (!panCheck.valid) fieldErrors.pan = panCheck.message;

  const messages = Object.values(fieldErrors);
  return {
    valid: messages.length === 0,
    fieldErrors,
    normalized,
    message: messages[0] || null,
    summary:
      messages.length > 1 ? "Please correct the highlighted fields." : messages[0] || null,
  };
}

export async function checkEmployeeDuplicates(prisma, data, excludeId = null) {
  const fieldErrors = {};
  const notSelf = excludeId ? { id: { not: excludeId } } : {};

  if (data.employeeCode) {
    const found = await prisma.employee.findFirst({
      where: { employeeCode: data.employeeCode.trim(), ...notSelf },
      select: { id: true },
    });
    if (found) fieldErrors.employeeCode = "Employee code already exists.";
  }

  if (data.mobile) {
    const found = await prisma.employee.findFirst({
      where: { mobile: data.mobile, ...notSelf },
      select: { id: true },
    });
    if (found) fieldErrors.mobile = "Mobile number already exists.";
  }

  if (data.email) {
    const found = await prisma.employee.findFirst({
      where: { email: data.email.trim().toLowerCase(), ...notSelf },
      select: { id: true },
    });
    if (found) fieldErrors.email = "Email already exists.";
  }

  if (data.aadhaar) {
    const found = await prisma.employee.findFirst({
      where: { aadhaar: data.aadhaar, ...notSelf },
      select: { id: true },
    });
    if (found) fieldErrors.aadhaar = "Aadhaar number already exists.";
  }

  if (data.pan) {
    const found = await prisma.employee.findFirst({
      where: { pan: data.pan.trim().toUpperCase(), ...notSelf },
      select: { id: true },
    });
    if (found) fieldErrors.pan = "PAN number already exists.";
  }

  const messages = Object.values(fieldErrors);
  return {
    valid: messages.length === 0,
    fieldErrors,
    message: messages[0] || null,
    summary:
      messages.length > 1 ? "Please correct the highlighted fields." : messages[0] || null,
  };
}

export function mapPrismaDuplicateError(err) {
  if (err?.code !== "P2002") return null;
  const target = (err.meta?.target || []).join(",").toLowerCase();
  if (target.includes("email")) {
    return { field: "email", message: "Email already exists.", fields: { email: "Email already exists." } };
  }
  if (target.includes("employee_code")) {
    return {
      field: "employeeCode",
      message: "Employee code already exists.",
      fields: { employeeCode: "Employee code already exists." },
    };
  }
  if (target.includes("cam_attendance_id")) {
    return {
      field: "employeeCode",
      message: "Employee code already exists.",
      fields: { employeeCode: "Employee code already exists." },
    };
  }
  return { message: "Duplicate value — record already exists." };
}

export function validationErrorResponse(fieldErrors, fallbackMessage) {
  const messages = Object.values(fieldErrors || {});
  const error =
    messages.length > 1
      ? "Please correct the highlighted fields."
      : messages[0] || fallbackMessage || "Validation failed.";
  return Response.json({ error, fields: fieldErrors }, { status: 400 });
}
