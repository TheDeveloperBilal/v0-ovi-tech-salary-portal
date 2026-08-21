<?php
/**
 * Add Employee Page
 */
require_once 'config/database.php';
require_once 'config/constants.php';
require_once 'config/session.php';
require_once 'includes/functions.php';

requireAdmin();

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $employee_id = sanitize($_POST['employee_id'] ?? '');
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
    
    if (empty($employee_id) || empty($first_name) || empty($last_name)) {
        $error = 'All required fields must be filled';
    } else {
        try {
            $data = [
                'employee_id' => $employee_id,
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
            
            if (addEmployee($data)) {
                $success = 'Employee added successfully!';
                // Clear form
                $_POST = [];
            } else {
                $error = 'Failed to add employee';
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
    <title>Add Employee - OviTech Salary Portal</title>
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
            border: 1px solid #fcc;
        }
        
        .alert-success {
            background: #efe;
            color: #3c3;
            border: 1px solid #cfc;
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
            color: #333;
        }
        
        .form-group input,
        .form-group select {
            padding: 10px 12px;
            border: 2px solid #e0e0e0;
            border-radius: 4px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: <?php echo PRIMARY_COLOR; ?>;
        }
        
        .required::after {
            content: ' *';
            color: red;
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
            background: #ddd;
            color: #333;
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
            <div>
                <h1>Salary Portal</h1>
                <p style="font-size: 12px; opacity: 0.9;">OviTech Global Pvt Ltd</p>
            </div>
        </div>
        <div>
            <a href="dashboard.php">Back to Dashboard</a>
            <a href="logout.php">Logout</a>
        </div>
    </div>
    
    <div class="container">
        <div class="form-card">
            <h2>Add New Employee</h2>
            
            <?php if ($error): ?>
                <div class="alert alert-error"><?php echo $error; ?></div>
            <?php endif; ?>
            
            <?php if ($success): ?>
                <div class="alert alert-success"><?php echo $success; ?></div>
            <?php endif; ?>
            
            <form method="POST">
                <div class="form-row">
                    <div class="form-group">
                        <label for="employee_id" class="required">Employee ID</label>
                        <input type="text" id="employee_id" name="employee_id" value="<?php echo $_POST['employee_id'] ?? ''; ?>" required>
                    </div>
                    <div class="form-group">
                        <label for="first_name" class="required">First Name</label>
                        <input type="text" id="first_name" name="first_name" value="<?php echo $_POST['first_name'] ?? ''; ?>" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="last_name" class="required">Last Name</label>
                        <input type="text" id="last_name" name="last_name" value="<?php echo $_POST['last_name'] ?? ''; ?>" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" value="<?php echo $_POST['email'] ?? ''; ?>">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="phone">Phone</label>
                        <input type="tel" id="phone" name="phone" value="<?php echo $_POST['phone'] ?? ''; ?>">
                    </div>
                    <div class="form-group">
                        <label for="designation">Designation</label>
                        <input type="text" id="designation" name="designation" value="<?php echo $_POST['designation'] ?? ''; ?>">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="department">Department</label>
                        <input type="text" id="department" name="department" value="<?php echo $_POST['department'] ?? ''; ?>">
                    </div>
                    <div class="form-group">
                        <label for="date_of_joining">Date of Joining</label>
                        <input type="date" id="date_of_joining" name="date_of_joining" value="<?php echo $_POST['date_of_joining'] ?? ''; ?>">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="bank_account">Bank Account</label>
                        <input type="text" id="bank_account" name="bank_account" value="<?php echo $_POST['bank_account'] ?? ''; ?>">
                    </div>
                    <div class="form-group">
                        <label for="bank_name">Bank Name</label>
                        <input type="text" id="bank_name" name="bank_name" value="<?php echo $_POST['bank_name'] ?? ''; ?>">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="pan">PAN</label>
                        <input type="text" id="pan" name="pan" value="<?php echo $_POST['pan'] ?? ''; ?>">
                    </div>
                    <div class="form-group">
                        <label for="aadhar">Aadhar</label>
                        <input type="text" id="aadhar" name="aadhar" value="<?php echo $_POST['aadhar'] ?? ''; ?>">
                    </div>
                </div>
                
                <div class="btn-group">
                    <button type="submit" class="btn btn-primary">Add Employee</button>
                    <a href="dashboard.php" class="btn btn-secondary" style="text-decoration: none;">Cancel</a>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
