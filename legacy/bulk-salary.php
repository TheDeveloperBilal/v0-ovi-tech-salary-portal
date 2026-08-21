<?php
/**
 * Bulk Salary Slip Generation
 */
require_once 'config/database.php';
require_once 'config/constants.php';
require_once 'config/session.php';
require_once 'includes/functions.php';

requireAdmin();

$month = isset($_GET['month']) ? (int)$_GET['month'] : date('m');
$year = isset($_GET['year']) ? (int)$_GET['year'] : date('Y');

// Get all employees with their current salary
$stmt = $pdo->prepare('
    SELECT e.*, ss.id as salary_id FROM employees e
    LEFT JOIN salary_structures ss ON e.id = ss.employee_id AND ss.month = ? AND ss.year = ?
    WHERE e.is_active = 1
    ORDER BY e.first_name ASC
');
$stmt->execute([$month, $year]);
$employees_with_salary = $stmt->fetchAll();

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        foreach ($employees_with_salary as $emp) {
            $salary_key = 'salary_' . $emp['id'];
            if (isset($_POST[$salary_key])) {
                $salary_data = json_decode($_POST[$salary_key], true);
                $salary_data['employee_id'] = $emp['id'];
                $salary_data['month'] = $month;
                $salary_data['year'] = $year;
                saveSalaryStructure($salary_data);
            }
        }
        $success = 'All salary slips updated successfully!';
    } catch (Exception $e) {
        $error = 'Error: ' . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bulk Salary Generation - OviTech Salary Portal</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f5f5f5;
        }
        
        .header {
            background: <?php echo PRIMARY_COLOR; ?>;
            color: white;
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .header img {
            height: 40px;
        }
        
        .header a {
            color: white;
            text-decoration: none;
            margin-left: 10px;
        }
        
        .container {
            max-width: 1200px;
            margin: 30px auto;
            padding: 0 20px;
        }
        
        .card {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }
        
        .card h2 {
            color: <?php echo PRIMARY_COLOR; ?>;
            margin-bottom: 20px;
        }
        
        .alert {
            padding: 12px 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        
        .alert-error {
            background: #fee;
            color: #c33;
        }
        
        .alert-success {
            background: #efe;
            color: #3c3;
        }
        
        .month-selector {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .month-selector select {
            padding: 8px 12px;
            border: 2px solid #e0e0e0;
            border-radius: 4px;
        }
        
        .month-selector button {
            padding: 8px 20px;
            background: <?php echo PRIMARY_COLOR; ?>;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .table-container {
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        thead {
            background: #f0f0f0;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        .form-group {
            display: inline-block;
            margin-right: 10px;
        }
        
        .form-group input {
            padding: 6px;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 80px;
            font-size: 12px;
        }
        
        .btn {
            padding: 12px 30px;
            background: <?php echo PRIMARY_COLOR; ?>;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            margin-top: 20px;
        }
        
        .btn:hover {
            background: #5a3f8a;
        }
    </style>
    <script>
        function autoCalculate(empId) {
            const baseSalary = parseFloat(document.getElementById('base_' + empId).value) || 0;
            const pf = baseSalary * 0.12;
            const hra = baseSalary * 0.20;
            
            document.getElementById('hra_' + empId).value = hra.toFixed(2);
            document.getElementById('pf_' + empId).value = pf.toFixed(2);
        }
    </script>
</head>
<body>
    <div class="header">
        <div class="logo-section">
            <img src="assets/ovitech-logo.png" alt="OviTech Logo">
            <h1>Bulk Salary Generation</h1>
        </div>
        <div>
            <a href="dashboard.php">Dashboard</a>
            <a href="logout.php">Logout</a>
        </div>
    </div>
    
    <div class="container">
        <div class="card">
            <?php if ($error): ?>
                <div class="alert alert-error"><?php echo $error; ?></div>
            <?php endif; ?>
            
            <?php if ($success): ?>
                <div class="alert alert-success"><?php echo $success; ?></div>
            <?php endif; ?>
            
            <div class="month-selector">
                <form method="GET" style="display: flex; gap: 10px;">
                    <select name="month" onchange="this.form.submit()">
                        <?php for ($m = 1; $m <= 12; $m++): ?>
                            <option value="<?php echo str_pad($m, 2, '0', STR_PAD_LEFT); ?>" <?php echo ($month == $m) ? 'selected' : ''; ?>>
                                <?php echo getMonthName(str_pad($m, 2, '0', STR_PAD_LEFT)); ?>
                            </option>
                        <?php endfor; ?>
                    </select>
                    
                    <select name="year" onchange="this.form.submit()">
                        <?php for ($y = date('Y') - 2; $y <= date('Y') + 1; $y++): ?>
                            <option value="<?php echo $y; ?>" <?php echo ($year == $y) ? 'selected' : ''; ?>>
                                <?php echo $y; ?>
                            </option>
                        <?php endfor; ?>
                    </select>
                </form>
            </div>
            
            <form method="POST">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Employee ID</th>
                                <th>Name</th>
                                <th>Base Salary</th>
                                <th>HRA</th>
                                <th>PF</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($employees_with_salary as $emp): ?>
                            <tr>
                                <td><?php echo sanitize($emp['employee_id']); ?></td>
                                <td><?php echo sanitize($emp['first_name'] . ' ' . $emp['last_name']); ?></td>
                                <td>
                                    <div class="form-group">
                                        <input type="number" id="base_<?php echo $emp['id']; ?>" placeholder="Base" step="0.01" onchange="autoCalculate(<?php echo $emp['id']; ?>)">
                                    </div>
                                </td>
                                <td>
                                    <div class="form-group">
                                        <input type="number" id="hra_<?php echo $emp['id']; ?>" placeholder="HRA" step="0.01">
                                    </div>
                                </td>
                                <td>
                                    <div class="form-group">
                                        <input type="number" id="pf_<?php echo $emp['id']; ?>" placeholder="PF" step="0.01">
                                    </div>
                                </td>
                                <td><?php echo $emp['salary_id'] ? '✓ Exists' : '○ New'; ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                
                <button type="submit" class="btn">Save All Salary Slips</button>
            </form>
        </div>
    </div>
</body>
</html>
