<?php
/**
 * Settings Page
 */
require_once 'config/database.php';
require_once 'config/constants.php';
require_once 'config/session.php';
require_once 'includes/functions.php';

requireAdmin();

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $settings = [
        'company_name' => sanitize($_POST['company_name'] ?? ''),
        'company_email' => sanitize($_POST['company_email'] ?? ''),
        'company_phone' => sanitize($_POST['company_phone'] ?? ''),
        'company_address' => sanitize($_POST['company_address'] ?? ''),
        'company_website' => sanitize($_POST['company_website'] ?? ''),
        'pf_percentage' => sanitize($_POST['pf_percentage'] ?? '12'),
        'esi_percentage' => sanitize($_POST['esi_percentage'] ?? '0.75')
    ];
    
    try {
        foreach ($settings as $key => $value) {
            $stmt = $pdo->prepare('INSERT INTO company_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?');
            $stmt->execute([$key, $value, $value]);
        }
        $success = 'Settings saved successfully!';
    } catch (Exception $e) {
        $error = 'Error saving settings: ' . $e->getMessage();
    }
}

// Load current settings
$settings = [];
$stmt = $pdo->query('SELECT * FROM company_settings');
while ($row = $stmt->fetch()) {
    $settings[$row['setting_key']] = $row['setting_value'];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Settings - OviTech Salary Portal</title>
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
            max-width: 800px;
            margin: 30px auto;
            padding: 0 20px;
        }
        
        .card {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
        
        .form-group input,
        .form-group textarea {
            padding: 10px 12px;
            border: 2px solid #e0e0e0;
            border-radius: 4px;
            font-size: 14px;
            font-family: inherit;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: <?php echo PRIMARY_COLOR; ?>;
        }
        
        .btn {
            padding: 12px 30px;
            background: <?php echo PRIMARY_COLOR; ?>;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            margin-top: 20px;
        }
        
        .btn:hover {
            background: #5a3f8a;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-section">
            <img src="assets/ovitech-logo.png" alt="OviTech Logo">
            <h1>Settings</h1>
        </div>
        <div>
            <a href="dashboard.php">Dashboard</a>
            <a href="logout.php">Logout</a>
        </div>
    </div>
    
    <div class="container">
        <div class="card">
            <h2>Company Settings</h2>
            
            <?php if ($error): ?>
                <div class="alert alert-error"><?php echo $error; ?></div>
            <?php endif; ?>
            
            <?php if ($success): ?>
                <div class="alert alert-success"><?php echo $success; ?></div>
            <?php endif; ?>
            
            <form method="POST">
                <div class="form-row">
                    <div class="form-group">
                        <label for="company_name">Company Name</label>
                        <input type="text" id="company_name" name="company_name" value="<?php echo sanitize($settings['company_name'] ?? 'OviTech Global Pvt Ltd'); ?>">
                    </div>
                    <div class="form-group">
                        <label for="company_email">Company Email</label>
                        <input type="email" id="company_email" name="company_email" value="<?php echo sanitize($settings['company_email'] ?? ''); ?>">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="company_phone">Company Phone</label>
                        <input type="tel" id="company_phone" name="company_phone" value="<?php echo sanitize($settings['company_phone'] ?? ''); ?>">
                    </div>
                    <div class="form-group">
                        <label for="company_website">Company Website</label>
                        <input type="url" id="company_website" name="company_website" value="<?php echo sanitize($settings['company_website'] ?? ''); ?>">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="company_address">Company Address</label>
                        <textarea id="company_address" name="company_address" rows="3"><?php echo sanitize($settings['company_address'] ?? ''); ?></textarea>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="pf_percentage">PF Percentage (%)</label>
                        <input type="number" id="pf_percentage" name="pf_percentage" step="0.01" value="<?php echo sanitize($settings['pf_percentage'] ?? '12'); ?>">
                    </div>
                    <div class="form-group">
                        <label for="esi_percentage">ESI Percentage (%)</label>
                        <input type="number" id="esi_percentage" name="esi_percentage" step="0.01" value="<?php echo sanitize($settings['esi_percentage'] ?? '0.75'); ?>">
                    </div>
                </div>
                
                <button type="submit" class="btn">Save Settings</button>
            </form>
        </div>
    </div>
</body>
</html>
