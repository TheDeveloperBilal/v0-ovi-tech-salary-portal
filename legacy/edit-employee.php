<?php
/**
 * Edit Employee Page
 */
require_once 'config/database.php';
require_once 'config/constants.php';
require_once 'config/session.php';
require_once 'includes/functions.php';

requireAdmin();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$employee = getEmployeeById($id);

if (!$employee) {
    header('Location: dashboard.php?error=Employee not found');
    exit;
}

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $first_name = sanitize($_POST['first_name'] ?? '');
    $last_name = sanitize($_POST['last_name'] ?? '');
    $email = sanitize($_POST['email'] ?? '');
    $phone = sanitize($_POST['phone'] ?? '');
    $designation = sanitize($_POST['designation'] ?? '');
    $department = sanitize($_POST['department'] ?? '');
    $date_of_joining = sanitize($_POST['date_of_joining'] ?? '');
    $bank_account = sanitize($_POST['bank_account'] ?? '');
    $bank_name = sanitize($_POST['bank_name'] ?? '');
    $pan = sanitize($_POST['pan'] ?? '');
    $aadhar = sanitize($_POST['aadhar'] ?? '');
    
    if (empty($first_name) || empty($last_name)) {
        $error = 'Name fields are required';
    } else {
        try {
            $data = [
                'employee_id' => $employee['employee_id'],
                'first_name' => $first_name,
                'last_name' => $last_name,
                'email' => $email,
                'phone' => $phone,
                'designation' => $designation,
                'department' => $department,
                'date_of_joining' => $date_of_joining,
                'bank_account' => $bank_account,
                'bank_name' => $bank_name,
                'pan' => $pan,
                'aadhar' => $aadhar
            ];
            
            if (updateEmployee($id, $data)) {
                $success = 'Employee updated successfully!';
                $employee = array_merge($employee, $data);
            } else {
                $error = 'Failed to update employee';
            }
        } catch (Exception $e) {
            $error = 'Error: ' . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Employee - OviTech Salary Portal</title>
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
        
        .header h1 {
            font-size: 24px;
        }
        
        .header a {
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 15px;
            border-radius: 4px;
            color: white;
            text-decoration: none;
            font-size: 14px;
            margin-left: 10px;
        }
        
        .container {
            max-width: 800px;
            margin: 30px auto;
            padding: 0 20px;
        }
        
        .form-card {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .form-card h2 {
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
        }
        
        .btn-primary {
            background: <?php echo PRIMARY_COLOR; ?>;
            color: white;
        }
        
        .btn-primary:hover {
            background: #5a3f8a;
        }
        
        .btn-secondary {
            background: #ddd;
        }
        
        .btn-secondary:hover {
            background: #ccc;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-section">
            <img src="assets/ovitech-logo.png" alt="OviTech Logo">
            <h1>Salary Portal</h1>
        </div>
        <div>
            <a href="dashboard.php">Back</a>
            <a href="logout.php">Logout</a>
        </div>
    </div>
    
    <div class="container">
        <div class="form-card">
            <h2>Edit Employee - <?php echo sanitize($employee['first_name'] . ' ' . $employee['last_name']); ?></h2>
            
            <?php if ($error): ?>
                <div class="alert alert-error"><?php echo $error; ?></div>
            <?php endif; ?>
            
            <?php if ($success): ?>
                <div class="alert alert-success"><?php echo $success; ?></div>
            <?php endif; ?>
            
            <form method="POST">
                <div class="form-row">
                    <div class="form-group">
                        <label>Employee ID (Read-only)</label>
                        <input type="text" value="<?php echo sanitize($employee['employee_id']); ?>" readonly>
                    </div>
                    <div class="form-group">
                        <label for="first_name">First Name</label>
                        <input type="text" id="first_name" name="first_name" value="<?php echo sanitize($employee['first_name']); ?>" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="last_name">Last Name</label>
                        <input type="text" id="last_name" name="last_name" value="<?php echo sanitize($employee['last_name']); ?>" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" value="<?php echo sanitize($employee['email'] ?? ''); ?>">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="phone">Phone</label>
                        <input type="tel" id="phone" name="phone" value="<?php echo sanitize($employee['phone'] ?? ''); ?>">
                    </div>
                    <div class="form-group">
                        <label for="designation">Designation</label>
                        <input type="text" id="designation" name="designation" value="<?php echo sanitize($employee['designation'] ?? ''); ?>">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="department">Department</label>
                        <input type="text" id="department" name="department" value="<?php echo sanitize($employee['department'] ?? ''); ?>">
                    </div>
                    <div class="form-group">
                        <label for="date_of_joining">Date of Joining</label>
                        <input type="date" id="date_of_joining" name="date_of_joining" value="<?php echo sanitize($employee['date_of_joining'] ?? ''); ?>">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="bank_account">Bank Account</label>
                        <input type="text" id="bank_account" name="bank_account" value="<?php echo sanitize($employee['bank_account'] ?? ''); ?>">
                    </div>
                    <div class="form-group">
                        <label for="bank_name">Bank Name</label>
                        <input type="text" id="bank_name" name="bank_name" value="<?php echo sanitize($employee['bank_name'] ?? ''); ?>">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="pan">PAN</label>
                        <input type="text" id="pan" name="pan" value="<?php echo sanitize($employee['pan'] ?? ''); ?>">
                    </div>
                    <div class="form-group">
                        <label for="aadhar">Aadhar</label>
                        <input type="text" id="aadhar" name="aadhar" value="<?php echo sanitize($employee['aadhar'] ?? ''); ?>">
                    </div>
                </div>
                
                <div class="btn-group">
                    <button type="submit" class="btn btn-primary">Update Employee</button>
                    <a href="dashboard.php" class="btn btn-secondary">Cancel</a>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
