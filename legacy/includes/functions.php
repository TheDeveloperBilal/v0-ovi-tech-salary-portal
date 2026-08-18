<?php
function sanitize($data) {
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

function formatCurrency($amount) {
    return 'Rs. ' . number_format($amount, 2);
}

function formatDate($date, $format = DISPLAY_DATE_FORMAT) {
    return date($format, strtotime($date));
}

function getMonthName($month) {
    $months = [
        '01' => 'January', '02' => 'February', '03' => 'March', '04' => 'April',
        '05' => 'May', '06' => 'June', '07' => 'July', '08' => 'August',
        '09' => 'September', '10' => 'October', '11' => 'November', '12' => 'December'
    ];
    return isset($months[$month]) ? $months[$month] : '';
}

function calculateSalaryTotals($salary) {
    $earnings = [
        'base_salary' => $salary['base_salary'] ?? 0,
        'hra' => $salary['hra'] ?? 0,
        'dearness_allowance' => $salary['dearness_allowance'] ?? 0,
        'medical_allowance' => $salary['medical_allowance'] ?? 0,
        'transport_allowance' => $salary['transport_allowance'] ?? 0,
        'other_allowance' => $salary['other_allowance'] ?? 0
    ];
    
    $deductions = [
        'pf_deduction' => $salary['pf_deduction'] ?? 0,
        'esi_deduction' => $salary['esi_deduction'] ?? 0,
        'income_tax' => $salary['income_tax'] ?? 0,
        'loan_deduction' => $salary['loan_deduction'] ?? 0,
        'other_deduction' => $salary['other_deduction'] ?? 0
    ];
    
    $total_earnings = array_sum($earnings);
    $total_deductions = array_sum($deductions);
    $net_salary = $total_earnings - $total_deductions;
    
    return [
        'earnings' => $earnings,
        'total_earnings' => $total_earnings,
        'deductions' => $deductions,
        'total_deductions' => $total_deductions,
        'net_salary' => $net_salary
    ];
}

function getUserById($userId) {
    global $pdo;
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    return $stmt->fetch();
}

function getEmployeeById($employeeId) {
    global $pdo;
    $stmt = $pdo->prepare('SELECT * FROM employees WHERE id = ?');
    $stmt->execute([$employeeId]);
    return $stmt->fetch();
}

function getAllEmployees($page = 1, $limit = ITEMS_PER_PAGE) {
    global $pdo;
    $offset = ($page - 1) * $limit;
    $stmt = $pdo->prepare('SELECT * FROM employees WHERE is_active = 1 ORDER BY first_name ASC LIMIT ? OFFSET ?');
    $stmt->execute([$limit, $offset]);
    return $stmt->fetchAll();
}

function getEmployeeCount() {
    global $pdo;
    $stmt = $pdo->query('SELECT COUNT(*) as count FROM employees WHERE is_active = 1');
    return $stmt->fetch()['count'];
}

function getSalaryStructure($employeeId, $month, $year) {
    global $pdo;
    $stmt = $pdo->prepare('SELECT * FROM salary_structures WHERE employee_id = ? AND month = ? AND year = ?');
    $stmt->execute([$employeeId, $month, $year]);
    return $stmt->fetch();
}

function saveSalaryStructure($data) {
    global $pdo;
    
    $existingSalary = getSalaryStructure($data['employee_id'], $data['month'], $data['year']);
    
    if ($existingSalary) {
        $stmt = $pdo->prepare('
            UPDATE salary_structures SET 
            base_salary = ?, hra = ?, dearness_allowance = ?, medical_allowance = ?,
            transport_allowance = ?, other_allowance = ?, pf_deduction = ?, esi_deduction = ?,
            income_tax = ?, loan_deduction = ?, other_deduction = ?
            WHERE id = ?
        ');
        return $stmt->execute([
            $data['base_salary'], $data['hra'], $data['dearness_allowance'],
            $data['medical_allowance'], $data['transport_allowance'], $data['other_allowance'],
            $data['pf_deduction'], $data['esi_deduction'], $data['income_tax'],
            $data['loan_deduction'], $data['other_deduction'], $existingSalary['id']
        ]);
    } else {
        $stmt = $pdo->prepare('
            INSERT INTO salary_structures 
            (employee_id, month, year, base_salary, hra, dearness_allowance, medical_allowance,
             transport_allowance, other_allowance, pf_deduction, esi_deduction, income_tax,
             loan_deduction, other_deduction)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        return $stmt->execute([
            $data['employee_id'], $data['month'], $data['year'], $data['base_salary'],
            $data['hra'], $data['dearness_allowance'], $data['medical_allowance'],
            $data['transport_allowance'], $data['other_allowance'], $data['pf_deduction'],
            $data['esi_deduction'], $data['income_tax'], $data['loan_deduction'],
            $data['other_deduction']
        ]);
    }
}

function addEmployee($data) {
    global $pdo;
    $stmt = $pdo->prepare('
        INSERT INTO employees 
        (employee_id, first_name, last_name, email, phone, designation, 
         department, date_of_joining, bank_account, bank_name, pan, aadhar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    return $stmt->execute([
        $data['employee_id'], $data['first_name'], $data['last_name'],
        $data['email'], $data['phone'], $data['designation'], $data['department'],
        $data['date_of_joining'], $data['bank_account'], $data['bank_name'],
        $data['pan'], $data['aadhar']
    ]);
}

function updateEmployee($employeeId, $data) {
    global $pdo;
    $stmt = $pdo->prepare('
        UPDATE employees SET 
        employee_id = ?, first_name = ?, last_name = ?, email = ?, phone = ?,
        designation = ?, department = ?, date_of_joining = ?, bank_account = ?,
        bank_name = ?, pan = ?, aadhar = ?
        WHERE id = ?
    ');
    return $stmt->execute([
        $data['employee_id'], $data['first_name'], $data['last_name'], $data['email'],
        $data['phone'], $data['designation'], $data['department'], $data['date_of_joining'],
        $data['bank_account'], $data['bank_name'], $data['pan'], $data['aadhar'], $employeeId
    ]);
}

function getPaginationData($totalItems, $currentPage, $itemsPerPage = ITEMS_PER_PAGE) {
    $totalPages = ceil($totalItems / $itemsPerPage);
    return [
        'total_items' => $totalItems,
        'current_page' => max(1, min($currentPage, $totalPages)),
        'total_pages' => $totalPages,
        'items_per_page' => $itemsPerPage,
        'has_prev' => $currentPage > 1,
        'has_next' => $currentPage < $totalPages
    ];
}
?>
