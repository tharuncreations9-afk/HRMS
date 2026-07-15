-- VLJ HRMS — schema upgrades needed for current code
-- Backup DB first. If a column already exists, skip that statement (MySQL will error "Duplicate column").

-- ========== 1. IFSC code (new) ==========
ALTER TABLE `employees`
  ADD COLUMN `ifsc_code` VARCHAR(11) NULL AFTER `account_number`;

-- ========== 2. Employee documents BLOB ==========
ALTER TABLE `employee_documents`
  ADD COLUMN `mime_type` VARCHAR(100) NULL AFTER `file_name`,
  ADD COLUMN `file_data` LONGBLOB NULL AFTER `mime_type`,
  MODIFY COLUMN `file_path` VARCHAR(500) NULL;

-- ========== 3. Profile photo LONGBLOB ==========
UPDATE `employees`
SET `profile_photo` = NULL
WHERE `profile_photo` IS NOT NULL
  AND (
    `profile_photo` LIKE '/%'
    OR `profile_photo` LIKE 'http%'
    OR `profile_photo` LIKE 'https%'
  );

ALTER TABLE `employees`
  MODIFY COLUMN `profile_photo` LONGBLOB NULL;
