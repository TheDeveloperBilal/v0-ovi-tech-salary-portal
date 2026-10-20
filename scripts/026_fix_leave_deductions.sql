-- Migration 026: Restore wrongly deducted leaves
--
-- The old approval logic deducted from the 14-day annual quota for ALL leave
-- types except work_from_home. Only casual_leave and sick_leave should consume
-- quota. early_out and other should not deduct at all. half_day used 0.5/day
-- but the correct rule is 3 half days = 1 leave day.
--
-- Run STEP 1 first to review affected employees, then run STEP 2 to apply.

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: REVIEW — run this first to see which employees are affected
-- ═══════════════════════════════════════════════════════════════════════════

WITH wrong_deductions AS (
  SELECT
    lr.employee_id,
    e.first_name,
    e.last_name,
    e.employee_id AS emp_code,
    e.leaves_taken,
    SUM(
      (SELECT COUNT(*)
       FROM generate_series(lr.start_date::date, lr.end_date::date, '1 day'::interval) d
       WHERE EXTRACT(dow FROM d) BETWEEN 1 AND 5)
    ) AS wrongly_deducted_days
  FROM leave_requests lr
  JOIN employees e ON e.id = lr.employee_id
  WHERE lr.status = 'approved'
    AND lr.leave_type IN ('early_out', 'other')
  GROUP BY lr.employee_id, e.first_name, e.last_name, e.employee_id, e.leaves_taken
),
half_day_corrections AS (
  SELECT
    lr.employee_id,
    SUM(
      (SELECT COUNT(*)
       FROM generate_series(lr.start_date::date, lr.end_date::date, '1 day'::interval) d
       WHERE EXTRACT(dow FROM d) BETWEEN 1 AND 5)
    ) AS total_half_day_dates,
    SUM(
      (SELECT COUNT(*)
       FROM generate_series(lr.start_date::date, lr.end_date::date, '1 day'::interval) d
       WHERE EXTRACT(dow FROM d) BETWEEN 1 AND 5)
    ) * 0.5 AS old_deduction,
    FLOOR(
      SUM(
        (SELECT COUNT(*)
         FROM generate_series(lr.start_date::date, lr.end_date::date, '1 day'::interval) d
         WHERE EXTRACT(dow FROM d) BETWEEN 1 AND 5)
      ) / 3.0
    ) AS new_deduction
  FROM leave_requests lr
  WHERE lr.status = 'approved'
    AND lr.leave_type = 'half_day'
  GROUP BY lr.employee_id
)
SELECT
  COALESCE(wd.employee_id, hd.employee_id) AS employee_id,
  COALESCE(wd.first_name, e2.first_name) AS first_name,
  COALESCE(wd.last_name, e2.last_name) AS last_name,
  COALESCE(wd.emp_code, e2.employee_id) AS emp_code,
  COALESCE(wd.leaves_taken, e2.leaves_taken) AS current_leaves_taken,
  COALESCE(wd.wrongly_deducted_days, 0) AS early_out_other_restore,
  COALESCE(hd.old_deduction - hd.new_deduction, 0) AS half_day_restore,
  COALESCE(wd.wrongly_deducted_days, 0) + COALESCE(hd.old_deduction - hd.new_deduction, 0) AS total_restore
FROM wrong_deductions wd
FULL OUTER JOIN half_day_corrections hd ON wd.employee_id = hd.employee_id
LEFT JOIN employees e2 ON e2.id = hd.employee_id;


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: APPLY — run this ONLY after reviewing STEP 1 output
-- ═══════════════════════════════════════════════════════════════════════════

-- WITH wrong_deductions AS (
--   SELECT
--     lr.employee_id,
--     SUM(
--       (SELECT COUNT(*)
--        FROM generate_series(lr.start_date::date, lr.end_date::date, '1 day'::interval) d
--        WHERE EXTRACT(dow FROM d) BETWEEN 1 AND 5)
--     ) AS wrongly_deducted_days
--   FROM leave_requests lr
--   WHERE lr.status = 'approved'
--     AND lr.leave_type IN ('early_out', 'other')
--   GROUP BY lr.employee_id
-- ),
-- half_day_corrections AS (
--   SELECT
--     lr.employee_id,
--     SUM(
--       (SELECT COUNT(*)
--        FROM generate_series(lr.start_date::date, lr.end_date::date, '1 day'::interval) d
--        WHERE EXTRACT(dow FROM d) BETWEEN 1 AND 5)
--     ) * 0.5 AS old_deduction,
--     FLOOR(
--       SUM(
--         (SELECT COUNT(*)
--          FROM generate_series(lr.start_date::date, lr.end_date::date, '1 day'::interval) d
--          WHERE EXTRACT(dow FROM d) BETWEEN 1 AND 5)
--       ) / 3.0
--     ) AS new_deduction
--   FROM leave_requests lr
--   WHERE lr.status = 'approved'
--     AND lr.leave_type = 'half_day'
--   GROUP BY lr.employee_id
-- ),
-- corrections AS (
--   SELECT
--     COALESCE(wd.employee_id, hd.employee_id) AS employee_id,
--     COALESCE(wd.wrongly_deducted_days, 0) + COALESCE(hd.old_deduction - hd.new_deduction, 0) AS total_restore
--   FROM wrong_deductions wd
--   FULL OUTER JOIN half_day_corrections hd ON wd.employee_id = hd.employee_id
--   WHERE COALESCE(wd.wrongly_deducted_days, 0) + COALESCE(hd.old_deduction - hd.new_deduction, 0) > 0
-- )
-- UPDATE employees e
-- SET leaves_taken = GREATEST(0, e.leaves_taken - c.total_restore)
-- FROM corrections c
-- WHERE e.id = c.employee_id;
