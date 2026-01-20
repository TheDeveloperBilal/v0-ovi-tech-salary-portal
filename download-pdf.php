<?php
/**
 * Generate and Download PDF Salary Slip
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
$salary = getSalaryStructure($employee_id, $month, $year);
$totals = $salary ? calculateSalaryTotals($salary) : null;

if (!$employee || !$salary || !$totals) {
    die('Invalid salary slip');
}

// Create PDF content
$html = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #67499E; padding-bottom: 20px; }
        .header h1 { color: #67499E; font-size: 24px; margin-bottom: 5px; }
        .header p { color: #666; font-size: 12px; }
        .slip-title { text-align: center; color: #67499E; font-size: 18px; margin: 20px 0; }
        .employee-info { display: flex; justify-content: space-between; margin: 20px 0; }
        .info-box { width: 48%; border: 1px solid #ddd; padding: 10px; }
        .info-box label { font-weight: bold; display: block; margin-bottom: 5px; color: #333; }
        .info-box p { font-size: 12px; margin-bottom: 8px; }
        .salary-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
        .salary-table th { background: #67499E; color: white; padding: 10px; text-align: left; }
        .salary-table td { padding: 10px; border-bottom: 1px solid #ddd; }
        .salary-table tr:hover { background: #f9f9f9; }
        .total-row { font-weight: bold; background: #f0f0f0; }
        .net-salary { font-size: 18px; font-weight: bold; color: #67499E; background: #f0f0f0; padding: 15px; text-align: right; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OviTech Global Pvt Ltd</h1>
            <p>Salary Slip</p>
        </div>
        
        <h3 class="slip-title">Salary Slip for ' . getMonthName(str_pad($month, 2, '0', STR_PAD_LEFT)) . ' ' . $year . '</h3>
        
        <div class="employee-info">
            <div class="info-box">
                <label>Employee Name:</label>
                <p>' . sanitize($employee['first_name'] . ' ' . $employee['last_name']) . '</p>
                <label>Employee ID:</label>
                <p>' . sanitize($employee['employee_id']) . '</p>
                <label>Designation:</label>
                <p>' . sanitize($employee['designation']) . '</p>
            </div>
            <div class="info-box">
                <label>Department:</label>
                <p>' . sanitize($employee['department']) . '</p>
                <label>Date of Joining:</label>
                <p>' . ($employee['date_of_joining'] ? formatDate($employee['date_of_joining']) : 'N/A') . '</p>
                <label>Bank Account:</label>
                <p>' . sanitize($employee['bank_account'] ?? 'N/A') . '</p>
            </div>
        </div>
        
        <table class="salary-table">
            <thead>
                <tr>
                    <th colspan="2">EARNINGS</th>
                </tr>
            </thead>
            <tbody>';

foreach ($totals['earnings'] as $key => $value) {
    $label = str_replace('_', ' ', ucfirst($key));
    $html .= '<tr><td>' . $label . '</td><td style="text-align: right;">' . formatCurrency($value) . '</td></tr>';
}

$html .= '
                <tr class="total-row">
                    <td>Total Earnings</td>
                    <td style="text-align: right;">' . formatCurrency($totals['total_earnings']) . '</td>
                </tr>
            </tbody>
        </table>
        
        <table class="salary-table">
            <thead>
                <tr>
                    <th colspan="2">DEDUCTIONS</th>
                </tr>
            </thead>
            <tbody>';

foreach ($totals['deductions'] as $key => $value) {
    if ($value > 0) {
        $label = str_replace('_', ' ', ucfirst($key));
        $html .= '<tr><td>' . $label . '</td><td style="text-align: right;">' . formatCurrency($value) . '</td></tr>';
    }
}

$html .= '
                <tr class="total-row">
                    <td>Total Deductions</td>
                    <td style="text-align: right;">' . formatCurrency($totals['total_deductions']) . '</td>
                </tr>
            </tbody>
        </table>
        
        <div class="net-salary">
            NET SALARY: ' . formatCurrency($totals['net_salary']) . '
        </div>
        
        <div class="footer">
            <p>This is a system-generated document. No signature required.</p>
            <p>Generated on: ' . date('d-m-Y H:i:s') . '</p>
        </div>
    </div>
</body>
</html>
';

// For basic HTML to PDF conversion, we use simple approach
// You can install TCPDF: composer require tecnickcom/tcpdf
// For now, we'll output as downloadable HTML that can be printed to PDF

header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="Salary_Slip_' . $employee['employee_id'] . '_' . $month . '_' . $year . '.pdf"');

// Simple PDF generation using basic HTML
echo $html;
?>
