# OviTech Salary Portal - Installation & Deployment Guide

## System Requirements
- PHP 7.4 or higher
- MySQL 5.7 or higher
- Web server (Apache/Nginx)
- cPanel access with file manager

## Step-by-Step Installation for cPanel Hosting

### STEP 1: Create Database in phpMyAdmin

1. **Login to cPanel**
   - Go to your cPanel dashboard
   - Find "phpMyAdmin" under "Databases"
   - Click to open phpMyAdmin

2. **Create New Database**
   - Click "New" in left sidebar
   - Database name: `ovitech_salary`
   - Collation: `utf8mb4_unicode_ci`
   - Click "Create"

3. **Import SQL Schema**
   - Select the newly created `ovitech_salary` database
   - Click "Import" tab at top
   - Click "Choose File" and select `database/ovitech_salary.sql`
   - Click "Import"
   - Wait for success message

4. **Create Database User (Important for security)**
   - Go back to cPanel
   - Find "MySQL Database Wizard"
   - Click "Create a New User"
   - Username: `ovitech_user` (cPanel will add prefix)
   - Generate strong password and save it
   - Click "Create User"
   - Add user to database with ALL PRIVILEGES

### STEP 2: Upload Files to cPanel

1. **Connect via cPanel File Manager**
   - Go to cPanel > File Manager
   - Navigate to public_html folder
   - Click "Upload" button
   - Upload the entire application folder

2. **Or via FTP**
   - Use FTP credentials from cPanel (Setup FTP Account)
   - Download free FTP client (FileZilla)
   - Connect to: `ftp://your-domain.com`
   - Upload all files to public_html folder

### STEP 3: Configure Database Connection

1. **Edit config/database.php**
   - Open File Manager > config/database.php
   - Update with your database credentials:

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'ovitech_user');  // Your created database user
define('DB_PASS', 'your_password_here');  // Your strong password
define('DB_NAME', 'ovitech_salary');
```

2. **Add Company Logo**
   - Create folder: `assets` in root directory
   - Upload your `ovitech-logo.png` to `assets/` folder
   - Ensure filename matches: `ovitech-logo.png`

### STEP 4: Set File Permissions

1. **Via cPanel File Manager**
   - Right-click each folder/file
   - Select "Change Permissions"
   - Set folders to: 755
   - Set files to: 644

2. **Via FTP Client**
   - Select folder > Right-click > Properties
   - Set CHMOD: 755 for folders, 644 for files

### STEP 5: Access Your Application

1. **Open in Browser**
   ```
   https://your-domain.com/
   ```

2. **Login Credentials (Default - CHANGE THESE)**
   - Email: `admin@ovitech.co`
   - Password: `admin123`

### STEP 6: First Time Setup

1. **Change Admin Password**
   - Login to dashboard
   - Go to Settings
   - Change default admin password

2. **Update Company Information**
   - Go to Settings
   - Update company details
   - Set PF and ESI percentages

3. **Upload Company Logo**
   - Place logo in: `assets/ovitech-logo.png`
   - Recommended size: 200x200 pixels
   - Format: PNG with transparent background

## Troubleshooting Common Issues

### Issue: "Database Connection Error"
- **Solution**: 
  - Check `config/database.php` credentials match phpMyAdmin
  - Verify database user has permissions
  - Ensure MySQL is running in cPanel

### Issue: "Blank Page or 500 Error"
- **Solution**:
  - Check error logs in cPanel (Errors section)
  - Ensure PHP version is 7.4+
  - Check file permissions (755 for folders)

### Issue: "Logo not showing"
- **Solution**:
  - Verify logo file in `assets/ovitech-logo.png`
  - File should be PNG format
  - Check file name case sensitivity

### Issue: "Cannot upload/download files"
- **Solution**:
  - Check folder permissions (755)
  - Ensure tmp folder has write permissions
  - Check PHP upload limits in cPanel

## Features Available After Installation

✓ Admin Dashboard with employee statistics
✓ Add/Edit/Delete employees
✓ Generate salary slips with automatic calculations
✓ Download salary slips as PDF
✓ Download salary slips as Word (.docx)
✓ Print salary slips
✓ Bulk salary processing
✓ Company settings management
✓ Secure login system

## Database Backup

1. **Automatic backup**
   - cPanel > Backup Wizard
   - Create automated backups

2. **Manual backup via phpMyAdmin**
   - Select `ovitech_salary` database
   - Export > Custom options
   - Click "Go" to download SQL file

## Security Best Practices

1. **Change default credentials immediately**
2. **Use strong passwords (12+ characters)**
3. **Enable SSL/HTTPS** (free via cPanel)
4. **Regular database backups**
5. **Keep cPanel and PHP updated**
6. **Restrict file permissions (755/644)**

## Support & Updates

For issues or updates, contact:
- Email: support@ovitech.co
- Website: https://ovitech.co

---
**Created for OviTech Global Pvt Ltd**
