<?php
/**
 * OviTech Salary Portal - Setup Verification Script
 * Check if your hosting meets all requirements before installation
 */

$checks = [
    'PHP Version' => [
        'required' => '7.4.0',
        'current' => PHP_VERSION,
        'pass' => version_compare(PHP_VERSION, '7.4.0', '>=')
    ],
    'PHP PDO Extension' => [
        'required' => 'Enabled',
        'current' => extension_loaded('pdo') ? 'Enabled' : 'Disabled',
        'pass' => extension_loaded('pdo')
    ],
    'PHP PDO MySQL' => [
        'required' => 'Enabled',
        'current' => extension_loaded('pdo_mysql') ? 'Enabled' : 'Disabled',
        'pass' => extension_loaded('pdo_mysql')
    ],
    'PHP GD Extension' => [
        'required' => 'Enabled',
        'current' => extension_loaded('gd') ? 'Enabled' : 'Disabled',
        'pass' => extension_loaded('gd')
    ],
    'File Uploads' => [
        'required' => 'Enabled',
        'current' => ini_get('file_uploads') ? 'Enabled' : 'Disabled',
        'pass' => ini_get('file_uploads')
    ],
    'Upload Max Size' => [
        'required' => '10MB',
        'current' => ini_get('upload_max_filesize'),
        'pass' => intval(ini_get('upload_max_filesize')) >= 10
    ],
    'POST Max Size' => [
        'required' => '10MB',
        'current' => ini_get('post_max_size'),
        'pass' => intval(ini_get('post_max_size')) >= 10
    ],
    'Memory Limit' => [
        'required' => '128MB',
        'current' => ini_get('memory_limit'),
        'pass' => intval(ini_get('memory_limit')) >= 128
    ]
];

$all_pass = true;
foreach ($checks as $check) {
    if (!$check['pass']) $all_pass = false;
}
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OviTech Setup Check</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #67499E; margin-bottom: 10px; }
        .intro { color: #666; margin-bottom: 30px; }
        .check-item { display: flex; align-items: center; padding: 12px; margin: 10px 0; background: #f9f9f9; border-left: 4px solid #ccc; border-radius: 4px; }
        .check-item.pass { background: #f0fff0; border-left-color: #4CAF50; }
        .check-item.fail { background: #fff0f0; border-left-color: #f44336; }
        .check-label { flex: 1; font-weight: 600; }
        .check-value { color: #666; margin: 0 20px; }
        .check-icon { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; margin-right: 15px; }
        .pass .check-icon { background: #4CAF50; }
        .fail .check-icon { background: #f44336; }
        .summary { margin-top: 30px; padding: 20px; border-radius: 4px; text-align: center; font-size: 18px; font-weight: bold; }
        .summary.ready { background: #f0fff0; color: #2e7d32; border: 2px solid #4CAF50; }
        .summary.not-ready { background: #fff0f0; color: #c62828; border: 2px solid #f44336; }
        .next-steps { margin-top: 20px; padding: 15px; background: #e8f4f8; border-radius: 4px; }
        .next-steps h3 { color: #01579b; margin-bottom: 10px; }
        .next-steps ol { margin-left: 20px; }
        .next-steps li { margin: 8px 0; color: #333; }
    </style>
</head>
<body>
    <div class="container">
        <h1>OviTech Salary Portal - System Requirements Check</h1>
        <p class="intro">This script verifies that your hosting meets all requirements for the salary portal application.</p>
        
        <div style="margin-bottom: 30px;">
            <?php foreach ($checks as $name => $check): ?>
            <div class="check-item <?php echo $check['pass'] ? 'pass' : 'fail'; ?>">
                <div class="check-icon"><?php echo $check['pass'] ? '✓' : '✗'; ?></div>
                <div class="check-label"><?php echo $name; ?></div>
                <div class="check-value">Required: <?php echo $check['required']; ?></div>
                <div class="check-value">Current: <?php echo $check['current']; ?></div>
            </div>
            <?php endforeach; ?>
        </div>
        
        <div class="summary <?php echo $all_pass ? 'ready' : 'not-ready'; ?>">
            <?php if ($all_pass): ?>
                ✓ Your hosting meets all requirements! You're ready to install.
            <?php else: ?>
                ✗ Your hosting doesn't meet all requirements. Please contact your hosting provider.
            <?php endif; ?>
        </div>
        
        <?php if ($all_pass): ?>
        <div class="next-steps">
            <h3>Next Steps:</h3>
            <ol>
                <li>Delete this setup-check.php file</li>
                <li>Edit config/database.php with your database credentials</li>
                <li>Create database in phpMyAdmin and import SQL</li>
                <li>Visit your domain to access the application</li>
                <li>Login with: admin@ovitech.co / admin123</li>
                <li>Change admin password immediately</li>
            </ol>
        </div>
        <?php else: ?>
        <div class="next-steps">
            <h3>What to do:</h3>
            <ol>
                <li>Contact your hosting provider's support</li>
                <li>Request they enable missing extensions/settings</li>
                <li>Verify your PHP version is up to date</li>
                <li>Re-run this check after changes</li>
            </ol>
        </div>
        <?php endif; ?>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px;">
            For questions, see INSTALLATION_GUIDE.md or contact support@ovitech.co
        </p>
    </div>
</body>
</html>
