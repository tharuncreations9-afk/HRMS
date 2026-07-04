const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const MOBILE_REGEX = /^\d{10}$/;
const AADHAAR_REGEX = /^\d{12}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmployeeInput(body = {}) {
  const aadhaarDigits = body.aadhaar ? String(body.aadhaar).replace(/\D/g, "") : "";
  const panValue = body.pan?.trim().toUpperCase() || "";

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
    aadhaar: aadhaarDigits || null,
    pan: panValue || null,
  };
}

export function validateMobile(mobile, { required = true, field = "mobile" } = {}) {
  const value = String(mobile || "").replace(/\D/g, "");
  if (!value) {
    return required
      ? { valid: false, field, message: "Mobile number is required." }
      : { valid: true, value: null };
  }
  if (!MOBILE_REGEX.test(value)) {
    return { valid: false, field, message: "Mobile number must be exactly 10 digits." };
  }
  return { valid: true, value };
}

export function validateEmail(email, { required = true, field = "email" } = {}) {
  const value = String(email || "").trim().toLowerCase();
  if (!value) {
    return required
      ? { valid: false, field, message: "Email is required." }
      : { valid: true, value: null };
  }
  if (!EMAIL_REGEX.test(value)) {
    return { valid: false, field, message: "Enter a valid email address." };
  }
  return { valid: true, value };
}

export function validateAadhaar(aadhaar, { required = false, field = "aadhaar" } = {}) {
  const value = aadhaar ? String(aadhaar).replace(/\D/g, "") : "";
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

export function validateRequiredFields(
  body,
  { isEdit = false, checkConfirmPassword = false } = {}
) {
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

  if (!isEdit) {
    if (!body.password || body.password.length < 6) {
      add("password", "Password is required (minimum 6 characters).");
    } else if (checkConfirmPassword && body.password !== body.confirmPassword) {
      add("confirmPassword", "Password and Confirm Password do not match.");
    }
  } else if (body.password) {
    if (body.password.length < 6) {
      add("password", "Password must be at least 6 characters.");
    } else if (checkConfirmPassword && body.password !== body.confirmPassword) {
      add("confirmPassword", "Password and Confirm Password do not match.");
    }
  }

  return fields;
}

export function validateEmployeeForm(body, options = {}) {
  const { isEdit = false, checkConfirmPassword = false } = options;
  const normalized = normalizeEmployeeInput(body);
  const fieldErrors = validateRequiredFields(normalized, { isEdit, checkConfirmPassword });

  const mobileCheck = validateMobile(normalized.mobile);
  if (!mobileCheck.valid) fieldErrors.mobile = mobileCheck.message;
  else if (mobileCheck.value) normalized.mobile = mobileCheck.value;

  if (normalized.alternateMobile) {
    const altCheck = validateMobile(normalized.alternateMobile, {
      required: false,
      field: "alternateMobile",
    });
    if (!altCheck.valid) fieldErrors.alternateMobile = altCheck.message;
    else normalized.alternateMobile = altCheck.value || null;
  } else {
    normalized.alternateMobile = null;
  }

  const emailCheck = validateEmail(normalized.email);
  if (!emailCheck.valid) fieldErrors.email = emailCheck.message;
  else if (emailCheck.value) normalized.email = emailCheck.value;

  const aadhaarCheck = validateAadhaar(normalized.aadhaar);
  if (!aadhaarCheck.valid) fieldErrors.aadhaar = aadhaarCheck.message;
  else normalized.aadhaar = aadhaarCheck.value ?? null;

  const panCheck = validatePan(normalized.pan);
  if (!panCheck.valid) fieldErrors.pan = panCheck.message;
  else normalized.pan = panCheck.value ?? null;

  const messages = Object.values(fieldErrors);
  return {
    valid: messages.length === 0,
    fieldErrors,
    normalized,
    message: messages[0] || null,
    summary:
      messages.length > 1 ? "Please fill the required fields." : messages[0] || null,
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
    if (found) fieldErrors.employeeCode = "Employee Code already exists.";
  }

  if (data.mobile) {
    const found = await prisma.employee.findFirst({
      where: { mobile: data.mobile, ...notSelf },
      select: { id: true },
    });
    if (found) fieldErrors.mobile = "Mobile Number already exists.";
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
    if (found) fieldErrors.aadhaar = "Aadhaar Number already exists.";
  }

  if (data.pan) {
    const found = await prisma.employee.findFirst({
      where: { pan: data.pan.trim().toUpperCase(), ...notSelf },
      select: { id: true },
    });
    if (found) fieldErrors.pan = "PAN Number already exists.";
  }

  const messages = Object.values(fieldErrors);
  return {
    valid: messages.length === 0,
    fieldErrors,
    message: messages[0] || null,
    summary:
      messages.length > 1 ? "Please fill the required fields." : messages[0] || null,
  };
}

export function mapPrismaDuplicateError(err) {
  if (err?.code !== "P2002") return null;
  const target = (err.meta?.target || []).join(",").toLowerCase();
  if (target.includes("email")) {
    return {
      field: "email",
      message: "Email already exists.",
      fields: { email: "Email already exists." },
    };
  }
  if (target.includes("employee_code")) {
    return {
      field: "employeeCode",
      message: "Employee Code already exists.",
      fields: { employeeCode: "Employee Code already exists." },
    };
  }
  if (target.includes("cam_attendance_id")) {
    return {
      field: "employeeCode",
      message: "Employee Code already exists.",
      fields: { employeeCode: "Employee Code already exists." },
    };
  }
  if (target.includes("mobile")) {
    return {
      field: "mobile",
      message: "Mobile Number already exists.",
      fields: { mobile: "Mobile Number already exists." },
    };
  }
  return { message: "A record with this value already exists." };
}

export function validationErrorResponse(fieldErrors, fallbackMessage) {
  const messages = Object.values(fieldErrors || {});
  const error =
    messages.length > 1
      ? "Please correct the highlighted fields."
      : messages[0] || fallbackMessage || "Validation failed.";
  return Response.json({ error, fields: fieldErrors }, { status: 400 });
}

/** Build API payload from form state (strips confirmPassword, normalizes optional fields). */
export function buildEmployeeApiPayload(form, { isEdit = false } = {}) {
  const { confirmPassword: _confirm, password, ...rest } = form;
  const payload = { ...rest };

  if (!payload.reportingManagerId) payload.reportingManagerId = null;
  if (!payload.roleId) delete payload.roleId;

  const trimmedPassword = password?.trim();
  if (trimmedPassword) {
    payload.password = trimmedPassword;
  } else {
    delete payload.password;
  }

  if (isEdit && !trimmedPassword) {
    delete payload.password;
  }

  return payload;
}

export function mapCategoryErrorsToFields(errors = []) {
  const fieldErrors = {};
  for (const message of errors) {
    if (message.includes("Qualification")) fieldErrors.qualification = message;
    else if (message.includes("College")) fieldErrors.collegeName = message;
    else if (message.includes("Graduation")) fieldErrors.graduationYear = message;
    else if (message.includes("Experience")) {
      fieldErrors.totalExperienceYears = message;
    } else if (message.includes("months")) fieldErrors.totalExperienceMonths = message;
    else if (message.includes("Previous Company")) fieldErrors.previousCompany = message;
    else if (message.includes("Previous Designation")) fieldErrors.previousDesignation = message;
    else if (message.includes("Previous CTC")) fieldErrors.previousCtc = message;
    else fieldErrors.employeeCategory = message;
  }
  return fieldErrors;
}
