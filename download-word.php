<?php
/**
 * Generate and Download Word Document Salary Slip
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

// Create Word document (using simple HTML converted to Word format)
$word = '<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Word.Document"?>
<w:wordDocument xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml" 
                xmlns:v="urn:schemas-microsoft-com:vml" 
                xmlns:o="urn:schemas-microsoft-com:office:office" 
                xmlns:st="http://schemas.microsoft.com/office/2000/stringTypes" 
                xmlns:wx="http://schemas.microsoft.com/office/word/2003/auxHint" 
                xmlns:aml="http://schemas.microsoft.com/aml/2001/core" 
                xmlns:w10="urn:schemas-microsoft-com:office:word" 
                xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" 
                w:macrosPresent="no" 
                w:embeddedObjPresent="no" 
                w:ocxPresent="no" 
                xml:space="preserve">
<o:DocumentProperties>
    <o:Title>Salary Slip</o:Title>
    <o:Author>OviTech Salary Portal</o:Author>
</o:DocumentProperties>
<w:body>
    <w:p><w:r><w:b/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t>OviTech Global Pvt Ltd</w:t></w:r></w:p>
    <w:p><w:r><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t>Salary Slip</w:t></w:r></w:p>
    <w:p><w:r><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t/></w:r></w:p>
    
    <w:p><w:r><w:b/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t>Period: ' . getMonthName(str_pad($month, 2, '0', STR_PAD_LEFT)) . ' ' . $year . '</w:t></w:r></w:p>
    
    <w:p><w:r><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t/></w:r></w:p>
    
    <w:p><w:r><w:b/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t>Employee Details:</w:t></w:r></w:p>
    <w:p><w:r><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t>Name: ' . sanitize($employee['first_name'] . ' ' . $employee['last_name']) . '</w:t></w:r></w:p>
    <w:p><w:r><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t>Employee ID: ' . sanitize($employee['employee_id']) . '</w:t></w:r></w:p>
    <w:p><w:r><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t>Designation: ' . sanitize($employee['designation']) . '</w:t></w:r></w:p>
    <w:p><w:r><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t>Department: ' . sanitize($employee['department']) . '</w:t></w:r></w:p>
    
    <w:p><w:r><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t/></w:r></w:p>
    
    <w:p><w:r><w:b/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t>EARNINGS</w:t></w:r></w:p>';

foreach ($totals['earnings'] as $key => $value) {
    $label = str_replace('_', ' ', ucfirst($key));
    $word .= '<w:p><w:r><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t>' . $label . ': ' . formatCurrency($value) . '</w:t></w:r></w:p>';
}

$word .= '<w:p><w:r><w:b/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t>Total Earnings: ' . formatCurrency($totals['total_earnings']) . '</w:t></w:r></w:p>
    <w:p><w:r><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t/></w:r></w:p>
    
    <w:p><w:r><w:b/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t>DEDUCTIONS</w:t></w:r></w:p>';

foreach ($totals['deductions'] as $key => $value) {
    if ($value > 0) {
        $label = str_replace('_', ' ', ucfirst($key));
        $word .= '<w:p><w:r><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t>' . $label . ': ' . formatCurrency($value) . '</w:t></w:r></w:p>';
    }
}

$word .= '<w:p><w:r><w:b/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t>Total Deductions: ' . formatCurrency($totals['total_deductions']) . '</w:t></w:r></w:p>
    <w:p><w:r><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t/></w:r></w:p>
    
    <w:p><w:r><w:b/><w:sz w:val="32"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t>NET SALARY: ' . formatCurrency($totals['net_salary']) . '</w:t></w:r></w:p>
    
    <w:p><w:r><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t/></w:r></w:p>
    <w:p><w:r><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:t>Generated on: ' . date('d-m-Y H:i:s') . '</w:t></w:r></w:p>
</w:body>
</w:wordDocument>';

header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
header('Content-Disposition: attachment; filename="Salary_Slip_' . $employee['employee_id'] . '_' . $month . '_' . $year . '.docx"');

echo $word;
?>
