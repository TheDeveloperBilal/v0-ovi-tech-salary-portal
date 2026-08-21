<?php
/**
 * Admin Dashboard
 */
require_once 'config/database.php';
require_once 'config/constants.php';
require_once 'config/session.php';
require_once 'includes/functions.php';

requireAdmin();

$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$total_employees = getEmployeeCount();
$pagination = getPaginationData($total_employees, $page);
$employees = getAllEmployees($page);

// Get statistics
$stmt = $pdo->query('SELECT COUNT(*) as count FROM employees WHERE is_active = 1');
$total_count = $stmt->fetch()['count'];

$stmt = $pdo->query('SELECT COUNT(*) as count FROM salary_structures WHERE MONTH(DATE_FORMAT(CONCAT(year, \'-\', LPAD(month, 2, \'0\'), \'-01\'), \'%Y-%m-%d\')) = MONTH(CURDATE()) AND YEAR(DATE_FORMAT(CONCAT(year, \'-\', LPAD(month, 2, \'0\'), \'-01\'), \'%Y-%m-%d\')) = YEAR(CURDATE())');
$current_month_count = $stmt->fetch()['count'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - OviTech Salary Portal</title>
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
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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
        
        .header .user-menu {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .user-menu span {
            font-size: 14px;
        }
        
        .user-menu a {
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 15px;
            border-radius: 4px;
            color: white;
            text-decoration: none;
            font-size: 14px;
            transition: background 0.3s;
        }
        
        .user-menu a:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 30px 20px;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .stat-card h3 {
            color: #666;
            font-size: 13px;
            margin-bottom: 10px;
            text-transform: uppercase;
        }
        
        .stat-card .value {
            font-size: 32px;
            font-weight: bold;
            color: <?php echo PRIMARY_COLOR; ?>;
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .section-header h2 {
            font-size: 20px;
        }
        
        .btn-group {
            display: flex;
            gap: 10px;
        }
        
        .btn {
            padding: 10px 20px;
            background: <?php echo PRIMARY_COLOR; ?>;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            font-size: 14px;
            transition: background 0.3s;
        }
        
        .btn:hover {
            background: #5a3f8a;
        }
        
        .btn-secondary {
            background: #666;
        }
        
        .btn-secondary:hover {
            background: #555;
        }
        
        .table-container {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        thead {
            background: #f0f0f0;
            border-bottom: 2px solid #ddd;
        }
        
        th {
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
            color: #333;
        }
        
        td {
            padding: 12px 15px;
            border-bottom: 1px solid #eee;
        }
        
        tr:hover {
            background: #f9f9f9;
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
        }
        
        .btn-small {
            padding: 6px 12px;
            font-size: 12px;
            text-decoration: none;
        }
        
        .btn-primary {
            background: <?php echo PRIMARY_COLOR; ?>;
        }
        
        .btn-primary:hover {
            background: #5a3f8a;
        }
        
        .btn-info {
            background: #2196F3;
        }
        
        .btn-info:hover {
            background: #0b7dda;
        }
        
        .btn-danger {
            background: #f44336;
        }
        
        .btn-danger:hover {
            background: #da190b;
        }
        
        .pagination {
            display: flex;
            gap: 5px;
            justify-content: center;
            margin-top: 20px;
            padding: 20px 0;
        }
        
        .pagination a, .pagination span {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            text-decoration: none;
            color: <?php echo PRIMARY_COLOR; ?>;
        }
        
        .pagination a:hover {
            background: #f0f0f0;
        }
        
        .pagination .active {
            background: <?php echo PRIMARY_COLOR; ?>;
            color: white;
            border-color: <?php echo PRIMARY_COLOR; ?>;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-section">
            <img src="assets/ovitech-logo.png" alt="OviTech Logo">
            <div>
                <h1>Salary Portal</h1>
                <p style="font-size: 12px; opacity: 0.9;">OviTech Global Pvt Ltd</p>
            </div>
        </div>
        <div class="user-menu">
            <span><?php echo $_SESSION['name']; ?> (<?php echo ucfirst($_SESSION['role']); ?>)</span>
            <a href="settings.php">Settings</a>
            <a href="logout.php">Logout</a>
        </div>
    </div>
    
    <div class="container">
        <div class="stats">
            <div class="stat-card">
                <h3>Total Employees</h3>
                <div class="value"><?php echo $total_count; ?></div>
            </div>
            <div class="stat-card">
                <h3>Current Month Slips</h3>
                <div class="value"><?php echo $current_month_count; ?></div>
            </div>
            <div class="stat-card">
                <h3>Pending Slips</h3>
                <div class="value"><?php echo $total_count - $current_month_count; ?></div>
            </div>
        </div>
        
        <div class="section-header">
            <h2>Employees</h2>
            <div class="btn-group">
                <a href="add-employee.php" class="btn">+ Add Employee</a>
                <a href="bulk-salary.php" class="btn btn-secondary">Bulk Salary</a>
            </div>
        </div>
        
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Employee ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Designation</th>
                        <th>Department</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($employees as $emp): ?>
                    <tr>
                        <td><?php echo sanitize($emp['employee_id']); ?></td>
                        <td><?php echo sanitize($emp['first_name'] . ' ' . $emp['last_name']); ?></td>
                        <td><?php echo sanitize($emp['email']); ?></td>
                        <td><?php echo sanitize($emp['designation']); ?></td>
                        <td><?php echo sanitize($emp['department']); ?></td>
                        <td>
                            <div class="action-buttons">
                                <a href="edit-employee.php?id=<?php echo $emp['id']; ?>" class="btn btn-small btn-primary">Edit</a>
                                <a href="salary-slip.php?id=<?php echo $emp['id']; ?>" class="btn btn-small btn-info">Salary</a>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            
            <?php if ($pagination['total_pages'] > 1): ?>
            <div class="pagination">
                <?php if ($pagination['has_prev']): ?>
                    <a href="?page=1">First</a>
                    <a href="?page=<?php echo $pagination['current_page'] - 1; ?>">Prev</a>
                <?php endif; ?>
                
                <?php for ($i = 1; $i <= $pagination['total_pages']; $i++): ?>
                    <?php if ($i == $pagination['current_page']): ?>
                        <span class="active"><?php echo $i; ?></span>
                    <?php else: ?>
                        <a href="?page=<?php echo $i; ?>"><?php echo $i; ?></a>
                    <?php endif; ?>
                <?php endfor; ?>
                
                <?php if ($pagination['has_next']): ?>
                    <a href="?page=<?php echo $pagination['current_page'] + 1; ?>">Next</a>
                    <a href="?page=<?php echo $pagination['total_pages']; ?>">Last</a>
                <?php endif; ?>
            </div>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
