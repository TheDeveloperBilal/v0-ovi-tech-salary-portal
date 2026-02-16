-- Reset all employees' leaves_taken to 0
UPDATE employees SET leaves_taken = 0;

-- Verify the update
SELECT id, first_name, last_name, leaves_taken FROM employees;
