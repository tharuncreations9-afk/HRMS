-- Clear legacy file paths / URLs before converting to LONGBLOB
UPDATE `employees`
SET `profile_photo` = NULL
WHERE `profile_photo` IS NOT NULL
  AND (
    `profile_photo` LIKE '/%'
    OR `profile_photo` LIKE 'http%'
    OR `profile_photo` LIKE 'https%'
  );

ALTER TABLE `employees` MODIFY COLUMN `profile_photo` LONGBLOB NULL;
