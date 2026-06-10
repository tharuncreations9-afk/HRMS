-- VLJ HRMS — MySQL Table Structure (Phase 2)
-- Generated from prisma/schema.prisma
-- Run via: npx prisma migrate dev (recommended) OR execute manually after review

CREATE DATABASE IF NOT EXISTS vlj_hrms
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vlj_hrms;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: roles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE roles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  role_name   VARCHAR(50)  NOT NULL,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by  INT          NULL,
  updated_by  INT          NULL,
  UNIQUE KEY uk_roles_role_name (role_name),
  KEY idx_roles_role_name (role_name)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: permissions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE permissions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  permission_name VARCHAR(100) NOT NULL,
  module_name     VARCHAR(100) NOT NULL,
  created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      INT          NULL,
  updated_by      INT          NULL,
  UNIQUE KEY uk_permissions_name_module (permission_name, module_name),
  KEY idx_permissions_module_name (module_name)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 7: departments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE departments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL,
  department_code VARCHAR(20)  NOT NULL,
  created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      INT          NULL,
  updated_by      INT          NULL,
  UNIQUE KEY uk_departments_code (department_code),
  KEY idx_departments_name (department_name)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 8: designations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE designations (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  designation_name VARCHAR(100) NOT NULL,
  created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by       INT          NULL,
  updated_by       INT          NULL,
  UNIQUE KEY uk_designations_name (designation_name)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 5: employees
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE employees (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  employee_code        VARCHAR(20)  NOT NULL,
  cam_attendance_id    VARCHAR(20)  NOT NULL,
  first_name           VARCHAR(100) NOT NULL,
  last_name            VARCHAR(100) NOT NULL,
  full_name            VARCHAR(200) NOT NULL,
  profile_photo        VARCHAR(500) NULL,
  dob                  DATE         NULL,
  gender               VARCHAR(20)  NULL,
  blood_group          VARCHAR(10)  NULL,
  mobile               VARCHAR(15)  NOT NULL,
  alternate_mobile     VARCHAR(15)  NULL,
  email                VARCHAR(150) NOT NULL,
  address              TEXT         NULL,
  department_id        INT          NOT NULL,
  designation_id       INT          NOT NULL,
  reporting_manager_id INT          NULL,
  joining_date         DATE         NOT NULL,
  employment_type      ENUM('Full_Time','Part_Time','Contract','Intern') NOT NULL DEFAULT 'Full_Time',
  status               ENUM('Active','Resigned','On_Hold','Terminated') NOT NULL DEFAULT 'Active',
  created_at           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by           INT          NULL,
  updated_by           INT          NULL,
  UNIQUE KEY uk_employees_code (employee_code),
  UNIQUE KEY uk_employees_cam_id (cam_attendance_id),
  UNIQUE KEY uk_employees_email (email),
  KEY idx_employees_department (department_id),
  KEY idx_employees_designation (designation_id),
  KEY idx_employees_manager (reporting_manager_id),
  KEY idx_employees_status (status),
  KEY idx_employees_mobile (mobile),
  CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_employees_designation FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_employees_manager FOREIGN KEY (reporting_manager_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 4: users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  employee_id   INT          NULL,
  username      VARCHAR(50)  NOT NULL,
  email         VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id       INT          NOT NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  last_login    DATETIME(3)  NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by    INT          NULL,
  updated_by    INT          NULL,
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email),
  UNIQUE KEY uk_users_employee (employee_id),
  KEY idx_users_role (role_id),
  KEY idx_users_active (is_active),
  CONSTRAINT fk_users_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Add FK for roles.created_by / updated_by (deferred due to users dependency)
ALTER TABLE roles
  ADD CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_roles_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE permissions
  ADD CONSTRAINT fk_permissions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_permissions_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE departments
  ADD CONSTRAINT fk_departments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_departments_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE designations
  ADD CONSTRAINT fk_designations_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_designations_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE employees
  ADD CONSTRAINT fk_employees_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_employees_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: role_permissions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE role_permissions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  role_id       INT NOT NULL,
  permission_id INT NOT NULL,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by    INT NULL,
  updated_by    INT NULL,
  UNIQUE KEY uk_role_permissions (role_id, permission_id),
  KEY idx_role_permissions_role (role_id),
  KEY idx_role_permissions_permission (permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_rp_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 6: employee_documents
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE employee_documents (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  employee_id   INT NOT NULL,
  document_type ENUM('Aadhaar','PAN','Bank_Passbook','Offer_Letter','Agreement','Other') NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  file_path     VARCHAR(500) NOT NULL,
  uploaded_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by    INT NULL,
  updated_by    INT NULL,
  KEY idx_emp_docs_employee (employee_id),
  KEY idx_emp_docs_type (document_type),
  CONSTRAINT fk_emp_docs_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_emp_docs_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_emp_docs_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 9: attendance (NO employee_name — code + cam_id mapping only)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE attendance (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  employee_id       INT NOT NULL,
  employee_code     VARCHAR(20) NOT NULL,
  cam_attendance_id VARCHAR(20) NOT NULL,
  attendance_date   DATE NOT NULL,
  in_time           DATETIME(3) NULL,
  out_time          DATETIME(3) NULL,
  working_hours     DECIMAL(5,2) NULL,
  overtime_hours    DECIMAL(5,2) NULL,
  attendance_status ENUM('Present','Absent','Late','Half_Day','Leave','Holiday','Weekly_Off') NOT NULL,
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by        INT NULL,
  updated_by        INT NULL,
  UNIQUE KEY uk_attendance_emp_date (employee_id, attendance_date),
  KEY idx_attendance_code (employee_code),
  KEY idx_attendance_cam_id (cam_attendance_id),
  KEY idx_attendance_date (attendance_date),
  KEY idx_attendance_status (attendance_status),
  KEY idx_attendance_emp_date (employee_id, attendance_date),
  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_attendance_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 10: attendance_sync_logs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE attendance_sync_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  sync_date       DATETIME(3) NOT NULL,
  total_records   INT NOT NULL DEFAULT 0,
  success_records INT NOT NULL DEFAULT 0,
  failed_records  INT NOT NULL DEFAULT 0,
  status          ENUM('Success','Partial','Failed','In_Progress') NOT NULL DEFAULT 'In_Progress',
  remarks         TEXT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      INT NULL,
  updated_by      INT NULL,
  KEY idx_sync_date (sync_date),
  KEY idx_sync_status (status),
  CONSTRAINT fk_sync_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_sync_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 11: attendance_exceptions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE attendance_exceptions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  employee_id     INT NULL,
  attendance_date DATE NOT NULL,
  issue_type      ENUM('Missing_Punch','Duplicate_Punch','Unmatched_Employee','Invalid_Time','Device_Error') NOT NULL,
  remarks         TEXT NULL,
  resolved        TINYINT(1) NOT NULL DEFAULT 0,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      INT NULL,
  updated_by      INT NULL,
  KEY idx_exc_employee (employee_id),
  KEY idx_exc_date (attendance_date),
  KEY idx_exc_issue (issue_type),
  KEY idx_exc_resolved (resolved),
  CONSTRAINT fk_exc_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
  CONSTRAINT fk_exc_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_exc_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 12: leave_types
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE leave_types (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  leave_name   VARCHAR(100) NOT NULL,
  yearly_limit INT NOT NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by   INT NULL,
  updated_by   INT NULL,
  UNIQUE KEY uk_leave_types_name (leave_name),
  CONSTRAINT fk_leave_types_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_leave_types_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 13: leave_balances
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE leave_balances (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  employee_id     INT NOT NULL,
  leave_type_id   INT NOT NULL,
  total_leave     DECIMAL(5,1) NOT NULL DEFAULT 0,
  used_leave      DECIMAL(5,1) NOT NULL DEFAULT 0,
  remaining_leave DECIMAL(5,1) NOT NULL DEFAULT 0,
  year            INT NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      INT NULL,
  updated_by      INT NULL,
  UNIQUE KEY uk_leave_balance (employee_id, leave_type_id, year),
  KEY idx_lb_employee (employee_id),
  KEY idx_lb_year (year),
  CONSTRAINT fk_lb_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_lb_leave_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT,
  CONSTRAINT fk_lb_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_lb_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 14: leave_requests
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE leave_requests (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  employee_id    INT NOT NULL,
  leave_type_id  INT NOT NULL,
  from_date      DATE NOT NULL,
  to_date        DATE NOT NULL,
  total_days     DECIMAL(5,1) NOT NULL,
  reason         TEXT NULL,
  manager_status ENUM('Pending','Approved','Rejected','Not_Applicable') NOT NULL DEFAULT 'Pending',
  hr_status      ENUM('Pending','Approved','Rejected','Not_Applicable') NOT NULL DEFAULT 'Pending',
  final_status   ENUM('Pending','Approved','Rejected','Not_Applicable') NOT NULL DEFAULT 'Pending',
  created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by     INT NULL,
  updated_by     INT NULL,
  KEY idx_lr_employee (employee_id),
  KEY idx_lr_leave_type (leave_type_id),
  KEY idx_lr_final_status (final_status),
  KEY idx_lr_dates (from_date, to_date),
  CONSTRAINT fk_lr_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
  CONSTRAINT fk_lr_leave_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT,
  CONSTRAINT fk_lr_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_lr_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 15: holidays
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE holidays (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  holiday_name VARCHAR(150) NOT NULL,
  holiday_date DATE NOT NULL,
  holiday_type ENUM('National','Optional','Restricted','Company') NOT NULL DEFAULT 'National',
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by   INT NULL,
  updated_by   INT NULL,
  UNIQUE KEY uk_holidays_date (holiday_date),
  KEY idx_holidays_type (holiday_type),
  CONSTRAINT fk_holidays_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_holidays_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 16: attendance_corrections
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE attendance_corrections (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  employee_id        INT NOT NULL,
  attendance_id      INT NOT NULL,
  requested_in_time  DATETIME(3) NULL,
  requested_out_time DATETIME(3) NULL,
  reason             TEXT NULL,
  status             ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  approved_by        INT NULL,
  created_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by         INT NULL,
  updated_by         INT NULL,
  KEY idx_ac_employee (employee_id),
  KEY idx_ac_attendance (attendance_id),
  KEY idx_ac_status (status),
  CONSTRAINT fk_ac_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ac_attendance FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE,
  CONSTRAINT fk_ac_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ac_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ac_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 17: report_download_logs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE report_download_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  report_type  ENUM('Daily_Attendance','Monthly_Attendance','Department_Attendance','Late_Arrival','Overtime','Attendance_Register','Leave_Summary') NOT NULL,
  generated_by INT NOT NULL,
  generated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by   INT NULL,
  updated_by   INT NULL,
  KEY idx_rdl_type (report_type),
  KEY idx_rdl_generated_by (generated_by),
  KEY idx_rdl_generated_at (generated_at),
  CONSTRAINT fk_rdl_generated_by FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_rdl_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_rdl_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 18: audit_logs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NULL,
  module_name VARCHAR(100) NOT NULL,
  action_type ENUM('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','APPROVE','REJECT','EXPORT','SYNC') NOT NULL,
  old_value   JSON NULL,
  new_value   JSON NULL,
  action_date DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by  INT NULL,
  updated_by  INT NULL,
  KEY idx_audit_user (user_id),
  KEY idx_audit_module (module_name),
  KEY idx_audit_action (action_type),
  KEY idx_audit_date (action_date),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
