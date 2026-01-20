<?php
/**
 * Salary Slip - Generate and Edit
 */
require_once 'config/database.php';
require_once 'config/constants.php';
require_once 'config/session.php';
require_once 'includes/functions.php';

requireLogin();

$employee_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$month = isset($_GET['month']) ? (int)$_GET['month'] : date('m');
$year = isset($_GET['year']) ? (int)$_GET['year'] : date('Y');

$employee = getEmployeeById($employee_id);
if (!$employee) {
    die('Employee not found');
}

$salary = getSalaryStructure($employee_id, $month, $year);

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isAdmin()) {
        die('Unauthorized');
    }
    
    $data = [
        'employee_id' => $employee_id,
        'month' => (int)$_POST['month'],
        'year' => (int)$_POST['year'],
        'base_salary' => (float)$_POST['base_salary'],
        'hra' => (float)($_POST['hra'] ?? 0),
        'dearness_allowance' => (float)($_POST['dearness_allowance'] ?? 0),
        'medical_allowance' => (float)($_POST['medical_allowance'] ?? 0),
        'transport_allowance' => (float)($_POST['transport_allowance'] ?? 0),
        'other_allowance' => (float)($_POST['other_allowance'] ?? 0),
        'pf_deduction' => (float)($_POST['pf_deduction'] ?? 0),
        'esi_deduction' => (float)($_POST['esi_deduction'] ?? 0),
        'income_tax' => (float)($_POST['income_tax'] ?? 0),
        'loan_deduction' => (float)($_POST['loan_deduction'] ?? 0),
        'other_deduction' => (float)($_POST['other_deduction'] ?? 0)
    ];
    
    if (saveSalaryStructure($data)) {
        $success = 'Salary slip saved successfully!';
        $salary = $data;
    } else {
        $error = 'Failed to save salary slip';
    }
}

$totals = $salary ? calculateSalaryTotals($salary) : null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Salary Slip - OviTech Salary Portal</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f5f5f5;
            color: <?php echo TEXT_COLOR; ?>;
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
        
        .header h1 {
            font-size: 24px;
        }
        
        .header .user-menu a {
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 15px;
            border-radius: 4px;
            color: white;
            text-decoration: none;
            font-size: 14px;
            margin-left: 10px;
        }
        
        .container {
            max-width: 1000px;
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
            margin-bottom: 20px;
            color: <?php echo PRIMARY_COLOR; ?>;
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
        
        .month-year-selector {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .month-year-selector select {
            padding: 8px 12px;
            border: 2px solid #e0e0e0;
            border-radius: 4px;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
        }
        
        .form-group label {
            margin-bottom: 8px;
            font-weight: 500;
            font-size: 14px;
        }
        
        .form-group input {
            padding: 10px 12px;
            border: 2px solid #e0e0e0;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: <?php echo PRIMARY_COLOR; ?>;
        }
        
        .salary-section {
            margin-bottom: 30px;
        }
        
        .salary-section h3 {
            color: <?php echo PRIMARY_COLOR; ?>;
            margin-bottom: 15px;
            font-size: 16px;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 10px;
        }
        
        .salary-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .salary-item.total {
            font-weight: bold;
            background: #f9f9f9;
            padding: 10px;
            margin-top: 10px;
        }
        
        .salary-item label {
            font-weight: 500;
        }
        
        .salary-item .value {
            color: <?php echo PRIMARY_COLOR; ?>;
            font-weight: 600;
        }
        
        .btn-group {
            display: flex;
            gap: 10px;
            margin-top: 30px;
        }
        
        .btn {
            padding: 12px 30px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            transition: background 0.3s;
        }
        
        .btn-primary {
            background: <?php echo PRIMARY_COLOR; ?>;
            color: white;
        }
        
        .btn-primary:hover {
            background: #5a3f8a;
        }
        
        .btn-secondary {
            background: #666;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #555;
        }
        
        .btn-success {
            background: #4CAF50;
            color: white;
        }
        
        .btn-success:hover {
            background: #45a049;
        }
        
        .slip-preview {
            border: 1px solid #ddd;
            padding: 30px;
            background: white;
            margin-top: 20px;
        }
        
        @media print {
            .btn-group, .header, .alert, .form-row, .month-year-selector {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-section">
            <img src="assets/ovitech-logo.png" alt="OviTech Logo">
            <h1>Salary Slip</h1>
        </div>
        <div>
            <a href="dashboard.php">Back</a>
            <a href="logout.php">Logout</a>
        </div>
    </div>
    
    <div class="container">
        <?php if ($error): ?>
            <div class="alert alert-error"><?php echo $error; ?></div>
        <?php endif; ?>
        
        <?php if ($success): ?>
            <div class="alert alert-success"><?php echo $success; ?></div>
        <?php endif; ?>
        
        <div class="card">
            <h2>Salary Slip for <?php echo sanitize($employee['first_name'] . ' ' . $employee['last_name']); ?></h2>
            
            <div class="month-year-selector">
                <form method="GET" style="display: flex; gap: 10px;">
                    <input type="hidden" name="id" value="<?php echo $employee_id; ?>">
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
            
            <?php if (isAdmin()): ?>
            <form method="POST">
                <div class="salary-section">
                    <h3>Basic Details</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Employee ID</label>
                            <input type="text" value="<?php echo sanitize($employee['employee_id']); ?>" readonly>
                        </div>
                        <div class="form-group">
                            <label>Designation</label>
                            <input type="text" value="<?php echo sanitize($employee['designation']); ?>" readonly>
                        </div>
                    </div>
                </div>
                
                <div class="salary-section">
                    <h3>Earnings</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="base_salary">Base Salary</label>
                            <input type="number" id="base_salary" name="base_salary" step="0.01" value="<?php echo $salary['base_salary'] ?? 0; ?>" required>
                        </div>
                        <div class="form-group">
                            <label for="hra">HRA</label>
                            <input type="number" id="hra" name="hra" step="0.01" value="<?php echo $salary['hra'] ?? 0; ?>">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="dearness_allowance">Dearness Allowance</label>
                            <input type="number" id="dearness_allowance" name="dearness_allowance" step="0.01" value="<?php echo $salary['dearness_allowance'] ?? 0; ?>">
                        </div>
                        <div class="form-group">
                            <label for="medical_allowance">Medical Allowance</label>
                            <input type="number" id="medical_allowance" name="medical_allowance" step="0.01" value="<?php echo $salary['medical_allowance'] ?? 0; ?>">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="transport_allowance">Transport Allowance</label>
                            <input type="number" id="transport_allowance" name="transport_allowance" step="0.01" value="<?php echo $salary['transport_allowance'] ?? 0; ?>">
                        </div>
                        <div class="form-group">
                            <label for="other_allowance">Other Allowance</label>
                            <input type="number" id="other_allowance" name="other_allowance" step="0.01" value="<?php echo $salary['other_allowance'] ?? 0; ?>">
                        </div>
                    </div>
                </div>
                
                <div class="salary-section">
                    <h3>Deductions</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="pf_deduction">PF Deduction</label>
                            <input type="number" id="pf_deduction" name="pf_deduction" step="0.01" value="<?php echo $salary['pf_deduction'] ?? 0; ?>">
                        </div>
                        <div class="form-group">
                            <label for="esi_deduction">ESI Deduction</label>
                            <input type="number" id="esi_deduction" name="esi_deduction" step="0.01" value="<?php echo $salary['esi_deduction'] ?? 0; ?>">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="income_tax">Income Tax</label>
                            <input type="number" id="income_tax" name="income_tax" step="0.01" value="<?php echo $salary['income_tax'] ?? 0; ?>">
                        </div>
                        <div class="form-group">
                            <label for="loan_deduction">Loan Deduction</label>
                            <input type="number" id="loan_deduction" name="loan_deduction" step="0.01" value="<?php echo $salary['loan_deduction'] ?? 0; ?>">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="other_deduction">Other Deduction</label>
                            <input type="number" id="other_deduction" name="other_deduction" step="0.01" value="<?php echo $salary['other_deduction'] ?? 0; ?>">
                        </div>
                    </div>
                </div>
                
                <input type="hidden" name="month" value="<?php echo $month; ?>">
                <input type="hidden" name="year" value="<?php echo $year; ?>">
                
                <div class="btn-group">
                    <button type="submit" class="btn btn-primary">Save Salary Slip</button>
                    <a href="download-pdf.php?id=<?php echo $employee_id; ?>&month=<?php echo $month; ?>&year=<?php echo $year; ?>" class="btn btn-success">Download PDF</a>
                    <a href="download-word.php?id=<?php echo $employee_id; ?>&month=<?php echo $month; ?>&year=<?php echo $year; ?>" class="btn btn-success">Download Word</a>
                    <button type="button" class="btn btn-secondary" onclick="window.print()">Print</button>
                </div>
            </form>
            <?php endif; ?>
            
            <?php if ($totals): ?>
            <div class="slip-preview">
                <h3 style="text-align: center; margin-bottom: 20px;">Salary Slip for <?php echo getMonthName(str_pad($month, 2, '0', STR_PAD_LEFT)) . ' ' . $year; ?></h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                    <div class="salary-section">
                        <h4 style="color: <?php echo PRIMARY_COLOR; ?>; margin-bottom: 15px;">EARNINGS</h4>
                        <?php foreach ($totals['earnings'] as $key => $value): ?>
                            <div class="salary-item">
                                <label><?php echo str_replace('_', ' ', ucfirst($key)); ?></label>
                                <span class="value"><?php echo formatCurrency($value); ?></span>
                            </div>
                        <?php endforeach; ?>
                        <div class="salary-item total">
                            <label>Total Earnings</label>
                            <span class="value"><?php echo formatCurrency($totals['total_earnings']); ?></span>
                        </div>
                    </div>
                    
                    <div class="salary-section">
                        <h4 style="color: <?php echo PRIMARY_COLOR; ?>; margin-bottom: 15px;">DEDUCTIONS</h4>
                        <?php foreach ($totals['deductions'] as $key => $value): ?>
                            <div class="salary-item">
                                <label><?php echo str_replace('_', ' ', ucfirst($key)); ?></label>
                                <span class="value"><?php echo formatCurrency($value); ?></span>
                            </div>
                        <?php endforeach; ?>
                        <div class="salary-item total">
                            <label>Total Deductions</label>
                            <span class="value"><?php echo formatCurrency($totals['total_deductions']); ?></span>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #ddd;">
                    <div class="salary-item total">
                        <label style="font-size: 18px;">NET SALARY</label>
                        <span class="value" style="font-size: 18px;"><?php echo formatCurrency($totals['net_salary']); ?></span>
                    </div>
                </div>
            </div>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
